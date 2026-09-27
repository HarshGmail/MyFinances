import { StockData, StocksPortfolioItem } from '../types';

const MS_PER_SECOND = 1000;

export interface ValuePoint {
  x: number;
  y: number;
}

export function combinedStockValueSeries(
  holdings: StocksPortfolioItem[],
  priceData: Record<string, StockData>,
  sinceMs: number
): ValuePoint[] {
  const combined = new Map<number, number>();
  holdings.forEach((stock) => {
    const result = priceData[stock.stockName]?.chart?.result?.[0];
    if (!result) return;
    const timestamps: number[] = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    timestamps.forEach((timestamp, index) => {
      const closePrice = closes[index];
      const timeMs = timestamp * MS_PER_SECOND;
      if (!closePrice || timeMs < sinceMs) return;
      combined.set(timeMs, (combined.get(timeMs) ?? 0) + closePrice * stock.numOfShares);
    });
  });
  return Array.from(combined.entries())
    .sort(([a], [b]) => a - b)
    .map(([x, y]) => ({ x, y }));
}
