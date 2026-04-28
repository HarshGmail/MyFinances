export type AddGoalPayload = Omit<UserGoal, '_id' | 'userId'> & { targetAmount?: number };

export interface AdjClose {
  adjclose: number[];
}

export interface BulkExpensePayload {
  expenses: ExpensePayload[];
}

export interface Chart {
  result: ChartResult[];
  error: ChartError | null;
}

export interface ChartError {
  code: string;
  description: string;
}

export interface ChartResult {
  meta: StockMeta;
  timestamp: number[];
  indicators: Indicators;
}

export interface CoinCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
}

export interface CoinDCXBalance {
  balance: number;
  locked_balance: number;
  currency: string;
}

export interface CoinDCXUserBalanceResponse {
  success: boolean;
  message: string;
  data: CoinDCXBalance[];
}

export interface CoinPricesResponse {
  success: boolean;
  message: string;
  data: { [coinName: string]: number | null };
}

export interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  is_new: boolean;
  is_active: boolean;
  type: 'coin' | 'token';
}

export interface CryptoPortfolioItem {
  coinName: string;
  totalQuantity: number;
  totalInvested: number;
  avgPurchasePrice: number;
  currentPrice: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  lastUpdated: string;
}

export interface CryptoPortfolioResponse {
  data: CryptoPortfolioItem[];
  summary: CryptoPortfolioSummary;
}

export interface CryptoPortfolioSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
}

