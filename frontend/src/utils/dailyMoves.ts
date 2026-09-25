import {
  GoldTransaction,
  MutualFundInfo,
  MutualFundNavHistory,
  MutualFundTransaction,
  SafeGoldRate,
  StocksPortfolioItem,
  CoinTickerChange,
} from '@/api/dataInterface';
import { calcMFPortfolio, MFNavDataMap } from './portfolioCalculations';
import { totalGoldGrams } from './goldCategories';
import { CryptoHolding } from './cryptoHoldings';

export type AssetClass = 'stocks' | 'mutualFunds' | 'gold' | 'crypto';

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  stocks: 'Stocks',
  mutualFunds: 'Mutual Funds',
  gold: 'Gold',
  crypto: 'Crypto',
};

export interface HoldingMove {
  assetClass: AssetClass;
  name: string;
  currentValue: number;
  change: number;
  changePct: number;
}

export interface AssetMove {
  assetClass: AssetClass;
  currentValue: number;
  previousValue: number;
  change: number;
  changePct: number;
  advancers: number;
  decliners: number;
  basisLabel: string;
  holdings: HoldingMove[];
}

export interface PortfolioMove {
  currentValue: number;
  previousValue: number;
  change: number;
  changePct: number;
}

function percentChange(change: number, previousValue: number): number {
  return previousValue > 0 ? (change / previousValue) * 100 : 0;
}

function toHoldingMove(
  assetClass: AssetClass,
  name: string,
  currentValue: number,
  previousValue: number
): HoldingMove {
  const change = currentValue - previousValue;
  return {
    assetClass,
    name,
    currentValue,
    change,
    changePct: percentChange(change, previousValue),
  };
}

function summarise(
  assetClass: AssetClass,
  basisLabel: string,
  holdings: HoldingMove[],
  untrackedValue = 0
): AssetMove {
  const change = holdings.reduce((sum, h) => sum + h.change, 0);
  const trackedValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const trackedPreviousValue = trackedValue - change;
  return {
    assetClass,
    currentValue: trackedValue + untrackedValue,
    previousValue: trackedPreviousValue + untrackedValue,
    change,
    changePct: percentChange(change, trackedPreviousValue),
    advancers: holdings.filter((h) => h.change > 0).length,
    decliners: holdings.filter((h) => h.change < 0).length,
    basisLabel,
    holdings,
  };
}

export function buildStockMove(portfolio: StocksPortfolioItem[], sessionLabel: string): AssetMove {
  const held = portfolio.filter((stock) => stock.numOfShares > 0);
  const priced = held.filter((stock) => stock.isDataAvailable);
  const unpricedValue = held
    .filter((stock) => !stock.isDataAvailable)
    .reduce((sum, stock) => sum + stock.currentValuation, 0);
  const holdings = priced.map((stock) =>
    toHoldingMove(
      'stocks',
      stock.stockName,
      stock.currentValuation,
      stock.currentValuation - stock.oneDayChange
    )
  );
  return summarise('stocks', sessionLabel, holdings, unpricedValue);
}

function parseNavDate(ddmmyyyy: string): number {
  const [day, month, year] = ddmmyyyy.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
}

function formatNavDate(ddmmyyyy: string): string {
  return new Date(parseNavDate(ddmmyyyy)).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function buildMutualFundMove(
  transactions: MutualFundTransaction[],
  mfInfo: MutualFundInfo[],
  recentNavs: MutualFundNavHistory
): AssetMove {
  const navEntries = Object.entries(recentNavs).filter(([, item]) => item?.data?.length);
  const latestNavTime = Math.max(
    ...navEntries.map(([, item]) => parseNavDate(item.data[0].date)),
    0
  );

  const latestMap: MFNavDataMap = {};
  const previousMap: MFNavDataMap = {};
  let latestNavDate = '';
  let previousNavDate = '';
  navEntries.forEach(([schemeNumber, item]) => {
    const [latest, previous] = item.data;
    latestMap[schemeNumber] = { nav: parseFloat(latest.nav), navDate: latest.date };
    const isCurrent = parseNavDate(latest.date) === latestNavTime;
    const baseline = isCurrent && previous ? previous : latest;
    previousMap[schemeNumber] = { nav: parseFloat(baseline.nav), navDate: baseline.date };
    if (isCurrent && previous) {
      latestNavDate = latest.date;
      previousNavDate = previous.date;
    }
  });

  const latestFunds = calcMFPortfolio(transactions, mfInfo, latestMap).fundData;
  const previousFunds = calcMFPortfolio(transactions, mfInfo, previousMap).fundData;
  const previousValueByFund = new Map(previousFunds.map((f) => [f.fundName, f.currentValue]));

  const holdings = latestFunds
    .filter((fund) => fund.totalUnits > 0 && fund.currentValue !== null)
    .map((fund) =>
      toHoldingMove(
        'mutualFunds',
        fund.fundName,
        fund.currentValue ?? 0,
        previousValueByFund.get(fund.fundName) ?? fund.currentValue ?? 0
      )
    );

  const basisLabel = latestNavDate
    ? `NAV ${formatNavDate(latestNavDate)} vs ${formatNavDate(previousNavDate)}`
    : 'Latest NAV';
  return summarise('mutualFunds', basisLabel, holdings);
}

export function buildGoldMove(transactions: GoldTransaction[], rates: SafeGoldRate[]): AssetMove {
  const grams = totalGoldGrams(transactions);
  if (grams <= 0 || !rates.length) return summarise('gold', 'Live vs last close', []);
  const currentRate = parseFloat(rates[rates.length - 1].rate);
  const previousRate = rates.length > 1 ? parseFloat(rates[rates.length - 2].rate) : currentRate;
  const holding = toHoldingMove('gold', 'SafeGold', grams * currentRate, grams * previousRate);
  return summarise('gold', 'Live vs last close', [holding]);
}

export function buildCryptoMove(
  holdings: Record<string, CryptoHolding>,
  tickerChanges: { [coin: string]: CoinTickerChange | null }
): AssetMove {
  const moves = Object.entries(holdings)
    .filter(([symbol, holding]) => holding.units > 0 && tickerChanges[symbol])
    .map(([symbol, holding]) => {
      const { price, changePct24h } = tickerChanges[symbol] as CoinTickerChange;
      const previousPrice = price / (1 + changePct24h / 100);
      return toHoldingMove(
        'crypto',
        holding.coinName || symbol,
        holding.units * price,
        holding.units * previousPrice
      );
    });
  return summarise('crypto', 'Last 24h', moves);
}

export function combineMoves(moves: AssetMove[]): PortfolioMove {
  const currentValue = moves.reduce((sum, m) => sum + m.currentValue, 0);
  const previousValue = moves.reduce((sum, m) => sum + m.previousValue, 0);
  const change = moves.reduce((sum, m) => sum + m.change, 0);
  return { currentValue, previousValue, change, changePct: percentChange(change, previousValue) };
}

export function topMovers(moves: AssetMove[], count = 5) {
  const all = moves.flatMap((m) => m.holdings);
  const gainers = all
    .filter((h) => h.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, count);
  const losers = all
    .filter((h) => h.change < 0)
    .sort((a, b) => a.change - b.change)
    .slice(0, count);
  return { gainers, losers };
}
