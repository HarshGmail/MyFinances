# ourFinance — Claude Code Context

Personal finance tracker for investments (stocks, gold, crypto, mutual funds, EPF, FD, RD), expenses, and goals. Built as a monorepo with a Next.js frontend and an Express backend.

---

## Project Structure

```
ourFinance/
├── frontend/          Next.js 16 App Router, React 19, TypeScript
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

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 16 App Router (`'use client'` on all data pages) |
| UI components | shadcn/ui + Tailwind CSS |
| Charts | Highcharts + highcharts-react-official |
| Data fetching | TanStack Query v5 |
| Global state | Zustand (`useAppStore` — user, theme, filters) |
| Form validation | react-hook-form + zod |
| Backend framework | Express.js |
| Database | MongoDB (direct driver, no ORM) |
| Auth | JWT — cookie-based (`credentials: 'include'` on all fetch calls) |
| Validation | Zod schemas in backend |
| External APIs | Yahoo Finance (stocks), SafeGold API (gold), CoinDCX (crypto), MFAPI (MF NAV), Gmail API (email import) |

---

## Frontend Structure

```
frontend/src/
├── app/
│   ├── page.tsx              Auth page (login/signup)
│   ├── layout.tsx            Root layout with providers
│   ├── providers.tsx         TanStack QueryClientProvider
│   ├── home/page.tsx         Master dashboard (all assets combined)
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
│   │   ├── portfolio/
│   │   └── transactions/
│   ├── expenses/
│   │   ├── page.tsx          Entry point — fetches all data, routes to tabs
│   │   ├── DashboardTab.tsx  Financial dashboard (display only, receives props)
│   │   ├── TrackerTab.tsx    Daily expense logger
│   │   ├── useDashboardData.ts  All dashboard calculations (useMemo)
│   │   ├── useTrackerData.ts    Tracker chart calculations (useMemo)
│   │   └── types.ts          Zod schemas, constants (EXPENSE_TAGS, FIXED_EXPENSE_TAGS)
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
│   ├── integrations/         3 tabs: UPI Auto-Track, Claude MCP, Email Import
│   └── popup/                Browser extension popup
├── api/
│   ├── configs/
│   │   ├── api.ts            apiRequest() — base fetch wrapper (handles 401 → redirect to /)
│   │   └── baseUrl.ts        API_BASE_URL from env
│   ├── query/
│   │   ├── stocks.ts         useStockFinancialsQuery, useStockFullProfile, useStocksPortfolioQuery, usePortfolioAnalyticsQuery
│   │   └── emailIntegration.ts  useEmailIntegrationStatusQuery, etc.
│   ├── mutations/
│   │   ├── stocks.ts         Stock transaction mutations
│   │   └── emailIntegration.ts  useEmailSyncMutation, useEmailResetSyncMutation, etc.
│   └── dataInterface.ts      ALL TypeScript interfaces:
│       ├── StockFinancials — price, summaryDetail, defaultKeyStatistics, financialData, earningsTrend
│       └── Others: CryptoTransaction, MutualFundInfo, ExpenseTransaction, etc.
├── components/
│   ├── custom/
│   │   ├── SummaryStatCard.tsx
│   │   ├── PerformerStatCard.tsx
│   │   ├── TransactionsTable.tsx
│   │   ├── FilterDrawer.tsx
│   │   └── Tabs.tsx
│   └── ui/                   shadcn/ui components
├── store/
│   └── useAppStore.ts        Zustand: { user, theme, filters, tempFilters }
└── utils/
    ├── portfolioCalculations.ts  Shared calc functions (MF, EPF) — source of truth
    ├── xirr.ts               XIRR via newton-raphson-method
    ├── numbers.ts            formatCurrency, formatToPercentage, formatToTwoDecimals
    ├── chartHelpers.ts       Highcharts helpers
    └── text.ts               getProfitLossColor, etc.
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
    └── encryption.ts     AES-256-GCM encrypt/decrypt for PAN and refresh tokens
