# ourFinance — Claude Code Context

Personal finance tracker for investments (stocks, gold, crypto, mutual funds, EPF, FD, RD), expenses, and goals. Built as a monorepo with a Next.js frontend and an Express backend.

---

## Project Structure

```
ourFinance/
├── packages/core/     Shared TypeScript for web + mobile: types, calculations, API hooks, schemas, vault crypto
├── frontend/          Next.js 16 App Router, React 19, TypeScript
├── mobile/            Expo SDK 57 (React Native) app for iOS + Android
├── backend/           Express.js, MongoDB, TypeScript
├── scripts/           Utility scripts (SMS ingestion, automation)
└── docs/
```

**Frontend dev:** `http://localhost:3000`
**Backend dev:** `http://localhost:5000`
**API base:** `NEXT_PUBLIC_API_BASE_URL/api` (falls back to `http://localhost:5000/api`)
**Swagger docs:** `http://localhost:5000/api-docs`
**Deployed frontend:** `https://www.my-finances.site`

---

## Tech Stack

| Layer              | Technology                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Frontend framework | Next.js 16 App Router (`'use client'` on all data pages)                                                |
| UI components      | shadcn/ui + Tailwind CSS                                                                                |
| Charts             | Highcharts + highcharts-react-official                                                                  |
| Data fetching      | TanStack Query v5                                                                                       |
| Global state       | Zustand (`useAppStore` — user, theme, filters)                                                          |
| Form validation    | react-hook-form + zod                                                                                   |
| Backend framework  | Express.js                                                                                              |
| Database           | MongoDB (direct driver, no ORM)                                                                         |
| Auth               | JWT — cookie-based (`credentials: 'include'` on all fetch calls)                                        |
| Validation         | Zod schemas in backend                                                                                  |
| External APIs      | Yahoo Finance (stocks), SafeGold API (gold), CoinDCX (crypto), MFAPI (MF NAV), Gmail API (email import) |

---

## Shared Core (`packages/core`) and Workspaces

The repo root is an npm workspace over `packages/*`, `frontend` and `mobile`, with one root `package-lock.json`. `backend/` and `mcp-server/` are **not** in the workspace and keep their own lockfiles (Render deploys them unchanged). React is 19.2.3 everywhere; Expo SDK 57 pins it, so bump web and mobile together.

`@myfinances/core` is consumed as TypeScript source (Next `transpilePackages`, Metro resolves it directly). Import by subpath: `@myfinances/core/types`, `/api`, `/api/query/<file>`, `/api/mutations/<file>`, `/calc/<file>`, `/hooks/<file>`, `/schemas/<file>`, `/vault/<file>`.

```
packages/core/src/
├── types/index.ts        All API interfaces (was frontend/src/api/dataInterface.ts)
├── api/
│   ├── client.ts         apiRequest() + configureApi() — transport is injected per app
│   ├── persistence.ts    PERSISTENT_QUERY_KEYS, shouldPersistQuery (both apps)
│   ├── mobileAuth.ts     /auth/mobile/* login, signup, demo, refresh
│   ├── query/, mutations/  Every TanStack hook (moved from frontend/src/api)
├── calc/                 Pure calculations: xirr, cagr, portfolioCalculations (MF rows, EPF),
│                         deposits (FD/RD interest), holdingXirr, goldCategories (+ computeGoldStats),
│                         cryptoHoldings (+ valueCryptoHoldings), dailyMoves, mfDailyMoves,
│                         marketHours, navDates, numbers, financialMonth (+ summariseSpend), aiCopy
├── hooks/                useHomePortfolioData, useTodayMovesData, useGoldLeaseData
├── schemas/              auth, transactions (stock/crypto/gold/MF/FD/RD/EPF), expenses
└── vault/                crypto.ts (vault format over injected primitives), noblePrimitives.ts,
                          vaultTypes.ts (field defs, no icons), inviteCode.ts
```

`npm test -w @myfinances/core` runs Vitest, including `vault/__tests__/webCompatibility.test.ts`, which executes the web `vaultCrypto.ts` on Node WebCrypto and checks the core implementation against it in both directions. **Run it after touching either vault crypto file.**

Frontend keeps thin shims where it adds web-only pieces: `api/configs/configureWebApi.ts` (cookies, toast, 401 redirect), `app/vault/vaultTypes.ts` (adds lucide icons), `app/vault/wallets/inviteCode.ts` (re-export).

## Mobile App (`mobile/`)

Expo Router, NativeWind (Tailwind 3), TanStack Query persisted to MMKV, token in `expo-secure-store`.

- **Auth:** bearer JWT from `/api/auth/mobile/login|signup|demo-login` (body, no cookie). `useTokenRefresh` calls `/api/auth/mobile/refresh` on launch and foreground; the server re-signs past half of `SESSION_DURATION_SECONDS`. `configureMobileApi.ts` wires `configureApi` with the token and a 401 → `/login` handler.
- **Screens:** `app/(tabs)/` — `today`, `home`, `assets/` (stocks, mutual-funds, gold, crypto, epf, deposits, transactions, `forms/*`), `expenses/` (list, `add`), `more/` (profile, `vault/`).
- **Vault:** `src/features/vault/` — `vaultCrypto.ts` (native PBKDF2 via react-native-quick-crypto + noble), `VaultSession.tsx`, `useWalletActions.ts`, `biometricPin.ts`. Locks on background and after 5 min idle, zeroes key bytes, blocks screenshots.
- **Push:** `src/lib/pushNotifications.ts` registers an Expo push token at `POST /api/push/expo-token`; backend `sendPush` fans out to Expo tokens and Web Push.
- **Builds:** EAS profiles in `eas.json` — `development` (dev client), `preview` (Android APK / iOS ad hoc), `production` (TestFlight). Native modules (quick-crypto, MMKV) mean **Expo Go cannot run it**; use a development build.
- **Web-only for now:** goals, integrations, email import, EPF passbook upload, stock research — linked from More.

## Frontend Structure

