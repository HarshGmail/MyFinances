# MyFinance

Personal finance tracker built for Indian investors. Track stocks, mutual funds, gold, crypto, EPF, FD, RD, and expenses — all in one place.

**Live:** https://www.my-finances.site

---

## Features

- **Portfolio tracking** — Stocks, Mutual Funds, Gold, Crypto with live prices and XIRR
- **Fixed income** — EPF, Fixed Deposits, Recurring Deposits with compound interest
- **Expense tracking** — Daily expense log + recurring expenses + savings rate dashboard
- **Investment goals** — Define targets and track progress
- **Email auto-import** — Connect Gmail to auto-import CDSL eCAS (MF transactions) and SafeGold statements
- **Claude AI (MCP)** — Natural language queries and transaction logging via Claude MCP
- **UPI auto-track** — iPhone Shortcut logs UPI payment SMS as expenses automatically

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind, shadcn/ui |
| Charts | Highcharts |
| Data fetching | TanStack Query v5 |
| Backend | Express.js, TypeScript |
| Database | MongoDB |
| Auth | JWT (httpOnly cookies) |
| External APIs | Yahoo Finance, SafeGold, CoinDCX, MFAPI |

---

## Project Structure

```
MyFinance/
├── frontend/     Next.js app (port 3000)
├── backend/      Express API (port 5000)
└── scripts/      Utility scripts
```

---

## Local Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in values
npm run dev
```

Required `.env` variables:

```
PORT=5000
MONGODB_URI=
JWT_SECRET=
ENCRYPTION_KEY=          # 64-char hex — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
GOOGLE_CLIENT_ID=        # Gmail OAuth — from Google Cloud Console
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/api/email-integration/oauth/callback
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

Required `.env.local` variables:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

---

## Email Auto-Import Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → create a project
2. Enable **Gmail API**
3. Create **OAuth 2.0 credentials** (Web application)
4. Add redirect URI: `https://your-backend/api/email-integration/oauth/callback`
5. Add your Gmail as a **test user** (OAuth consent screen → Test users)
6. Fill `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in backend `.env`
7. In the app: Profile → add Phone + PAN → Integrations → Email Import → Connect Gmail

**What gets imported:**
- CDSL eCAS emails (`eCAS@cdslstatement.com`) → Mutual Fund transactions (password = PAN uppercase)
- SafeGold emails (`estatements@safegold.in`) → Gold transactions (password = first 4 letters of name + last 4 digits of phone)

---

## Deployment

- Frontend: Vercel (`www.my-finances.site`)
- Backend: Render (`api.my-finances.site`)
- Database: MongoDB Atlas

---

## API Routes

| Prefix | Domain |
|---|---|
| `/api/auth` | Auth (login, signup, profile) |
| `/api/stocks` | Stock transactions + live quotes |
| `/api/gold` | Gold transactions + SafeGold rates |
| `/api/crypto` | Crypto transactions + CoinDCX prices |
| `/api/mutual-funds` | MF transactions |
| `/api/funds` | MF scheme info + batch NAV history |
| `/api/epf` | EPF accounts |
| `/api/fixed-deposit` | Fixed deposits |
| `/api/recurring-deposit` | Recurring deposits |
| `/api/expenses` | Recurring expense categories |
| `/api/expense-transactions` | Daily expense log |
| `/api/goals` | Investment goals |
| `/api/targets` | Asset allocation targets |
| `/api/email-integration` | Gmail OAuth + email import |
| `/api/ingest` | SMS-based UPI ingestion |
| `/api/chatgpt` | Claude MCP server |
| `/api/capital-gains` | Capital gains calculations |
| `/api/inflation` | Inflation rate data |
