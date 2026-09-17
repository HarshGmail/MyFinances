# Vault Architecture

The Vault is an optional, PIN-locked store for the credentials that surround a person's finances —
bank accounts, credit cards, insurance policies, logins. It is the only part of the app the server
cannot read.

Everything else in MyFinances is encrypted _by_ the server (PAN, Gmail refresh tokens) using
`ENCRYPTION_KEY`, which means the server can also decrypt it. That is fine for a PAN used to open a
CDSL PDF. It is not fine for a CVV. The Vault therefore uses a different model.

---

## 1. Threat model

**What the Vault protects against**

| Scenario                                               | Outcome                                                                                                          |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Database dump leaks                                    | Useless. Every entry is wrapped in server-side AES-256-GCM under `ENCRYPTION_KEY`, which is not in the database. |
| Database dump **and** `ENCRYPTION_KEY` leak            | The attacker now holds the browser-side ciphertext and must brute-force the PIN offline.                         |
| A curious or compromised server operator reading Mongo | Cannot read vault contents. The PIN and the derived key never reach the server.                                  |
| Someone with your logged-in session but not your PIN   | Cannot read the vault. They can request the verifier blob, but online attempts are rate-limited and locked out.  |

**What it does not protect against**

- **A short PIN under offline attack.** Six digits is 10⁶ candidates. PBKDF2-SHA256 at 310,000
  iterations is ~3.1×10¹¹ hash operations to exhaust — roughly a day on a single modern GPU, less on
  rented hardware. Raising iterations buys linear attacker time and costs the user the same factor on
  every unlock. **The real boundary is the second server-side layer**, which means an attacker needs
  the Mongo dump _and_ `ENCRYPTION_KEY` before the PIN even becomes the obstacle. Do not describe the
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
_creating_ a vault.

### Wrong PIN vs corrupt data

AES-GCM yields exactly one failure signal — a bare `OperationError` — and it is cryptographically
impossible to tell a wrong key from a flipped bit. The distinction is therefore structural, not
cryptographic:

1. The **verifier blob is the single oracle for PIN correctness.** It is `encryptItem(key, { magic:
VAULT_VERIFIER_MAGIC, createdAt })`, written once at setup and rewritten only on PIN change, using
   the _same_ key and salt as the items. On unlock the client derives the key and calls `verifyPin`.
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

| Method | Path              | Notes                                                                                                                                                       |
| ------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/meta`           | Projection excludes `items` **and `verifier`**. Returns `{ exists: false }` when there is no vault.                                                         |
| POST   | `/init`           | 409 if a vault already exists — never silently overwrite.                                                                                                   |
| POST   | `/unlock`         | The throttled verifier dispenser. See below.                                                                                                                |
| POST   | `/unlock/confirm` | Zeroes `failedAttempts`, clears `lockedUntil`.                                                                                                              |
| GET    | `/items`          | Per-item `decrypt` in its own try/catch; emits `ciphertext: null` on failure so a rotated `ENCRYPTION_KEY` degrades one entry instead of 500-ing the vault. |
| PUT    | `/items/:itemId`  | `arrayFilters` update, then `$push` fallback.                                                                                                               |
| DELETE | `/items/:itemId`  | `$pull`.                                                                                                                                                    |
| POST   | `/rekey`          | One atomic `$set` of salt + verifier + all items + `keyEpoch + 1`.                                                                                          |
| DELETE | `/`               | Idempotent.                                                                                                                                                 |

### Rate limiting

**The server cannot validate the PIN.** It never sees the PIN and cannot decrypt the verifier's inner
layer, so there is no "wrong password" event for it to count. Its only lever is that _the verifier
blob is the brute-force oracle_ — so it controls who gets it and how often.

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

- `arrayFilters` with no matching element returns `matchedCount: 1, modifiedCount: 0` — the _document_
  matched, the _element_ did not. The `$push` fallback therefore branches on `modifiedCount`. Getting
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

### Face ID unlock (WebAuthn PRF)

Optional, device-local, and deliberately **not** a change to the server-side threat model. The PIN
remains the only root secret; Face ID is a second way to retrieve it on one device.

```
passkey (iCloud Keychain) ──prf.eval(salt)──▶ 32 bytes ──HKDF-SHA256──▶ AES-256-GCM wrapping key
                                                                              │