```
frontend/src/
├── app/
│   ├── page.tsx              Auth page (login/signup)
│   ├── layout.tsx            Root layout with providers
│   ├── providers.tsx         TanStack QueryClientProvider
│   ├── home/page.tsx         Master dashboard (all assets combined)
│   ├── today/                Daily movers: stocks / MF / gold / crypto change as a whole
│   │   ├── page.tsx                Orchestrator — header, 4 class cards, contribution chart, top movers
│   │   └── (data hook)             useTodayMovesData lives in packages/core/src/hooks
│   ├── stocks/
│   │   ├── page.tsx          Stocks landing (links to Portfolio, Analytics, Research, Transactions, Update)
│   │   ├── analytics/        Portfolio-wide fundamental analysis (NEW)
│   │   │   ├── page.tsx              Orchestrator — fetches usePortfolioAnalyticsQuery + useStocksPortfolioQuery
│   │   │   ├── PortfolioSummaryBar.tsx  5 KPI cards: avg P/E, portfolio beta, avg ROE, earnings growth %, avg net margin
│   │   │   ├── ValuationSection.tsx    P/E + P/B bucket column charts
│   │   │   ├── ProfitabilitySection.tsx  Grouped bar: ROE / op margin / net margin per stock
│   │   │   ├── GrowthSection.tsx        Grouped column: rev growth + EPS growth per stock (red = negative)
│   │   │   ├── RiskSection.tsx          Beta + D/E donut charts + risk flags list
│   │   │   └── StockScorecardTable.tsx  All stocks × metrics table with colored verdict dots + sort dropdown
│   │   ├── detail/
│   │   │   ├── page.tsx      Search landing — company switcher with portfolio quick-pick
│   │   │   └── [symbol]/
│   │   │       ├── page.tsx  Main orchestrator (~50 lines, routes to child components)
│   │   │       ├── CompanySearchBar.tsx  Search input with suggestions + portfolio quick-picks
│   │   │       ├── CompanyHeader.tsx     Company name, current price, change badge
│   │   │       ├── PriceChart.tsx        Highcharts line chart (1D/1W/1M/3M/1Y intervals)
│   │   │       ├── SnapshotVerdict.tsx   Colored verdict pills (Revenue Growth, Earnings Growth, Operating Margin)
│   │   │       ├── FundamentalsGrid.tsx  2-column grid of metric cards with verdicts
│   │   │       ├── MetricEducationDrawer.tsx  Right-side drawer with live calculations
│   │   │       ├── StockNotFound.tsx     404 error page for invalid symbols
│   │   │       ├── metricDefinitions.ts  20 metrics with educational content
│   │   │       └── verdicts.ts           Verdict logic + live calculation builders
│   │   ├── portfolio/        Combined portfolio value chart + stock name Links
│   │   ├── transactions/     Transaction history table
│   │   ├── search/           Yahoo Finance stock search
│   │   └── updateStock/      Edit stock transaction
│   ├── gold/                 Same pattern: page, portfolio, transactions, updateGold
│   ├── crypto/               Same pattern: page, portfolio, transactions, updateCrypto
│   ├── mutual-funds/
│   │   ├── page.tsx
│   │   ├── dashboard/        MF dashboard with NAV history + XIRR
│   │   │   └── MfTodaySection.tsx  Day move: breadth, top gainer/loser, per-fund contribution chart, NAV/1W/1M table
│   │   ├── portfolio/
│   │   └── transactions/
│   ├── expenses/
│   │   ├── page.tsx          Entry point — fetches all data, routes to tabs
│   │   ├── DashboardTab.tsx  Financial dashboard (display only, receives props)
│   │   ├── TrackerTab.tsx    Daily expense logger
│   │   ├── useDashboardData.ts  All dashboard calculations (useMemo)
│   │   └── useTrackerData.ts    Tracker chart options; totals via core summariseSpend
│   │                            (schemas + EXPENSE_TAGS now in packages/core/src/schemas/expenses.ts)
│   ├── epf/                  EPF account management + passbook import
│   │   ├── page.tsx                   Orchestrator; "Import Passbook" button + EpfPassbookImportDialog
│   │   ├── EpfPassbookImportDialog.tsx Upload PDF passbooks → parse → confirm import
│   │   ├── EpfAccountsDrawer.tsx      Drawer listing all EPF accounts
│   │   ├── AddEpfAccountDialog.tsx    Manual add EPF account form
│   │   ├── EpfSummaryCards.tsx        KPI cards (balance, contributions, interest)
│   │   ├── EpfGrowthChart.tsx         Nominal vs real EPF balance growth (Highcharts area)
│   │   ├── EpfContributionTimeline.tsx Contribution rows + interest rows table
│   │   ├── EpfPageSkeleton.tsx        Loading skeleton
│   │   └── useEpfCalculations.ts      EPF growth projection math (inflated/real)
│   ├── fd/                   Fixed deposits
│   ├── rd/                   Recurring deposits
│   ├── goals/                Investment goals
│   ├── profile/              User profile + salary history (Phone + PAN Number fields; PAN has show/hide toggle)
│   ├── integrations/         4 tabs: UPI Auto-Track, Claude MCP, Email Import, Notifications
│   ├── vault/                PIN-locked, end-to-end encrypted secrets store
│   │   ├── page.tsx                Orchestrator — Unsupported / Setup / Locked / Unlocked
│   │   ├── layout.tsx              Wraps every vault route in VaultSessionProvider
│   │   ├── useVaultSession.tsx     Context provider — CryptoKey, decrypted items, idle auto-lock
│   │   ├── vaultTypes.ts           Category → field-descriptor table (drives forms, cards, copy text)
│   │   ├── PinInput.tsx            6-box segmented numeric PIN input
│   │   ├── VaultSetup.tsx          First run: choose PIN + unrecoverability acknowledgement
│   │   ├── VaultLocked.tsx         PIN entry, wrong-PIN state, lockout countdown
│   │   ├── VaultShell.tsx          Unlocked frame: header, rail, item list, dialogs
│   │   ├── CategoryRail.tsx        Left rail on md+, scrollable pills on mobile
│   │   ├── VaultItemCard.tsx       Tap-to-expand; card/passbook face for cards and banks
│   │   ├── CardFace.tsx            Credit/debit card visual, network-themed
│   │   ├── PassbookFace.tsx        Bank account rendered as a passbook first page
│   │   ├── VaultItemDialog.tsx     Add/edit form; custom fields via useFieldArray
│   │   ├── ChangePinDialog.tsx     Re-encrypts all items client-side, then one atomic rekey
│   │   ├── DestroyVaultDialog.tsx  Type-to-confirm irreversible wipe
│   │   ├── VaultUnsupported.tsx    Insecure-context explainer
│   │   ├── wallets/                Shared wallets (fifth rail tab)
│   │   │   ├── WalletsSection.tsx      List of wallets you own or joined
│   │   │   ├── WalletRow.tsx           One row: name, counts, role, pending badge
│   │   │   ├── [walletId]/page.tsx     Wallet detail — entries via VaultItemCard
│   │   │   ├── CreateWalletDialog.tsx  Generates WK, wraps it to your own public key
│   │   │   ├── ShareWalletDialog.tsx   Invite link with the #k= key fragment
│   │   │   ├── WalletMembersDialog.tsx Members, join requests, remove + rotate
│   │   │   ├── ShareToWalletDialog.tsx Per-field checkbox picker
│   │   │   ├── JoinWalletDialog.tsx    Paste an invite code or link to request access
│   │   │   ├── inviteCode.ts           Builds and parses MFW1 invite codes and links
│   │   │   ├── useWalletActions.ts     Create, share, invite, approve, rotate
│   │   │   └── useWalletNames.ts       Decrypts wallet names for the list
│   │   └── join/[token]/page.tsx   Invite landing page (reads #k= before any router call)
│   └── popup/                Browser extension popup
├── api/
│   └── configs/
│       ├── configureWebApi.ts  configureApi() for the web: cookies, demo toast, 401 → redirect to /
│       ├── baseUrl.ts          API_BASE_URL from env
│       └── index.ts            re-exports apiRequest from @myfinances/core/api/client
│   (query/mutation hooks and all types moved to packages/core)
├── components/
│   ├── custom/
│   │   ├── SummaryStatCard.tsx
│   │   ├── PerformerStatCard.tsx
│   │   ├── TransactionsTable.tsx
│   │   ├── FilterDrawer.tsx
│   │   ├── ChangeBarChart.tsx   Diverging ₹-change bar chart (Today page + MF dashboard)
│   │   ├── BreadthBar.tsx       Up/down proportion bar
│   │   └── Tabs.tsx
│   └── ui/                   shadcn/ui components
├── store/
│   └── useAppStore.ts        Zustand: { user, theme, filters, tempFilters }
└── utils/                    Web-only helpers (pure calculations moved to packages/core/src/calc)
    ├── useUrlState.ts        URL-persisted state (tabs, filters) via router.replace
    ├── vaultCrypto.ts        WebCrypto PBKDF2 + AES-GCM for the vault (client-side only)
    ├── vaultBiometrics.ts    WebAuthn PRF Face ID unlock
    └── webPush.ts            Service worker push subscription
```

