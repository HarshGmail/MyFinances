export interface PiPPreferences {
  selectedCoins: string[];
  selectedMutualFunds: string[];
  selectedStocks: string[];
  showPortfolioSummary: boolean;
  includeGold: boolean;
  showGoldMetrics: boolean;
  showMfMetrics: boolean;
}

export interface OwnedCoin {
  symbol: string;
  name: string;
  units: number;
  invested: number;
}

export interface OwnedMutualFund {
  fundName: string;
  schemeNumber: number | null;
  totalUnits: number;
  totalInvested: number;
}

export interface OwnedStock {
  symbol: string;
  shares: number;
}

export interface StockDetails {
  symbol: string;
  isOwned: boolean;
  shares?: number;
  currentPrice: number | null;
  currentValue?: number | null;
}

export interface GoldPortfolioData {
  totalGold: number;
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  currentGoldRate: number;
}

export interface CoinDetails {
  symbol: string;
  name: string;
  isOwned: boolean;
  units?: number;
  invested?: number;
  currentPrice: number;
  currentValue?: number;
  profitLoss?: number;
  profitLossPercentage?: number;
}

export interface MutualFundPortfolioData {
  fundName: string;
  schemeNumber: number | null;
  totalUnits: number;
  totalInvested: number;
  currentNav: number | null;
  currentValue: number | null;
  profitLoss: number | null;
  profitLossPercentage: number | null;
}

export interface PortfolioMetrics {
  totalInvested: number;
  totalCurrentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}
