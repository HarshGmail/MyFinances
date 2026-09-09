# Vault Architecture

The Vault is an optional, PIN-locked store for the credentials that surround a person's finances —
bank accounts, credit cards, insurance policies, logins. It is the only part of the app the server
cannot read.

Everything else in MyFinances is encrypted *by* the server (PAN, Gmail refresh tokens) using
`ENCRYPTION_KEY`, which means the server can also decrypt it. That is fine for a PAN used to open a
CDSL PDF. It is not fine for a CVV. The Vault therefore uses a different model.

---

## 1. Threat model

**What the Vault protects against**

| Scenario | Outcome |
|---|---|
| Database dump leaks | Useless. Every entry is wrapped in server-side AES-256-GCM under `ENCRYPTION_KEY`, which is not in the database. |
| Database dump **and** `ENCRYPTION_KEY` leak | The attacker now holds the browser-side ciphertext and must brute-force the PIN offline. |
| A curious or compromised server operator reading Mongo | Cannot read vault contents. The PIN and the derived key never reach the server. |
| Someone with your logged-in session but not your PIN | Cannot read the vault. They can request the verifier blob, but online attempts are rate-limited and locked out. |

**What it does not protect against**

- **A short PIN under offline attack.** Six digits is 10⁶ candidates. PBKDF2-SHA256 at 310,000
  iterations is ~3.1×10¹¹ hash operations to exhaust — roughly a day on a single modern GPU, less on
  rented hardware. Raising iterations buys linear attacker time and costs the user the same factor on
  every unlock. **The real boundary is the second server-side layer**, which means an attacker needs
  the Mongo dump *and* `ENCRYPTION_KEY` before the PIN even becomes the obstacle. Do not describe the
  Vault as "zero-knowledge, therefore unbreakable" — it is zero-knowledge with respect to the server
  operator's passive view, which is a genuine and worthwhile property, and a different claim.
- **A compromised frontend.** Injected page code runs with the unlocked key in scope. `extractable:
  false` on the derived key blocks `exportKey`, removing the cheapest exfiltration path, but code in
  the page can still call `encrypt`/`decrypt` with the handle.
- **A forgotten PIN.** There is no reset, no recovery email, no admin override. The only remedy is
  Destroy Vault.

---

## 2. Cryptography

All of it lives in `frontend/src/utils/vaultCrypto.ts`. Nothing crypto-related runs on the server.

```
PIN ──PBKDF2-SHA256(salt, 310_000)──▶ AES-256-GCM key (extractable: false)
                                          │
item JSON ──JSON.stringify──▶ UTF-8 ──encrypt(iv: 12B random)──▶ envelope
                                          │
                                          ▼  HTTPS
server: encrypt(envelope, ENCRYPTION_KEY) ──▶ Mongo
```

**Envelope format** — a flat dotted string, not an object:

```
v1.<base64(iv, 12 bytes)>.<base64(ciphertext || gcmTag)>
```

Flat because the server stores it as a single string and hands it to `encrypt()` verbatim — no JSON
re-serialisation, no key-order drift, no nested zod schema on both sides. The `v1` prefix is
parseable without JSON, so a future v2 (Argon2id, or a long passphrase) can live alongside it.

**base64, not hex.** The blob is wrapped twice. base64 is ×1.37 and the server's `encrypt()` then
hex-encodes the result at ×2, so total expansion is ≈ ×2.75. Hex at the inner layer would make it ×4.

**Iteration count is stored per-vault** in `kdf.iterations` and read from the server at unlock. It is
never hardcoded at the unlock path — if it were, bumping `VAULT_KDF_ITERATIONS` later would silently
make every existing vault unopenable with no diagnosable error. The constant is used only when
*creating* a vault.

### Wrong PIN vs corrupt data

AES-GCM yields exactly one failure signal — a bare `OperationError` — and it is cryptographically
impossible to tell a wrong key from a flipped bit. The distinction is therefore structural, not
cryptographic:

1. The **verifier blob is the single oracle for PIN correctness.** It is `encryptItem(key, { magic:
   VAULT_VERIFIER_MAGIC, createdAt })`, written once at setup and rewritten only on PIN change, using
   the *same* key and salt as the items. On unlock the client derives the key and calls `verifyPin`.
   - `false` → `VaultWrongPinError`. Stay locked, show "Incorrect PIN".
   - `true` → the key is proven correct.
2. **After** the verifier passes, any item that fails to decrypt is by definition not a PIN problem.
   It is collected into `damagedIds` and rendered as an undecryptable entry. The vault does not
   re-lock and never claims a wrong PIN.

The magic-string check after decryption is belt-and-braces — GCM already guarantees authenticity, so
it can only fire on a version mismatch or hand-edited data. It turns a confusing "unlocks but
everything is broken" into one clear error.

### Secure context

`crypto.subtle`, `crypto.randomUUID` and `navigator.clipboard` are all undefined on insecure origins.
`https://` and `http://localhost` / `127.0.0.1` qualify; **`http://192.168.x.x:3000` does not.**
`isVaultCryptoAvailable()` gates the page and renders `VaultUnsupported.tsx` instead of throwing.