PIN ──encryptItem(wrappingKey, pin)──▶ envelope ──▶ IndexedDB on this device only
```

`frontend/src/utils/vaultBiometrics.ts` owns it. On unlock, `prf.eval` reproduces the wrapping key,
the PIN is decrypted, and it feeds the existing `deriveKey()` path unchanged — the verifier, items,
wallet keys and `ensureSharingKeys` are all untouched.

What this does and does not change:

- **The blob never leaves the device.** No new backend field, no new endpoint, nothing for the
  server to read. A Mongo dump is exactly as (un)useful as before.
- **The device's biometric set becomes an unlock path.** Anyone enrolled in Face ID/Touch ID on that
  device can open the vault. That is the trade the user opts into, and the setup dialog says so.
- **PRF support is uneven** — Safari has it from iOS 18 via iCloud Keychain, but not with external
  security keys. It is feature-detected and the toggle is hidden when unavailable. **The PIN must
  always remain a working unlock path; never make biometrics the sole factor.**

**Changing the PIN or destroying the vault must clear the stored blob** — `changePin` and `destroy`
both call `clearBiometricUnlock()`. Forgetting that leaves Face ID unlocking with a stale PIN, which
then fails the verifier with no obvious cause.

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

---

# Part 2 — Shared wallets

A **wallet** is a named set of entries shared with other users of the app. Members contribute their
own entries, so a friend group can pool cards and see which one earns a discount where. Wallets are a
fifth tab on the vault's own category rail: unlock once, and Bank / Cards / Insurance / Others /
Wallets are all available, because the key is already in memory.

The zero-knowledge property is preserved. The server never sees a wallet key, a wallet name, or any
entry — only double-wrapped ciphertext, exactly as with the personal vault.

## 8. Why every user needs a keypair

The requirement that forces this: **removing a member rotates the wallet key**, so the owner must
re-wrap the new key _for every remaining member_. Under zero-knowledge the owner cannot reach anyone
else's PIN-derived key, so there has to be a public key to wrap to.

Each user therefore gets an **ECDH P-256 keypair** (P-256 rather than X25519 — WebCrypto support for
X25519 is still patchy):

- Generated at vault setup. The **public key is stored in plaintext** on the vault document and served
  to other users by `GET /api/vault/public-key/:userId`. The **private key** is exported as a JWK and
  stored as `wrappedPrivateKey`, encrypted under the vault key — so unlocking the vault yields it, and
  nothing else does.
- Vaults created before Part 2 are backfilled lazily: `ensureSharingKeys` in `useVaultSession` notices
  a missing keypair on unlock, generates one, and `POST /api/vault/keypair` stores it. That endpoint
  matches on `publicKey: null`, so it can never overwrite an existing keypair.
- Changing the vault PIN re-wraps the private key under the new vault key in the same atomic rekey as
  the items. Forgetting this would orphan every wallet the user belongs to.

**Wrapping uses ECDH-ES.** To wrap wallet key WK for member M: generate an ephemeral keypair E, do
`ECDH(E.priv, M.pub)` → HKDF-SHA256 (info `myfinances-wallet-key-wrap-v1`) → an AES-GCM key-encryption
key, and store `{ epk: E.pubJwk, wrapped }`. M unwraps with `ECDH(M.priv, epk)`. The owner wraps to
their own public key by the same path, so there is exactly one code path in both directions.

## 9. Collections

```jsonc
// wallets
{ _id, ownerId, encryptedName, keyEpoch,
  items: [{ id, addedBy, category, ciphertext, sourceItemId, createdAt, updatedAt }],
  createdAt, updatedAt }