```

### All API Route Prefixes

| Prefix | Domain |
|---|---|
| `/api/auth` | Login, signup |
| `/api/stocks` | Stock transactions + NSE quotes + Yahoo Finance search + financials + portfolio analytics |
| `/api/gold` | Gold transactions + SafeGold rates |
| `/api/crypto` | Crypto transactions + CoinDCX prices + candle data |
| `/api/mutual-funds` | MF transactions |
| `/api/funds` | MF info (scheme numbers) + batch NAV history |
| `/api/epf` | EPF accounts + timeline |
| `/api/fixed-deposit` | FD management |
| `/api/recurring-deposit` | RD management |
| `/api/expenses` | Recurring expense categories |
| `/api/expense-transactions` | Daily expense log |
| `/api/goals` | Investment goals |
| `/api/targets` | Asset allocation targets |
| `/api/inflation` | Inflation rate data |
| `/api/ingest` | SMS-based transaction ingestion |
| `/api/email-integration` | Email import (Gmail OAuth, CDSL eCAS + SafeGold PDF parsing) |
| `/api` (verify) | Token verification |

---

## Authentication Pattern

- JWT stored in **httpOnly cookie** (set by backend on login)
- All frontend fetch calls use `credentials: 'include'`
- Backend middleware `authenticateToken` (in `middleware/jwt.ts`) extracts `req.user = { name, email, userId }`
- On 401 response, `apiRequest()` clears localStorage and redirects to `/`
- All protected routes use `authenticateToken` middleware

---

## TanStack Query Conventions

Every query hook lives in `frontend/src/api/query/`. Conventions:

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

| Calculation | Location | Notes |
|---|---|---|
| Portfolio grouping (by symbol/name) | Frontend useMemo | After fetching transactions |
| P/L, P/L% | Frontend useMemo | After combining transactions + live prices |
| XIRR | Frontend useMemo (`utils/xirr.ts`) | Uses newton-raphson-method library |
| Compound interest (FD/RD/EPF) | Frontend useMemo | No external data needed |
| MF NAV-based valuation | Frontend useMemo (`utils/portfolioCalculations.ts`) | After batch NAV fetch |
| Monthly investment aggregation (expenses dashboard) | Frontend useMemo (`useDashboardData.ts`) | Filters all transaction arrays by date range |
| Savings rate, discretionary spending | Frontend useMemo | Derived from salary history + investments + expenses |
| Chart series construction | Frontend useMemo | Highcharts options built in useMemo, theme-aware |
| Metric verdicts (stock detail) | Frontend function | `getVerdict(metric, value)` in `verdicts.ts` — qualitative interpretation of metric values |
| Live calculations (stock detail) | Frontend function | `getMetricCalculation(metricLabel, financials)` in `verdicts.ts` — computes + formats calculation data for drawer |
| NSE quote fetching | Backend service | `stocksService.ts` calls Yahoo Finance, 300ms delay between requests |
| Stock financials (detail page) | Backend service | `stocksService.fetchFinancials(symbol)` fetches price, summaryDetail, defaultKeyStatistics, financialData, earningsTrend independently |
| CoinDCX price fetching | Backend service | `coindcxService.ts` |
| SafeGold rate fetching | Backend controller | Calls SafeGold API |

---

## Key Domain Concepts

### Expenses (two separate concepts — do not confuse)
- **`/api/expenses`** → Recurring expense categories (rent, insurance, subscriptions). These are static entries with a `frequency` field (`one-time | daily | weekly | monthly | yearly`). Used in the financial dashboard to compute monthly expense burden.
- **`/api/expense-transactions`** → Daily expense log (individual purchases). Used in the Tracker tab. Has `date`, `name`, `amount`, `category`.

### Transactions (credit/debit pattern)
All asset transactions use `type: 'credit' | 'debit'`. Credits = buy/receive, Debits = sell/withdraw. Portfolio calculations always handle both:
```typescript
totalUnits = txs.reduce((sum, tx) => sum + (tx.type === 'credit' ? tx.numOfUnits : -tx.numOfUnits), 0)
```

### Salary history
`UserProfile` has both `salaryHistory[]` (base salary effective dates) and `paymentHistory[]` (actual monthly payments with bonus/arrears). `useDashboardData` resolves the correct salary for any given month via `getSalaryForMonth()` and `getPaymentForMonth()`.

### UserProfile — sensitive fields
`UserProfile` includes `phone` (stored as plaintext) and `panNumber` (stored AES-256-GCM encrypted in DB; returned masked to the frontend — only the last 4 characters are revealed). The profile page exposes a show/hide toggle for the PAN field.

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
Defined in `frontend/src/app/expenses/types.ts`: `['Rent', 'Insurance', 'Bills & Utilities']`. Expenses with these tags are counted as `fixedExpenses`; all others are `variableExpenses`.

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

| API | Via | Rate limiting |
|---|---|---|
| Yahoo Finance | Backend (`stocksService.ts`) | 300ms delay between symbol requests |
| MFAPI (NAV history) | Frontend direct (batch POST via backend route) | Batch endpoint fetches all schemes in parallel |
| SafeGold | Backend controller | Date-range based |
| CoinDCX | Backend (`coindcxService.ts`) | POST with coin names array |
| Gmail API | Backend (`gmailService.ts`) | Paginated fetch; incremental sync via `afterDate` |

---

## Important Patterns & Gotchas

1. **All pages are `'use client'`** — there is no server-side rendering of data pages. Next.js is used purely for routing and layout.

2. **401 = global logout** — `apiRequest()` auto-redirects to `/` on any 401. No per-query error handling needed for auth.

3. **Chart options are theme-aware** — every `useMemo` that builds Highcharts options takes `theme` from `useAppStore` as a dependency. `textColor` switches between `'#fff'` (dark) and `'#18181b'` (light). Always include `theme` in the dependency array.

4. **`portfolioCalculations.ts` is the shared calculation source of truth** — both the home dashboard and individual portfolio pages import from here. Don't duplicate calculation logic in page files.

5. **MF requires two-step data fetch** — you cannot fetch NAV history without scheme numbers, and scheme numbers come from the MF info endpoint. This creates an unavoidable dependent query chain.

6. **Gold rates require a date range** — `useSafeGoldRatesQuery` takes `startDate` and `endDate`. On the home page, this is derived from the earliest gold transaction date.

7. **Crypto coin symbols vs names** — `CryptoTransaction` has both `coinName` (e.g., "Bitcoin") and `coinSymbol` (e.g., "BTC"). CoinDCX price API uses the symbol. Filter out coins with zero net quantity before making the price call.

8. **The expenses dashboard applies current expense list to all past months** — `useDashboardData.ts` has a known limitation where recurring expenses don't have historical effective dates, so they're applied uniformly across the 12-month window.

9. **CORS origins are hardcoded in `server.ts`** — `localhost:3000`, `localhost:5000`, and the production domain. Add new origins there.

10. **`apiRequest()` is the only HTTP client** — don't use axios or raw fetch in new code. All API calls go through `apiRequest()` from `@/api/configs`.

11. **Email import is on-demand only** — there is no background cron. The user manually triggers a sync from the Integrations page. After the first sync, `lastSyncAt` is set and subsequent syncs only fetch emails received after that timestamp (incremental sync). A "Full re-sync" button resets `lastSyncAt` to null to force a complete history fetch.

12. **CDSL eCAS parsing limitation** — only MF transactions are extracted from CDSL CAS PDFs. The equity holdings section is a point-in-time snapshot with no historical buy/sell data, so it is intentionally skipped.

13. **SafeGold PDF parsing rules** — only rows with transaction type "Purchased" or "Sold" are imported. Lease, TDS, and rental income rows are skipped. Parser is in `backend/src/services/safegoldParser.ts`.

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