---

## Backend Structure

```
backend/src/
├── server.ts             Express app + route mounting + startup
├── config.ts             Env config (PORT, JWT_SECRET, DB_URI, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, ENCRYPTION_KEY, etc.)
├── database.ts           MongoDB connection singleton
├── routes/               One file per domain, imports controller + authenticateToken
├── controllers/          Route handlers — call services or DB directly
├── services/
│   ├── stocksService.ts       Yahoo Finance calls:
│   │   ├── fetchQuotesSummary(symbols)  Returns price data + key stats
│   │   ├── searchStocks(query)  Yahoo Finance search
│   │   ├── fetchFinancials(symbol)  Returns price, summaryDetail, defaultKeyStatistics, financialData, earningsTrend
│   │   └── (includes 300ms delay between requests to avoid rate limiting)
│   ├── stockServiceHelper.ts  NSE quote formatting
│   ├── coindcxService.ts      CoinDCX API
│   ├── inflationService.ts    Inflation data
│   ├── gmailService.ts        Gmail OAuth2 + PDF attachment fetching (paginated, supports incremental sync via afterDate)
│   ├── pdfParser.ts           Password-protected PDF text extraction using pdf-parse
│   ├── cdslParser.ts          CDSL eCAS MF transaction parser
│   ├── safegoldParser.ts      SafeGold gold transaction parser
│   ├── epfPassbookParser.ts   Regex-based EPF passbook text parser (TS fallback); captures employee+employer contributions
│   └── pdfParsingClient.ts    Rust PDF service client: submitPdfJob/waitForPdfJob/warmupPdfService (fire-and-forget warm-up)
├── middleware/
│   ├── jwt.ts            authenticateToken middleware — extracts { name, email, userId }
│   └── requestLogger.ts
├── schemas/              Zod validation schemas
│   └── emailIntegration.ts   Zod schema for emailIntegrations collection
└── utils/
    ├── encryption.ts     AES-256-GCM encrypt/decrypt for PAN, refresh tokens, vault/wallet ciphertext
    └── vaultLockout.ts    computeLockoutMs() backoff ladder for failed vault unlocks
```

### All API Route Prefixes

| Prefix                      | Domain                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `/api/auth`                 | Login, signup; `/mobile/*` variants return the JWT in the body for the app                |
| `/api/stocks`               | Stock transactions + NSE quotes + Yahoo Finance search + financials + portfolio analytics |
| `/api/gold`                 | Gold transactions + SafeGold rates                                                        |
| `/api/crypto`               | Crypto transactions + CoinDCX prices + 24h ticker changes + candle data                   |
| `/api/mutual-funds`         | MF transactions                                                                           |
| `/api/funds`                | MF info (scheme numbers) + batch NAV history                                              |
| `/api/epf`                  | EPF accounts + timeline                                                                   |
| `/api/fixed-deposit`        | FD management                                                                             |
| `/api/recurring-deposit`    | RD management                                                                             |
| `/api/expenses`             | Recurring expense categories                                                              |
| `/api/expense-transactions` | Daily expense log                                                                         |
| `/api/goals`                | Investment goals                                                                          |
| `/api/targets`              | Asset allocation targets                                                                  |
| `/api/inflation`            | Inflation rate data                                                                       |
| `/api/ingest`               | SMS-based transaction ingestion                                                           |
| `/api/email-integration`    | Email import (Gmail OAuth, CDSL eCAS + SafeGold PDF parsing)                              |
| `/api/vault`                | End-to-end encrypted secrets vault (meta, unlock, items, rekey, destroy, keypair)         |
| `/api/wallets`              | Shared wallets — members, invites, join requests, per-field shared entries                |
| `/api` (verify)             | Token verification                                                                        |