// walletMembers   — unique index on { walletId, userId }
{ _id, walletId, userId, role: 'owner'|'member', status: 'pending'|'active',
  wrappedWalletKey: { epk, wrapped }, keyEpoch, requestedAt, approvedAt }

// walletInvites   — unique index on token
{ _id, walletId, token, createdBy, expiresAt, maxUses, useCount, revoked, createdAt }
```

The **wallet name is encrypted under WK** as well, so the server holds nothing meaningful about a
wallet. As with the vault, the server adds its own `encrypt()` layer over `encryptedName`, every
`items[].ciphertext`, and every `wrappedWalletKey.wrapped`.

## 10. The share flow

Two carriers, same payload — an **invite code** and a **link**:

```
MFW1.<inviteToken>.<base64url(WK)>                     invite code (preferred)
https://…/vault/join/<inviteToken>#k=<base64url(WK)>   link
```

**The code is the default offer**, because the link has two failure modes on phones:

- **Chat apps eat the fragment.** WhatsApp builds a preview from the URL and has been observed
  dropping everything after `#`, leaving a link that cannot decrypt anything. The code has no `#`
  and no URL shape, so there is nothing for a previewer to rewrite.
- **A tapped link opens the browser, not the installed app.** On iOS a Home Screen web app has its
  own storage container — separate cookies and a separate vault session — and iOS does not let a PWA
  capture links at all. So the recipient signs in again and re-enters their PIN in Safari. This is an
  Apple platform limit with no workaround. Android installed via WebAPK does capture in-scope links.

`parseWalletInvite` in `frontend/src/app/vault/wallets/inviteCode.ts` accepts either carrier, and
extracts one from surrounding chat text. A link whose `#k=` was stripped raises
`InviteKeyMissingError` so the UI can say what actually went wrong rather than "invalid invite".

Joining by code happens inside the already-open app (Vault → Wallets → Join), so the session and the
unlocked vault are reused — no second sign-in, no second PIN. `/vault/join/[token]` still works for a
tapped link, and when it detects a browser tab it offers a "Copy invite code for the app" button so
the recipient can finish in the installed app instead.

**The fragment is never sent in an HTTP request.** It stays out of server logs, `Referer` headers and
proxies, so the wallet key reaches the recipient's browser without ever touching our infrastructure.
`inviteToken` is an opaque random id that identifies the wallet and nothing else.

1. Owner creates a wallet — the client generates WK, encrypts the name, wraps WK to the owner's own
   public key, and POSTs.
2. Owner generates an invite — the server returns a token; the client appends `#k=…` locally.
3. The recipient opens the link while logged in. The page reads `window.location.hash` **in its first
   effect, before any router call** — `useUrlState` uses `router.replace`, which would drop it. If
   they have no vault they are routed through setup first.
4. Their client wraps WK **to their own public key** and POSTs it — a `walletMembers` row is created
   with `status: 'pending'`.
5. The owner sees the request (name and email joined from `users` server-side) and approves; the
   server flips the status to `active`.

Approval requires no key material from the owner, because the requester self-wraps.

**What approval does and does not do.** The requester holds WK from the moment they open the link, so
approval gates _server-side access to the ciphertext_, not possession of the key. Without the
ciphertext the key is inert, which makes it a real control — but it is not a retraction. This is why
the share dialog tells the user to treat the link itself as a key.

## 11. Per-field sharing

Sharing entry X into wallet W builds a **projection** — only the ticked fields — and encrypts that
projection under WK as a new wallet entry. Fields left unticked are never encrypted into it and
therefore never leave the owner's vault in any form.

`VaultFieldDef.shareByDefault` drives the initial ticks: identifying and useful fields (issuer,
network, card type, name on card, expiry, last four, offer notes) start ticked; `cardNumber`,
`cvv`, `atmPin`,
account numbers and passwords start unticked and carry a warning marker. Custom fields default to
ticked unless the user marked them secret.