The practical bite: testing the mobile layout by opening the dev server from a phone on the LAN gives
a dead vault page. Use `next dev --experimental-https` or a tunnel (`cloudflared tunnel --url
http://localhost:3000`).

---

## 3. Data model

**One `vaults` document per user, with an `items: []` array.**

Rejected alternatives: a single blob per user (every field edit re-uploads the whole vault, two tabs
clobber each other, one decrypt failure loses everything) and one document per item (better at
thousands of entries, but needs a second collection or a discriminated union that breaks the unique
index, and makes destroy non-atomic). The chosen shape keeps per-item writes possible via
`arrayFilters`, gets the whole vault in one read, and keeps rekey and destroy atomic.

```jsonc
{
  _id, userId,                      // unique index on userId
  salt: "base64, 16 bytes",         // PLAINTEXT by design
  verifier: "<server encrypt() of 'v1.<iv>.<ct>'>",
  kdf: { algo: "PBKDF2-SHA256", iterations: 310000 },
  keyEpoch: 0,                      // increments on every PIN change
  items: [
    { id, category, ciphertext: "<server encrypt() of envelope>", createdAt, updatedAt }
  ],
  failedAttempts: 0,
  lockedUntil: null,
  createdAt, updatedAt
}
```

The **salt is stored in plaintext deliberately.** Its job is to defeat precomputed rainbow tables, not
to hide anything; encrypting it would add nothing and would cost a decrypt on every page load.

The server's second layer wraps `verifier` and every `items[].ciphertext`. Not the salt, not `kdf`,
not timestamps.

**Bounds matter.** `express.json({ limit: '20mb' })` is generous enough that an unbounded ciphertext
would let an authenticated user push their own document past the 16 MB BSON cap, after which even
reads fail and only Destroy Vault recovers it. Enforced in two places: `.max(200_000)` per ciphertext
in zod, and an atomic `{ 'items.500': { $exists: false } }` filter on the insert path.

---

## 4. Backend

`backend/src/controllers/vaultController.ts`, mounted at `/api/vault`.

| Method | Path | Notes |
|---|---|---|
| GET | `/meta` | Projection excludes `items` **and `verifier`**. Returns `{ exists: false }` when there is no vault. |
| POST | `/init` | 409 if a vault already exists — never silently overwrite. |
| POST | `/unlock` | The throttled verifier dispenser. See below. |
| POST | `/unlock/confirm` | Zeroes `failedAttempts`, clears `lockedUntil`. |
| GET | `/items` | Per-item `decrypt` in its own try/catch; emits `ciphertext: null` on failure so a rotated `ENCRYPTION_KEY` degrades one entry instead of 500-ing the vault. |
| PUT | `/items/:itemId` | `arrayFilters` update, then `$push` fallback. |
| DELETE | `/items/:itemId` | `$pull`. |
| POST | `/rekey` | One atomic `$set` of salt + verifier + all items + `keyEpoch + 1`. |
| DELETE | `/` | Idempotent. |

### Rate limiting

**The server cannot validate the PIN.** It never sees the PIN and cannot decrypt the verifier's inner
layer, so there is no "wrong password" event for it to count. Its only lever is that *the verifier
blob is the brute-force oracle* — so it controls who gets it and how often.

That is why `GET /meta` deliberately omits the verifier and `POST /unlock` is a separate, counted
call:

- `/unlock` **pessimistically increments** `failedAttempts` before handing out the verifier, and sets
  `lockedUntil` once the count crosses the threshold.
- The client calls `/unlock/confirm` only after `verifyPin` returns true, which resets the counter.
- A client that never confirms stays throttled — it **fails closed**. A tampered client can only make
  itself more throttled, never less.

Backoff ladder in `backend/src/utils/vaultLockout.ts`: `≤4 → none, 5 → 30s, 6 → 60s, 7 → 5m,
8 → 15m, 9 → 1h, ≥10 → 24h`.

The check lives inside `unlockVault`, not in a middleware — the controller already holds the document,
and a middleware would cost a second `findOne` on every call. Per-IP limiting was considered and
skipped: it would be per-process and evaporate on cold start, while the persisted per-user counter
actually holds. **This throttle defends the online path only.** An attacker who has already pulled the
verifier attacks it offline at GPU speed, where no server counter applies.

### Two Mongo behaviours worth knowing

- `arrayFilters` with no matching element returns `matchedCount: 1, modifiedCount: 0` — the *document*
  matched, the *element* did not. The `$push` fallback therefore branches on `modifiedCount`. Getting
  this backwards silently no-ops every create.
- **Rekey must be a single `updateOne`.** A loop of per-item writes that fails midway leaves items
  encrypted under two different keys with only one verifier — permanently unrecoverable. The client
  also derives and verifies the new key before any write, and swaps the in-memory session key only
  after the 200.

### Demo guard

