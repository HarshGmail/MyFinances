export interface User {
  name: string | null;
  email: string | null;
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

// Response interfaces for transaction data
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

export interface CoinCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
}

export interface CryptoTransaction {
  id: string;
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

export interface CryptoPortfolioSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
}

export interface CryptoPortfolioResponse {
  data: CryptoPortfolioItem[];
  summary: CryptoPortfolioSummary;
}

// New interface for CoinDCX user balances
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

// Interface for coin prices response
export interface CoinPricesResponse {
  success: boolean;
  message: string;
  data: { [coinName: string]: number | null };
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

export type AddGoalPayload = Omit<UserGoal, '_id' | 'userId'> & { targetAmount?: number };