---

## Authentication Pattern

- JWT stored in **httpOnly cookie** (set by backend on login)
- All frontend fetch calls use `credentials: 'include'`
- Backend middleware `authenticateToken` (in `middleware/jwt.ts`) extracts `req.user = { name, email, userId }`
- On 401 response, `apiRequest()` clears localStorage and redirects to `/`
- All protected routes use `authenticateToken` middleware

---

## TanStack Query Conventions

Every query hook lives in `packages/core/src/api/query/`. Conventions:

```typescript
// Standard cache — 5 minutes staleTime
useQuery({ queryKey: ['domain-name'], queryFn: ..., staleTime: 5 * 60 * 1000 })

// Live price data — shorter stale + auto-refetch
useQuery({ staleTime: 2 * 60 * 1000, refetchInterval: 5 * 60 * 1000, refetchIntervalInBackground: true })

// Conditional / dependent queries
useQuery({ enabled: someArray.length > 0 })

// Batch query
// POST /api/funds/nav-history with { schemeNumbers: [...] } — fetches all NAVs in one call
useMfapiNavHistoryBatchQuery(schemeNumbers)
```

Query invalidation on mutations: mutations call `queryClient.invalidateQueries({ queryKey: ['domain'] })` after success.

---

## Data Flow Architecture

### General pattern (all asset pages)

```
1. Fetch transactions from backend (cached 5 min)
2. Group/process transactions (useMemo)  ← pure CPU, no network
3. Use derived data as input for price queries (enabled flag)
4. Price queries fire (live data, shorter cache)
5. Combine transactions + prices in another useMemo → portfolio data
6. Pass to chart options (useMemo) → Highcharts
```

### Home page (`home/page.tsx`) — the mega dashboard

Fetches ALL asset types in parallel, then dependent price queries fire:

- Round 1: stock txns, MF txns + MF info, gold txns, crypto txns, EPF, FD, RD (all parallel)
- Round 2 (after grouping): `useNseQuoteQuery(stockNames)`, `useMfapiNavHistoryBatchQuery(schemeNumbers)`, `useCryptoCoinPricesQuery(validCoins)`, `useSafeGoldRatesQuery(dateRange)`
- XIRR runs in useMemo after all data is available

### Stock Portfolio page (`stocks/portfolio/page.tsx`) — combined value chart

**Chart change:** Replaced multi-line per-stock chart with single combined total portfolio value line.

- Sums all stocks' holding values at each shared timestamp
- Single series showing total portfolio net value over time
- Removed per-stock selector dropdown
- Interval controls: Day, Week, Month, 1M, 3M, 1Y, YTD, All
- Toggle: Show/hide transaction plot lines

**Stock name linking:** Stock names in the portfolio table are now `<Link>` elements navigating to `/stocks/detail/[encodeURIComponent(symbol)]`. Clicking a stock name opens the detail page for that company.

### Expenses page (`expenses/page.tsx`) — important nuance

Makes **8 parallel API calls** on load — including ALL asset transaction types (stocks, gold, crypto, MF, RD) just to compute "total invested per month" in `useDashboardData.ts`. This is a cross-domain aggregation that would be more efficient as a backend endpoint, but works fine in practice because TanStack Query caches those calls if the user has visited other pages.

**Known data accuracy issue in `useDashboardData.ts`:** The recurring `expenses` list (from `/api/expenses`) is applied uniformly across all 12 historical months with frequency normalization (daily×30, weekly×4, yearly÷12). It does not account for expenses added or removed mid-period — so a new expense retroactively appears in all past months.

### Stock Detail Page (`stocks/detail/[symbol]/`)

Comprehensive deep-dive page for individual stock analysis. Structured as a thin orchestrator (`page.tsx`, ~50 lines) routing to focused child components.

**Component breakdown:**

- `CompanySearchBar.tsx` — Pre-filled search input; on focus shows portfolio stocks; on typing 3+ chars fires global search via `useSearchStockByNameQuery()`
- `CompanyHeader.tsx` — Company name, current price with trending icon, percent change with color coding, "Not in portfolio" badge if applicable
- `PriceChart.tsx` — Highcharts line chart with interval selector (1D/1W/1M/3M/1Y). For 1D: filters to market hours (09:00–16:00) + latest trading day only. X-axis formatter applies IST offset (5.5 hours) for correct timezone display.
- `SnapshotVerdict.tsx` — Colored verdict pills for Revenue Growth, Earnings Growth, Operating Margin. Clickable pills open drawer with live calculations.
- `FundamentalsGrid.tsx` — 2-column grid (1-col mobile) of metric cards. Each card: label (clickable), value, small verdict line. Click opens `MetricEducationDrawer` with full educational content + live calculations.
- `MetricEducationDrawer.tsx` — Right-side Sheet drawer with: (1) metric title, (2) What is it?, (3) How calculated (formula + live calculation box), (4) What tells us, (5) Good Range, (6) Quick Tips
- `StockNotFound.tsx` — Friendly 404 for invalid stock symbols or API failures

**Live Calculations feature:**
Drawer displays actual API data + formula + result for 14+ metrics:

- P/E ratios (Trailing & Forward)
- Book ratios (P/B, PEG)
- Margins (Gross, Operating, Net)
- Returns (ROE, ROA)
- Growth (Revenue YoY, Earnings YoY)
- Leverage (Debt/Equity, Current Ratio)

Example: "Current Stock Price: ₹2,500.00 ÷ EPS: ₹96.15 = **26.0**"

**20 metric definitions** in `metricDefinitions.ts` cover: P/E, Forward P/E, Market Cap, EPS, Forward EPS, PEG, P/B, Beta, 52W High/Low, Dividend Yield, ROE, ROA, Operating/Gross/Net Margins, Debt/Equity, Current Ratio, Revenue Growth, Earnings Growth, Free Cash Flow, Total Cash, Total Debt.

---

## Where Calculations Live