export interface CryptoTransaction {
  _id: string;
  type: 'credit' | 'debit';
  date: string;
  coinPrice: number;
  quantity: number;
  amount: number;
  coinName: string;
  coinSymbol: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CurrentTradingPeriod {
  pre: TradingPeriod;
  regular: TradingPeriod;
  post: TradingPeriod;
}

export interface EmailIntegrationStatus {
  connected: boolean;
  accounts: LinkedEmailAccount[];
}

export interface EmailSyncPreview {
  mutualFunds: ParsedMFTransaction[];
  gold: ParsedGoldTransaction[];
  stocks: ParsedEmailStockHolding[];
  crypto: ParsedCryptoEmailTransaction[];
  duplicatesSkipped: number;
  errors: string[];
}

export interface EpfAccount {
  _id: string;
  userId: string;
  organizationName: string;
  epfAmount: number;
  creditDay: number;
  startDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface EpfAccountPayload {
  organizationName: string;
  epfAmount: number;
  creditDay: number;
  startDate: Date;
}

export interface EpfBulkUpdatePayload {
  accounts: Array<{
    organizationName: string;
    epfAmount: number;
    creditDay: number;
    startDate: string;
  }>;
}

export interface EpfParsedSegment {
  organizationName: string;
  epfAmount: number;
  creditDay: number;
  startDate: string;
  alreadyExists: boolean;
}

export interface EpfPassbookParseResult {
  segments: EpfParsedSegment[];
  uan: string;
  establishmentName: string;
}

export interface EpfTimelineSummary {
  totalCurrentBalance: number;
  totalContributions: number;
  totalInterest: number;
  timeline: TimelineRow[];
}

export interface Expense {
  _id: string;
  userId: string;
  tag: string;
  expenseAmount: number;
  expenseName: string;
  expenseFrequency: string;
  isFixed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpensePayload {
  tag: string;
  expenseAmount: number;
  expenseName: string;
  expenseFrequency: string;
  isFixed?: boolean;
}

export interface ExpenseResponse {
  success: boolean;
  data: Expense[];
}

export interface ExpenseSummary {
  totalExpenses: number;
  expensesByTag: Record<string, number>;
  expensesByFrequency: Record<string, number>;
  monthlyRecurring: number;
  yearlyRecurring: number;
}

export interface ExpenseTransaction {
  _id: string;
  userId: string;
  date: string;
  name: string;
  amount: number;
  category: string;
  reason?: string;
  categoryUmbrella?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseTransactionPayload {
  date: string;
  name: string;
  amount: number;
  category: string;
  reason?: string;
  categoryUmbrella?: string;
  notes?: string;
}

export interface FixedDeposit {
  _id: string;
  userId: string;
  dateOfCreation: Date;
  dateOfMaturity: Date;
  amountInvested: number;
  platform?: string;
  fixedDepositName: string;
  rateOfInterest: number;
}

export interface FixedDepositPayload {
  dateOfCreation: string;
  dateOfMaturity: string;
  amountInvested: number;
  platform?: string;
  fixedDepositName: string;
  rateOfInterest: number;
}

export interface GoldTransaction {
  id: string;
  type: 'credit' | 'debit';
  date: string;
  goldPrice: number;
  quantity: number;
  amount: number;
  tax: number;
  platform?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Indicators {
  quote: Quote[];
  adjclose: AdjClose[];
}

export interface InflationResult {
  meta: WorldBankMeta;
  data: WorldBankDataPoint[];
  tidy: Array<{ year: number; value: number | null }>;
  average?: number;
}

export interface LinkedEmailAccount {
  email: string;
  lastSyncAt?: string | null;
  safegoldSender?: string;
}

export interface MonthlyInvestmentSummaryItem {
  monthKey: string; // 'YYYY-MM'
  investments: {
    stocks: number;
    gold: number;
    crypto: number;
    mutualFunds: number;
    rd: number;
  };
  total: number;
}

export interface MonthlyPayment {
  month: string;
  baseAmount: number;
  bonus: number;
  arrears: number;
  totalPaid: number;
  notes?: string;
}

export interface MutualFundInfo {
  _id: string;
  userId?: string;
  date?: string;
  sipAmount?: number;
  goal?: string;
  platform?: string;
  fundName?: string;
  schemeNumber: number;
}

export interface MutualFundMeta {
  fund_house: string;
  scheme_type: string;
  scheme_category: string;
  scheme_code: number;
  scheme_name: string;
  isin_growth: string;
  isin_div_reinvestment: string | null;
}

export interface MutualFundNavHistory {
  [schemeCode: string]: MutualFundNavHistoryItem;
}

export interface MutualFundNavHistoryData {
  date: string;
  nav: string;
}

export interface MutualFundNavHistoryItem {
  meta: MutualFundMeta;
  data: MutualFundNavHistoryData[];
  status: string;
}

export interface MutualFundSearchResponse {
  schemeCode: number;
  schemeName: string | null;
  isinGrowth: string | null;
  isinDivReinvestment: string | null;
}

export interface MutualFundTransaction {
  id: string;
  type: 'credit' | 'debit';
  date: string;
  fundPrice: number;
  numOfUnits: number;
  amount: number;
  fundName: string;
  platform?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ParsedCryptoEmailTransaction {
  coinSymbol: string;
  coinName: string;
  quantity: number;
  coinPrice: number;
  amount: number;
  fees: number;
  date: string;
  type: 'credit' | 'debit';
}

export interface ParsedEmailStockHolding {
  stockName: string;
  numOfShares: number;
  marketPrice: number;
  amount: number;
  date: string;
  type: 'credit';
}

export interface ParsedGoldTransaction {
  date: string;
  goldPrice: number;
  quantity: number;
  amount: number;
  tax: number;
  type: 'credit' | 'debit';
  platform: string;
}

export interface ParsedMFTransaction {
  date: string;
  fundName: string;
  numOfUnits: number;
  fundPrice: number;
  amount: number;
  type: 'credit' | 'debit';
}

export interface Quote {
  open: number[];
  volume: number[];
  close: number[];
  low: number[];
  high: number[];
}

export interface RecurringDeposit {
  _id: string;
  userId: string;
  dateOfCreation: Date;
  dateOfMaturity: Date;
  amountInvested: number;
  monthlyDeposit: number;
  platform?: string;
  recurringDepositName: string;
  rateOfInterest: number;
}

export interface RecurringDepositPayload {
  dateOfCreation: string;
  dateOfMaturity: string;
  amountInvested: number;
  monthlyDeposit: number;
  platform?: string;
  recurringDepositName: string;
  rateOfInterest: number;
}

export interface SafeGoldRate {
  date: string;
  rate: string;
}

export interface SafeGoldRatesResponse {
  success: boolean;
  data: SafeGoldRate[];
}

export interface SalaryRecord {
  baseSalary: number;
  effectiveDate: string;
  notes?: string;
}

export interface SingleExpenseResponse {
  success: boolean;
  data: Expense;
}

export interface StockData {
  chart: Chart;
}

export interface StockFinancials {
  price?: {
    shortName?: string;
    longName?: string;
    regularMarketPrice?: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    regularMarketVolume?: number;
    marketCap?: number;
    marketState?: string;
    currency?: string;
    exchangeName?: string;
  };
  summaryDetail?: {
    trailingPE?: number;
    forwardPE?: number;
    dividendYield?: number;
    dividendRate?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    beta?: number;
    averageVolume?: number;
    priceToSalesTrailing12Months?: number;
  };
  defaultKeyStatistics?: {
    trailingEps?: number;
    forwardEps?: number;
    pegRatio?: number;
    priceToBook?: number;
    enterpriseValue?: number;
    enterpriseToRevenue?: number;
    enterpriseToEbitda?: number;
    shortRatio?: number;
  };
  financialData?: {
    returnOnEquity?: number;
    returnOnAssets?: number;
    grossMargins?: number;
    operatingMargins?: number;
    profitMargins?: number;
    debtToEquity?: number;
    currentRatio?: number;
    revenueGrowth?: number;
    earningsGrowth?: number;
    freeCashflow?: number;
    totalCash?: number;
    totalDebt?: number;
    totalRevenue?: number;
    revenuePerShare?: number;
  };
  earningsTrend?: {
    trend?: Array<{
      period?: string;
      growth?: { raw?: number };
      revenueEstimate?: { growth?: { raw?: number } };
    }>;
  };
}

export interface StockMeta {
  currency: string;
  symbol: string;
  exchangeName: string;
  fullExchangeName: string;
  instrumentType: string;
  firstTradeDate: number;
  regularMarketTime: number;
  hasPrePostMarketData: boolean;
  gmtoffset: number;
  timezone: string;
  exchangeTimezoneName: string;
  regularMarketPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  longName: string;
  shortName: string;
  chartPreviousClose: number;
  priceHint: number;
  currentTradingPeriod: CurrentTradingPeriod;
  dataGranularity: string;
  range: string;
  validRanges: string[];
}

export interface StockSearchResponse {
  exchange: string;
  shortname: string;
  quoteType: string;
  symbol: string;
  index: string;
  score: string;
  typeDisp: string;
  longname: string;
  exchDisp: string;
  sector: string;
  sectorDisp: string;
  industry: string;
  industryDisp: string;
}

export interface StocksPortfolioItem {
  stockName: string;
  numOfShares: number;
  avgPrice: number;
  investedAmount: number;
  currentPrice: number;
  previousClose: number;
  currentValuation: number;
  profitLoss: number;
  profitLossPercentage: number;
  oneDayChange: number;
  oneDayChangePercentage: number;
  isDataAvailable: boolean;
}

export interface StocksPortfolioResponse {
  portfolio: StocksPortfolioItem[];
  priceData: Record<string, StockData>;
  summary: StocksPortfolioSummary;
  transactions: StockTransaction[];
}

export interface StocksPortfolioSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
  totalOneDayChange: number;
  totalOneDayChangePercentage: number;
}

export interface StockTransaction {
  id: string;
  type: 'credit' | 'debit';
  date: string;
  marketPrice: number;
  numOfShares: number;
  amount: number;
  stockName: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SyncJobStatus {
  status: 'processing' | 'done' | 'failed' | 'cancelled';
  result: EmailSyncPreview | null;
  error: string | null;
}

export interface TimelineRow {
  type: 'contribution' | 'interest';
  organization?: string;
  monthlyContribution?: number;
  startDate?: string;
  endDate?: string;
  totalContribution: number;
  financialYear?: string;
  interestCreditDate?: string;
}

export interface TradingPeriod {
  timezone: string;
  start: number;
  end: number;
  gmtoffset: number;
}

export interface UpdateExpensePayload {
  id: string;
  data: Partial<ExpensePayload>;
}

export interface UpdateExpenseTransactionPayload {
  id: string;
  data: Partial<ExpenseTransactionPayload>;
}

export interface User {
  id?: string;
  name: string | null;
  email: string | null;
  isDemo?: boolean;
}

export interface UserGoal {
  _id?: string;
  userId: string;
  goalName: string;
  stockSymbols?: string[];
  mutualFundIds?: string[];
  cryptoCurrency?: string[];
  goldAlloted?: number;
  description?: string;
  targetAmount?: number;
}

export interface UserProfile {
  userName: string;
  userEmail: string;
  dob?: string;
  joined?: string;
  monthlySalary?: number;
  currentBaseSalary?: number | null;
  salaryHistory?: SalaryRecord[];
  paymentHistory?: MonthlyPayment[];
  ingestToken?: string;
  ingestSenderEmail?: string | null;
  phone?: string;
  panNumber?: string; // masked, e.g. "ABCDE****F"
  session?: {
    loginTime: string | null;
    expiry: string | null;
  };
}

export type WorldBankApiResponse = [WorldBankMeta, WorldBankDataPoint[]];

export interface WorldBankCountryRef {
  id: string; // e.g., "IN"
  value: string; // e.g., "India"
}

export interface WorldBankDataPoint {
  indicator: WorldBankIndicatorRef;
  country: WorldBankCountryRef;
  countryiso3code: string; // "IND"
  date: string; // "YYYY"
  value: number | null; // may be null for some years
  unit: string;
  obs_status: string;
  decimal: number;
}

export interface WorldBankIndicatorRef {
  id: string; // e.g., "FP.CPI.TOTL.ZG"
  value: string; // e.g., "Inflation, consumer prices (annual %)"
}

export interface WorldBankMeta {
  page: number;
  pages: number;
  per_page: number;
  total: number;
  sourceid: string;
  lastupdated: string; // ISO date
}
