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

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const NSE_SESSION_START_HOUR = 9;
const NSE_SESSION_END_HOUR = 16;

interface YahooCloseResult {
  timestamp?: number[];
  indicators?: { quote?: { close?: (number | null)[] }[] };
}

function istDay(timeMs: number): string {
  return new Date(timeMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function closePriceSeries(
  result: YahooCloseResult | undefined,
  latestSessionOnly: boolean
): ValuePoint[] {
  if (!result) return [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const points = (result.timestamp ?? []).flatMap((timestamp, index) => {
    const close = closes[index];
    const timeMs = timestamp * MS_PER_SECOND;
    if (close == null) return [];
    if (latestSessionOnly) {
      const istHour = new Date(timeMs + IST_OFFSET_MS).getUTCHours();
      if (istHour < NSE_SESSION_START_HOUR || istHour >= NSE_SESSION_END_HOUR) return [];
    }
    return [{ x: timeMs, y: close }];
  });
  if (!latestSessionOnly || !points.length) return points;
  const latestDay = istDay(points[points.length - 1].x);
  return points.filter((point) => istDay(point.x) === latestDay);
}