| Calculation                                         | Location                                            | Notes                                                                                                                                  |
| --------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Portfolio grouping (by symbol/name)                 | Frontend useMemo                                    | After fetching transactions                                                                                                            |
| P/L, P/L%                                           | Frontend useMemo                                    | After combining transactions + live prices                                                                                             |
| XIRR                                                | Frontend useMemo (`utils/xirr.ts`)                  | Uses newton-raphson-method library                                                                                                     |
| Compound interest (FD/RD/EPF)                       | Frontend useMemo                                    | No external data needed                                                                                                                |
| MF NAV-based valuation                              | Frontend useMemo (`utils/portfolioCalculations.ts`) | After batch NAV fetch                                                                                                                  |
| Monthly investment aggregation (expenses dashboard) | Frontend useMemo (`useDashboardData.ts`)            | Filters all transaction arrays by date range                                                                                           |
| Savings rate, discretionary spending                | Frontend useMemo                                    | Derived from salary history + investments + expenses                                                                                   |
| Chart series construction                           | Frontend useMemo                                    | Highcharts options built in useMemo, theme-aware                                                                                       |
| Metric verdicts (stock detail)                      | Frontend function                                   | `getVerdict(metric, value)` in `verdicts.ts` — qualitative interpretation of metric values                                             |
| Live calculations (stock detail)                    | Frontend function                                   | `getMetricCalculation(metricLabel, financials)` in `verdicts.ts` — computes + formats calculation data for drawer                      |
| NSE quote fetching                                  | Backend service                                     | `stocksService.ts` calls Yahoo Finance, 300ms delay between requests                                                                   |
| Stock financials (detail page)                      | Backend service                                     | `stocksService.fetchFinancials(symbol)` fetches price, summaryDetail, defaultKeyStatistics, financialData, earningsTrend independently |
| CoinDCX price fetching                              | Backend service                                     | `coindcxService.ts`                                                                                                                    |
| SafeGold rate fetching                              | Backend controller                                  | Calls SafeGold API                                                                                                                     |

---

## Key Domain Concepts

### Expenses (two separate concepts — do not confuse)

- **`/api/expenses`** → Recurring expense categories (rent, insurance, subscriptions). These are static entries with a `frequency` field (`one-time | daily | weekly | monthly | yearly`). Used in the financial dashboard to compute monthly expense burden.
- **`/api/expense-transactions`** → Daily expense log (individual purchases). Used in the Tracker tab. Has `date`, `name`, `amount`, `category`.

### Transactions (credit/debit pattern)

All asset transactions use `type: 'credit' | 'debit'`. Credits = buy/receive, Debits = sell/withdraw. Portfolio calculations always handle both:

```typescript
totalUnits = txs.reduce(
  (sum, tx) => sum + (tx.type === "credit" ? tx.numOfUnits : -tx.numOfUnits),
  0,
);
```

### Salary history

`UserProfile` has both `salaryHistory[]` (base salary effective dates) and `paymentHistory[]` (actual monthly payments with bonus/arrears). `useDashboardData` resolves the correct salary for any given month via `getSalaryForMonth()` and `getPaymentForMonth()`.

### UserProfile — sensitive fields

`UserProfile` includes `phone` (stored as plaintext) and `panNumber` (stored AES-256-GCM encrypted in DB; returned masked to the frontend — only the last 4 characters are revealed). The profile page exposes a show/hide toggle for the PAN field.

### vaults collection — the one thing the server cannot read

One document per user (unique index on `userId`), holding a plaintext `salt`, a `verifier` blob, `kdf: { algo, iterations }`, `keyEpoch`, an `items[]` array of `{ id, category, ciphertext, createdAt, updatedAt }`, plus `failedAttempts` / `lockedUntil` for unlock throttling.

Unlike PAN and Gmail tokens — which the server encrypts and can therefore also decrypt — vault entries are encrypted **in the browser** under a key derived from the user's 6-digit PIN (PBKDF2-SHA256, 310k iterations, AES-256-GCM). The server wraps that ciphertext in a _second_ `encrypt()` layer before storing it. The PIN never leaves the device, so there is no server-side path to the plaintext and no recovery for a forgotten PIN.

Full design, threat model and rationale: **`docs/Vault_Architecture.md`**. Read it before changing anything under `frontend/src/app/vault/`, `frontend/src/utils/vaultCrypto.ts`, or `backend/src/controllers/vaultController.ts`.

### wallets / walletMembers / walletInvites collections — shared wallets

A wallet is a named set of entries shared with other users, surfaced as a fifth tab on the vault's own category rail. Each wallet has its own random AES-256-GCM key (WK); the wallet name and every entry are encrypted under it, and the server wraps all of that in its usual second layer.

Because removing a member rotates WK and the owner cannot reach anyone's PIN-derived key, **every user has an ECDH P-256 keypair** — public key plaintext on their vault doc, private key encrypted under their vault key. WK is wrapped per member with ECDH-ES (ephemeral key + HKDF-SHA256 → AES-GCM), so the owner wraps to their own public key by the same code path as to anyone else's.

Invite links carry WK in the **URL fragment** (`/vault/join/<token>#k=…`), which browsers never transmit. Joining is request-then-approve; sharing an entry is a per-field projection, not the whole entry. See `docs/Vault_Architecture.md` Part 2.

### emailIntegrations collection

MongoDB collection storing per-user Gmail integration state:

```
{ userId, email, refreshToken (AES-256-GCM encrypted), linkedAt, lastSyncAt, safegoldSender }
```