**It is a copy, not a live link.** Editing the vault entry does not update the shared projection. The
wallet entry stores `sourceItemId` so the relationship is known, and re-sharing pushes a new copy.
Automatic propagation was rejected deliberately: it would silently re-share fields the user may have
since changed their mind about.

## 12. Permissions and rotation

Every wallet entry records `addedBy`. Members may edit and delete only their own entries; the owner
may additionally remove anyone's entry, remove members, rename, and delete the wallet. Everyone reads
and copies everything. All of it is **enforced server-side** — the `addedBy` match is part of the
`arrayFilters` on update, and delete re-checks ownership before pulling.

Removing a member (`useWalletActions.removeMemberAndRotate`):

1. Decrypt the wallet name and every entry under the current key.
2. Generate WK', re-encrypt all of it.
3. Fetch each remaining member's public key and wrap WK' for them.
4. Remove the member, then POST the whole set to `/rotate`.

**Order matters.** The public-key lookups happen _before_ the member is removed, so a failed lookup
leaves the wallet untouched rather than removing someone without rotating. The server also refuses a
rotation whose `members` array does not cover every remaining active member, which prevents a partial
rotation locking someone out. Rotation bumps `keyEpoch`, drops pending requests, and revokes every
outstanding invite — links must be reissued.

Afterwards the UI says plainly that rotation cannot undo what was already seen, and suggests
regenerating the CVV or changing the ATM PIN. That is the honest framing: cryptography can stop future
reads, not retract past ones.

## 13. Frontend

```
frontend/src/app/vault/
├── wallets/
│   ├── WalletsSection.tsx      The list inside the rail's wallets tab
│   ├── WalletRow.tsx           One row: decrypted name, counts, role, pending badge
│   ├── [walletId]/page.tsx     Wallet detail — entries via the shared VaultItemCard
│   ├── CreateWalletDialog.tsx  Generates WK and wraps it to your own public key
│   ├── ShareWalletDialog.tsx   Invite link with the #k= fragment built locally
│   ├── WalletMembersDialog.tsx Members, pending requests, remove + rotate
│   ├── ShareToWalletDialog.tsx The per-field checkbox picker
│   ├── useWalletActions.ts     Create, share, invite, approve, remove + rotate
│   └── useWalletNames.ts       Decrypts wallet names for the list
└── join/[token]/page.tsx       Invite landing page (outside the rail)
```

Wallet keys live in a `Map<walletId:keyEpoch, CryptoKey>` inside `useVaultSession`, populated lazily
and cleared by the same `lock()` that clears the vault key — so wallet keys inherit the identical
never-persisted, idle-locked lifetime. The epoch is part of the cache key, so a rotation elsewhere
cannot serve a stale key from cache.

## 14. Additional risks

- **A 6-digit PIN now also guards your wallet memberships.** The private key that unwraps every wallet
  key is encrypted under it. The offline-attack caveat in §1 applies to shared wallets too.
- **Sharing card credentials breaches your cardholder terms.** Every Indian issuer prohibits
  disclosing the card number, CVV or PIN, and doing so generally voids zero-liability fraud
  protection. The unticked-by-default secrets and the explicit warning in the share dialog reduce the
  exposure; they do not remove it. Users who tick those boxes are making an informed choice and should
  be told so, which the dialog does.
- **The invite link is a bearer credential** for the wallet key. Approval gates the ciphertext, not the
  key. Links expire (7 days) and are use-capped (5) by default, and any rotation revokes them all.
- **`GET /wallets` is O(members) in round trips on the client** because each wallet name is decrypted
  individually. Fine for the tens of wallets a person realistically has; revisit if that assumption
  changes.
- **A member whose vault is destroyed and recreated gets a new keypair**, so their existing wallet
  memberships become unreadable. They must be removed and re-invited. There is no migration for this
  and the UI does not currently detect it.
