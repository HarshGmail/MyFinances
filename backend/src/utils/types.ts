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
  isYahooFinance: boolean;
}
export interface TradingPeriod {
  timezone: string;
  start: number;
  end: number;
  gmtoffset: number;
}

export interface CurrentTradingPeriod {
  pre: TradingPeriod;
  regular: TradingPeriod;
  post: TradingPeriod;
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

export interface Quote {
  open: number[];
  volume: number[];
  close: number[];
  low: number[];
  high: number[];
}

export interface AdjClose {
  adjclose: number[];
}

export interface Indicators {
  quote: Quote[];
  adjclose: AdjClose[];
}

export interface ChartResult {
  meta: StockMeta;
  timestamp: number[];
  indicators: Indicators;
}

export interface ChartError {
  code: string;
  description: string;
}

export interface Chart {
  result: ChartResult[];
  error: ChartError | null;
}

export interface StockData {
  chart: Chart;
}

export interface FinancialsAtomicStructure {
  raw?: string | number | null;
  fmt?: string | number | null;
  longFmt?: string | number | null;
}

export interface IncomeStatement {
  maxAge: number;
  endDate: FinancialsAtomicStructure;
  totalRevenue?: FinancialsAtomicStructure;
  costOfRevenue?: FinancialsAtomicStructure;
  grossProfit?: FinancialsAtomicStructure;
  researchDevelopment?: FinancialsAtomicStructure;
  sellingGeneralAdministrative?: FinancialsAtomicStructure;
  nonRecurring?: FinancialsAtomicStructure;
  otherOperatingExpenses?: FinancialsAtomicStructure;
  totalOperatingExpenses?: FinancialsAtomicStructure;
  operatingIncome?: FinancialsAtomicStructure;
  totalOtherIncomeExpenseNet?: FinancialsAtomicStructure;
  ebit?: FinancialsAtomicStructure;
  interestExpense?: FinancialsAtomicStructure;
  incomeBeforeTax?: FinancialsAtomicStructure;
  incomeTaxExpense?: FinancialsAtomicStructure;
  minorityInterest?: FinancialsAtomicStructure;
  netIncomeFromContinuingOps?: FinancialsAtomicStructure;
  discontinuedOperations?: FinancialsAtomicStructure;
  extraordinaryItems?: FinancialsAtomicStructure;
  effectOfAccountingCharges?: FinancialsAtomicStructure;
  otherItems?: FinancialsAtomicStructure;
  netIncome?: FinancialsAtomicStructure;
  netIncomeApplicableToCommonShares?: FinancialsAtomicStructure;
}

export interface IncomeStatementHistoryQuarterly {
  incomeStatementHistory: IncomeStatement[];
  maxAge: number;
}

export interface IncomeStatementHistory {
  incomeStatementHistory: IncomeStatement[];
  maxAge: number;
}

export interface CashFlowStatement {
  maxAge: number;
  endDate: FinancialsAtomicStructure;
  netIncome?: FinancialsAtomicStructure;
}

export interface CashFlowStatementHistory {
  cashflowStatements: CashFlowStatement[];
  maxAge: number;
}

export interface CashFlowStatementHistoryQuarterly {
  cashflowStatements: CashFlowStatement[];
  maxAge: number;
}

export interface BalanceSheetStatement {
  maxAge: number;
  endDate: FinancialsAtomicStructure;
}

export interface BalanceSheetHistory {
  balanceSheetStatements: BalanceSheetStatement[];
  maxAge: number;
}

export interface BalanceSheetHistoryQuarterly {
  balanceSheetStatements: BalanceSheetStatement[];
  maxAge: number;
}

export interface QuoteSummaryResult {
  incomeStatementHistoryQuarterly: IncomeStatementHistoryQuarterly;
  incomeStatementHistory: IncomeStatementHistory;
  cashflowStatementHistory: CashFlowStatementHistory;
  cashflowStatementHistoryQuarterly: CashFlowStatementHistoryQuarterly;
  balanceSheetHistory: BalanceSheetHistory;
  balanceSheetHistoryQuarterly: BalanceSheetHistoryQuarterly;
}

export interface QuoteSummaryResponse {
  quoteSummary: {
    result: QuoteSummaryResult[];
    error: string | number | null;
  };
}