- `safegoldSender` — configurable sender email used to filter SafeGold PDF emails (defaults to SafeGold's known sender)
- `lastSyncAt` — null on first sync or after a full re-sync reset; used for incremental sync (only emails after this date are fetched)

### MF Scheme Numbers

MF fund names in transactions don't carry scheme numbers. `MutualFundInfo` (from `/api/funds/infoFetch`) maps `fundName → schemeNumber`. Scheme numbers are needed for MFAPI NAV fetches. This is why MF pages need two queries before pricing is possible.

### FIXED_EXPENSE_TAGS

Defined in `packages/core/src/schemas/expenses.ts`: `['Rent', 'Insurance', 'Bills & Utilities']`. Expenses with these tags are counted as `fixedExpenses`; all others are `variableExpenses`.

---

## Zustand Store (`useAppStore`)

```typescript
{
  user: User | null,           // Set on login, cleared on logout
  theme: 'light' | 'dark',    // Default 'dark', persisted via ThemeSyncer component
  filters: FilterState,        // Applied filters (default: { dateSort: ['latest'] })
  tempFilters: FilterState,    // Staged filters before user confirms in FilterDrawer
}
```

---

## External API Notes

| API                 | Via                                            | Rate limiting                                     |
| ------------------- | ---------------------------------------------- | ------------------------------------------------- |
| Yahoo Finance       | Backend (`stocksService.ts`)                   | 300ms delay between symbol requests               |
| MFAPI (NAV history) | Frontend direct (batch POST via backend route) | Batch endpoint fetches all schemes in parallel    |
| SafeGold            | Backend controller                             | Date-range based                                  |
| CoinDCX             | Backend (`coindcxService.ts`)                  | POST with coin names array                        |
| Gmail API           | Backend (`gmailService.ts`)                    | Paginated fetch; incremental sync via `afterDate` |

---

## Important Patterns & Gotchas

1. **All pages are `'use client'`** — there is no server-side rendering of data pages. Next.js is used purely for routing and layout.

2. **401 = global logout** — `apiRequest()` auto-redirects to `/` on any 401. No per-query error handling needed for auth.

3. **Chart options are theme-aware** — every `useMemo` that builds Highcharts options takes `theme` from `useAppStore` as a dependency. `textColor` switches between `'#fff'` (dark) and `'#18181b'` (light). Always include `theme` in the dependency array.

4. **`packages/core/src/calc/` is the shared calculation source of truth** — the web pages, the home dashboard and the mobile app all import from here. Don't duplicate calculation logic in page files.

5. **MF requires two-step data fetch** — you cannot fetch NAV history without scheme numbers, and scheme numbers come from the MF info endpoint. This creates an unavoidable dependent query chain.

6. **Gold rates require a date range** — `useSafeGoldRatesQuery` takes `startDate` and `endDate`. On the home page, this is derived from the earliest gold transaction date.

7. **Crypto coin symbols vs names** — `CryptoTransaction` has both `coinName` (e.g., "Bitcoin") and `coinSymbol` (e.g., "BTC"). CoinDCX price API uses the symbol. Filter out coins with zero net quantity before making the price call.

8. **The expenses dashboard applies current expense list to all past months** — `useDashboardData.ts` has a known limitation where recurring expenses don't have historical effective dates, so they're applied uniformly across the 12-month window.

9. **CORS origins are hardcoded in `server.ts`** — `localhost:3000`, `localhost:5000`, and the production domain. Add new origins there.

10. **`apiRequest()` is the only HTTP client** — don't use axios or raw fetch in new code. All API calls go through `apiRequest()` from `@myfinances/core/api/client` (re-exported by `@/api/configs` on web).

11. **Email import is on-demand only** — there is no background cron. The user manually triggers a sync from the Integrations page. After the first sync, `lastSyncAt` is set and subsequent syncs only fetch emails received after that timestamp (incremental sync). A "Full re-sync" button resets `lastSyncAt` to null to force a complete history fetch.

12. **CDSL eCAS parsing limitation** — only MF transactions are extracted from CDSL CAS PDFs. The equity holdings section is a point-in-time snapshot with no historical buy/sell data, so it is intentionally skipped.

13. **SafeGold PDF parsing rules** — "Purchased"/"Sold" rows import as `category: 'purchase' | 'sale'`. Lease rental payouts import as `lease_interest` (credit, `amount: 0`, `goldPrice: 0`) and "deducted as TDS" rows as `lease_tds` (debit, `amount: 0`), each with `borrower`; the "Leased N grams to …" rows stay skipped because leasing only moves gold inside the wallet. Rows without `category` are legacy buys/sells — read them through `getGoldCategory()` in `packages/core/src/calc/goldCategories.ts`. Lease rows add or remove grams but never cash: `goldCashFlow()`/`netGoldInvested()` exclude them from invested and XIRR, and capital-gains FIFO consumes TDS lots as `isNonSaleOutflow` rather than booking a sale at ₹0. Statements are parsed locally (`safegoldParser.ts`), not by the Rust service, whose `safegold.rs` still skips lease rows. The monthly "Lease Monthly Yield Payout" PDF (`safegoldLeaseParser.ts`, unprotected) is a per-lease snapshot upserted into `goldLeases` by `commitId`; the statement's account summary (leased vs available grams) goes to `goldAccountSummaries`. Both are served by `GET /api/gold/leases`.

14. **Email import deduplication** — before inserting a parsed transaction, a ±1 day window check is performed on the date combined with other matching fields (symbol/fund name/amount). Duplicates within that window are silently skipped.

15. **Encryption key env var** — `ENCRYPTION_KEY` must be a 64-character hex string (representing 32 bytes). Used by `backend/src/utils/encryption.ts` for AES-256-GCM. Required alongside `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` for email integration to function.

16. **Stock detail page component composition** — The orchestrator page.tsx is kept intentionally thin (~50 lines). Data fetching (`useStockFinancialsQuery`) happens in page.tsx, but all rendering logic (verdicts, calculations, layout) is delegated to focused child components. Each component owns its own interaction state (e.g., `selectedMetric` in `FundamentalsGrid`). This pattern makes the page maintainable and allows reuse of components.

17. **Verdict logic is pure functions** — `getVerdict(metric, value)` and `getMetricCalculation(metricLabel, financials)` are pure functions in `verdicts.ts`. They compute textual interpretation and calculation data from API values. No side effects, no state. This makes them testable and reusable across components (e.g., both FundamentalsGrid and SnapshotVerdict can call them).

18. **Live calculations are flexible** — `MetricCalculation` interface supports any type of calculation via generic `label1/value1/label2/value2/result/formula` fields. This allows the same drawer component to display P/E (two inputs, one result), margin calcs (single result), growth comparisons, ratios, etc. Adding new metrics only requires adding a case to `getMetricCalculation()` — drawer component doesn't change.

19. **Stock detail chart uses IST timezone offset** — The 1D intraday chart applies a 5.5-hour offset in the x-axis formatter to convert UTC timestamps to IST (Indian Standard Time). For 1D charts, data is also filtered to market hours (09:00–16:00) + latest trading day only, eliminating the overnight gap and cleanly showing only active trading session data.

20. **Stock 1-day change uses second-to-last close, not `chartPreviousClose`** — `meta.chartPreviousClose` from the Yahoo Finance chart API is the first data point of the fetched range (not yesterday's close), so it produces wrong values for ETFs or stocks with splits. `getStocksPortfolio` in `stocksController.ts` instead reads the last two non-null values from `indicators.quote[0].close` and uses the second-to-last as previous close. Falls back to `regularMarketPreviousClose` / `chartPreviousClose` only if the close array has fewer than 2 entries.

21. **Gold rates carry-forward weekends** — Yahoo Finance's `GC=F` API only returns trading days (Mon–Fri). `getSafeGoldRates` in `goldController.ts` fills weekend/holiday gaps by carrying forward the last known Friday close. Weekends are also excluded from the `missingDates` list so no unnecessary Yahoo Finance calls are made for Sat/Sun.

22. **EPF passbook import — employee + employer contributions** — EPFO passbook has three balance columns: Employee, Employer, Pension. The withdrawable EPF balance = Employee + Employer. Both `epfPassbookParser.ts` (TS fallback) and the Rust service path in `epfController.ts` sum `employee_share + employer_share`. The stored `epfAmount` therefore reflects the total monthly credit, not just the employee half.

23. **EPF interest shown for any completed FY** — `getEpfTimeline` includes interest for every financial year where March 31 has passed (`interestCreditDate <= currentDate`). A prior 6-month buffer that delayed inclusion until September was removed — it caused the just-ended FY to be excluded for the first half of the new year.

24. **Rust PDF parsing service warm-up** — The Rust service at `PDF_PARSING_SERVICE_URL` (hosted on Render) sleeps after 15 min of inactivity. `getEpfAccounts` calls `warmupPdfService()` (fire-and-forget GET to `/jobs/warmup`) whenever the EPF page loads, keeping the instance warm for passbook uploads. Errors are silently swallowed.

25. **EPF Rust service fallback on error** — `parseEpfPassbooks` tries the Rust service first. If it throws for any reason (429, timeout, service down), it logs a warning and falls back to the TypeScript `epfPassbookParser.ts` parser automatically. The `usedRustService` flag gates which path ran.

26. **Portfolio analytics uses a single batch backend call** — `GET /api/stocks/portfolio-analytics` fetches the user's transactions, extracts unique symbols, runs `StocksService.fetchFinancials()` for all in parallel, and returns `Record<symbol, StockFinancials>` in one response. The frontend hook `usePortfolioAnalyticsQuery()` (10 min staleTime) makes this single call. The analytics page also uses `useStocksPortfolioQuery()` for investment weights (portfolio beta weighting, scorecard sort).

27. **Vault plaintext must never enter the TanStack Query cache** — `lib/queryPersister.ts` persists query state to IndexedDB, gated by the opt-in `PERSISTENT_QUERY_KEYS` whitelist in `packages/core/src/api/persistence.ts` (used by web and mobile). The real protection is structural, not that list: decrypted vault content never goes through the query layer at all. Items are fetched imperatively by `useVaultSession` and decrypted into component state, so even if a vault key were added to the whitelist it would persist ciphertext. **Never add a vault query key to `PERSISTENT_QUERY_KEYS`.**

28. **Never `await` a decrypt inside a clipboard handler** — Safari (desktop and iOS) allows `navigator.clipboard.writeText` only within the task that handled the user gesture. Any `await` first — including `await decryptItem(...)` — silently breaks the copy on iOS. This is why vault items are decrypted eagerly into state on unlock and `buildItemCopyText()` in `vaultTypes.ts` is synchronous.

29. **The vault server cannot validate the PIN, so throttling guards the verifier instead** — `GET /api/vault/meta` deliberately omits the verifier blob; `POST /api/vault/unlock` is a separate counted call that pessimistically increments `failedAttempts` _before_ returning it, and the client calls `/unlock/confirm` only after `verifyPin` succeeds. A client that never confirms stays throttled, so it fails closed. `/api/vault/unlock` is in `DEMO_ALLOWED_PATHS` because it and `/unlock/confirm` are semantically reads.

30. **Vault array upserts must narrow the _query_ to the element, not branch on counts** — `arrayFilters` with no matching element returns `matchedCount: 1, modifiedCount: 0`, which tempts you into keying the `$push` fallback off `modifiedCount`. That breaks the moment the same `$set` also touches a top-level field: `updatedAt: now` always modifies the document, so `modifiedCount` is `1` even when no array element matched, the fallback never fires, and every create silently no-ops while still bumping `updatedAt` (a vault with `items: []` and a fresh `updatedAt` is the fingerprint). `upsertVaultItem` and `upsertWalletItem` therefore put the element predicate in the filter (`'items.id': itemId`, or `$elemMatch` with `addedBy` for wallets) so `matchedCount === 0` unambiguously means "no such element" — then disambiguate missing-vault from missing-item with a follow-up `findOne`. Relatedly, `rekeyVault` must stay a single atomic `updateOne` — a partial rekey leaves items under two different keys with one verifier, which is unrecoverable.

31. **Vault needs a secure context** — `crypto.subtle`, `crypto.randomUUID` and `navigator.clipboard` are undefined on insecure origins. `https://` and `localhost`/`127.0.0.1` qualify; `http://192.168.x.x:3000` does not, so LAN testing from a phone shows `VaultUnsupported.tsx`. Use `next dev --experimental-https` or a tunnel. Also note that rotating `ENCRYPTION_KEY` breaks every existing vault (plus stored PANs and Gmail tokens) — there is no re-wrap migration.

32. **Every vault user has an ECDH P-256 keypair, and the vault PIN guards it** — the public key sits in plaintext on the vault document; the private key is encrypted under the vault key, so unlocking the vault is what yields it. `ensureSharingKeys` in `useVaultSession` backfills it on unlock for vaults created before shared wallets existed. **`rekeyVault` must re-wrap `wrappedPrivateKey` under the new vault key** — forgetting that orphans every wallet the user belongs to. `POST /api/vault/keypair` matches on `publicKey: null` so it can never clobber an existing keypair.

33. **Invites travel as a code by preference, not a link** — `MFW1.<token>.<base64url key>`, built and parsed by `packages/core/src/vault/inviteCode.ts`. Two reasons the link is the fallback: chat apps (WhatsApp confirmed) strip the `#k=` fragment while generating a preview, leaving a link that cannot decrypt; and a tapped link opens the browser, which on iOS is a _different storage container_ from the Home Screen app, so the recipient signs in and unlocks a second time. iOS does not let a PWA capture links, so that part is unfixable — the code sidesteps it by being pasted into the already-open app (Vault → Wallets → Join, also reachable via the manifest shortcut `?join=1`). `parseWalletInvite` accepts either carrier, pulls one out of surrounding chat text, and raises `InviteKeyMissingError` when a link arrives with its fragment stripped so the UI names the real problem.

34. **The wallet key rides in the URL fragment, never the path or query** — `/vault/join/<token>#k=<base64url>`. Browsers do not transmit the fragment, so it stays out of server logs, `Referer` headers and proxies. The join page must read `window.location.hash` in its first effect **before any router call**, because `useUrlState` uses `router.replace` and would drop it. Consequence worth stating plainly: the link is a bearer credential, and owner approval gates server-side access to the ciphertext rather than possession of the key.

35. **Member removal rotates the wallet key, and the order of operations matters** — `removeMemberAndRotate` fetches every remaining member's public key and computes the new wraps _before_ removing the member, so a failed lookup leaves the wallet untouched instead of removing someone without rotating. The server also rejects a rotation whose `members` array does not cover every remaining active member. Rotation bumps `keyEpoch`, drops pending requests and revokes all invites. It cannot undo what an ex-member already read — the UI says so and suggests regenerating the CVV.

36. **Wallet keys are cached by `walletId:keyEpoch`, not `walletId`** — the epoch is part of the cache key so a rotation elsewhere cannot serve a stale key from cache. The cache lives in `useVaultSession` and is cleared by the same `lock()` that clears the vault key, so wallet keys inherit the identical never-persisted, idle-locked lifetime.

37. **Shared entries are per-field projections and are copies, not live links** — only ticked fields are encrypted into the wallet entry; the rest never leave the owner's vault. `VaultFieldDef.shareByDefault` ticks identifying fields by default and leaves `cardNumber`/`cvv`/`atmPin`/passwords unticked. Editing the vault entry does **not** update the shared copy (`sourceItemId` records the link); automatic propagation was rejected because it would silently re-share fields. Server-side, members may only edit entries where `addedBy` matches — enforced in the `arrayFilters`, not just hidden in the UI.

38. **The app is an installable PWA, and that only works because frontend and API are same-site** — `www.my-finances.site` and `api.my-finances.site` share the registrable domain, so the `SameSite=Lax` cookie is first-party and installing to the Home Screen changes nothing about auth. Do **not** move the API to a different domain, and do not assume a Capacitor/WebView shell would work as-is: `capacitor://localhost` is cross-site against the API and would break the cookie, CORS and Gmail OAuth at once. The native app (`mobile/`) uses bearer tokens through `configureApi({ getToken })` for exactly this reason (see #44).

39. **The service worker must never cache API responses** — `public/sw.js` returns early for any non-same-origin request, which excludes `api.my-finances.site` by construction. TanStack Query + `queryPersister.ts` already own data freshness and persistence; caching authenticated financial responses in the Cache API would duplicate that state with a second, separate eviction story. The service worker's job is the app shell only, which is what makes the already-persisted query cache reachable offline.

40. **Session is 30 days with a sliding refresh, and boot state is server-verified** — `SESSION_DURATION_SECONDS` in `jwtHelpers.ts` is the single source for both the JWT `expiresIn` and the cookie `maxAge`; keep them from drifting apart. `authenticateToken` re-issues the cookie past the halfway mark, but only when the token came from a cookie — never for a bearer token, which has no cookie to refresh. Note the separate `'24h'` in `ingestTokenExchange` is the MCP bearer and is deliberately left short. `AuthProvider` probes `/api/verify` on mount and `RouteGuard` waits for `isSessionResolved`; only a real 401 clears local state, so an offline launch is not treated as a logout.

41. **Face ID unlock stores the PIN wrapped under a WebAuthn PRF key, on the device only** — see `utils/vaultBiometrics.ts` and the Face ID section of `docs/Vault_Architecture.md`. Nothing new reaches the server. Two rules: PRF support is uneven (Safari has it from iOS 18 via iCloud Keychain, not with security keys), so it is feature-detected and the PIN always stays a working unlock path; and `changePin`/`destroy` must both call `clearBiometricUnlock()`, or Face ID unlocks with a stale PIN and fails the verifier for no visible reason.

42. **Wide tables render as stacked cards below `md:`** — `components/custom/MobileDataCard.tsx` is the shared primitive; `TransactionsTable` and the stocks/crypto/FD/RD/MF/scorecard tables each render cards on mobile and keep `<Table className="hidden md:table">` for desktop. When adding a column to one of those tables, add it to the card too, or it silently disappears on the phone.

43. **`/today` compares each class against a different baseline** — stocks: current price vs second-to-last daily close (weekends and holidays therefore show the last session; `summary.lastTradeTime` names it). MFs: latest NAV vs the one before, fetched via `latestCount: 2` on `/funds/nav-history`; a fund whose latest NAV date lags the others counts as unchanged. Gold: SafeGold live price vs the previous row of `/gold/safe-gold-rates`. Crypto: CoinDCX `change_24_hour`, a rolling 24h window (`POST /crypto/ticker-changes`). Labels on each card state the basis — keep them honest when changing a builder.

44. **Mobile auth is bearer-only and never sets a cookie** — `/api/auth/mobile/login|signup|demo-login` share the credential logic of their web twins through `startSession(res, user, 'cookie' | 'body')` in `authController.ts`, so validation cannot drift, but only the web routes set the cookie and only the mobile routes put `token` in the body. `authenticateToken` already reads `Authorization: Bearer` first. Bearer tokens get no sliding refresh from the middleware; the app calls `/mobile/refresh`, which uses the same `reissueTokenIfStale` as the cookie path.

45. **Expo Go cannot run the mobile app** — react-native-quick-crypto (native PBKDF2; 310k iterations in pure JS would take seconds) and MMKV are native modules. Use `eas build --profile development` once, then `npx expo start --dev-client`. `expo-doctor` must stay at 21/21; `react-native-svg` is pinned and deduped via a root `overrides` entry because lucide-react-native pulls its own.
