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
}

export interface ExpensePayload {
  tag: string;
  expenseAmount: number;
  expenseName: string;
  expenseFrequency: string;
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
  platform?: string;
  recurringDepositName: string;
  rateOfInterest: number;
}

export interface RecurringDepositPayload {
  dateOfCreation: string;
  dateOfMaturity: string;
  amountInvested: number;
  platform?: string;
  recurringDepositName: string;
  rateOfInterest: number;
}

export interface SafeGoldRate {
  date: string;
  rate: string;
}

export interface SafeGoldRatesResponse {
  data: SafeGoldRate[];
  params: {
    start_date: string;
    end_date: string;
    frequency: string;
  };
}

export interface SingleExpenseResponse {
  success: boolean;
  data: Expense;
}

export interface StockData {
  chart: Chart;
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

export interface User {
  name: string | null;
  email: string | null;
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
  dob: string;
  joined: string;
  monthlySalary: number;
  session: {
    loginTime: Date | null;
    expiry: Date | null;
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