`blockDemoMutations` blocks all POST/PUT/DELETE/PATCH for the demo account. `/api/vault/unlock` is
added to `DEMO_ALLOWED_PATHS` because it and `/unlock/confirm` are semantically reads (`startsWith`
covers both). Everything else stays blocked, so the demo account sees the setup screen and cannot
create a vault — which is the desired behaviour. Making unlock a `GET` to dodge the allowlist was
rejected: it mutates the attempt counter, and browsers or proxies may cache a `GET`.

---

## 5. Frontend

```
frontend/src/app/vault/
├── page.tsx              Orchestrator — routes to Unsupported / Setup / Locked / Unlocked
├── useVaultSession.ts    Owns the CryptoKey, decrypted items, idle timer, all mutations
├── vaultTypes.ts         Category → field-descriptor table; masking and copy-text builders
├── PinInput.tsx          6-box segmented numeric input
├── VaultSetup.tsx        First run: choose PIN + unrecoverability acknowledgement
├── VaultLocked.tsx       PIN entry, wrong-PIN state, lockout countdown
├── VaultShell.tsx        Unlocked frame: header, rail, list, dialogs
├── CategoryRail.tsx      Left rail on md+, scrollable pills on mobile
├── VaultItemCard.tsx     Masked values, per-field reveal, click-to-copy, copy-all
├── VaultItemDialog.tsx   Add/edit form with useFieldArray custom fields
├── ChangePinDialog.tsx   Re-encrypts every item client-side, then one atomic rekey
├── DestroyVaultDialog.tsx
└── VaultUnsupported.tsx  Insecure-context explainer
```

`vaultTypes.ts` is the single source of truth for what each category contains. Forms, cards, masking
and copy output are all generated from it, so adding a field is a one-line change in one table.

**Every field descriptor `name` must be a plain identifier.** react-hook-form treats `.` as a path
separator, so a field named `nominee.name` would register as a nested object and break the flat
`Record<string, string>` shape.

### Key lifetime

The derived `CryptoKey` lives in React state and nowhere else — never localStorage, never
sessionStorage, never zustand. It is cleared by:

- the idle timer (5 minutes without a pointer, key or focus event),
- the "Lock now" button,
- navigating away from `/vault` (the hook unmounts with the page),
- closing the tab.

Unlocking in one tab does not unlock another. That is deliberate: cross-tab sync would mean putting
key material somewhere shared, which is exactly what this design forbids.

In development, the key does not survive Fast Refresh — editing `useVaultSession.ts` throws you back
to the lock screen. Expected, not a bug. React 19 StrictMode double-invokes effects, so the idle timer
clears its previous interval in cleanup or it would run at double speed.

### Plaintext never enters the query cache

`frontend/src/lib/queryPersister.ts` persists TanStack Query state to IndexedDB, gated by an opt-in
`PERSISTENT_QUERY_KEYS` whitelist in `providers.tsx`. Vault keys are not on it.

The durable protection is structural rather than that whitelist: **decrypted content never goes
through the query layer at all.** Items are fetched imperatively by `useVaultSession` and decrypted
into component state. Even if `'vault-items'` were added to `PERSISTENT_QUERY_KEYS` a year from now,
it would persist ciphertext. `vault-meta` also carries `gcTime: 0`.

**Rule for future contributors: no vault query key may ever be added to `PERSISTENT_QUERY_KEYS`.**

### Clipboard and the user-gesture rule

Safari (desktop and iOS) permits `navigator.clipboard.writeText` only within the task that handled the
user gesture. Any `await` before the write — **including `await decryptItem(...)`** — breaks the
gesture chain and the write silently fails on iOS.

This is why items are decrypted eagerly into state on unlock and `buildItemCopyText` is
**synchronous**. Never `await` a decrypt inside a copy handler.

---

## 6. Operational notes

- `ENCRYPTION_KEY` must be 64 hex characters (32 bytes). `startServer()` logs a fatal error at boot if
  it is missing or malformed, because `encrypt()` otherwise throws lazily at first call and surfaces
  as an opaque 500 on a vault write.
- **Rotating `ENCRYPTION_KEY` breaks every existing vault**, along with stored PANs and Gmail refresh
  tokens. There is no re-wrap migration today. If it ever needs rotating, write one first.
- The `vaults` collection needs its unique index on `userId`; it is created in `startServer()`.

## 7. Verification

```bash
cd backend  && npm run typecheck && npm run lint && npm run prettier:check
cd frontend && npm run lint && npm run prettier:fix
```

Manual, with both dev servers up and `ENCRYPTION_KEY` set:

1. Profile → Open Vault → set a PIN → the unrecoverability warning must require acknowledgement.
2. Add one entry per category including custom fields. Reload, unlock, confirm they decrypt.
3. Wrong PIN five times → lockout countdown appears. A correct PIN afterwards resets the counter.
4. Tap a field value → clipboard. Copy-all → the formatted block.
5. Idle five minutes → auto-lock. Navigate away and back → locked.
6. Change PIN → reload → every entry still decrypts under the new PIN.
7. **Storage audit.** With the vault unlocked, DevTools → Application: no plaintext in localStorage,
   sessionStorage, or the `myfinances-cache-<userId>` IndexedDB store. Then the Network tab: no
   request or response body should contain a readable field value.
