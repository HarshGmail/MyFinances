import { OHLCPoint, VolPoint, IST_OFFSET_MS } from './chartIndicators';

export interface YahooChartResult {
  meta?: Record<string, unknown>;
  timestamp?: number[];
  indicators?: {
    quote?: {
      open?: (number | null)[];
      high?: (number | null)[];
      low?: (number | null)[];
      close?: (number | null)[];
      volume?: (number | null)[];
    }[];
  };
  events?: {
    dividends?: Record<string, unknown>;
    splits?: Record<string, unknown>;
    earnings?: Record<string, unknown>;
  };
}

export interface ChartData {
  ohlc: OHLCPoint[];
  vol: VolPoint[];
  meta: Record<string, unknown>;
  events: NonNullable<YahooChartResult['events']>;
}

/**
 * Transform raw Yahoo chart payload into OHLC + volume arrays.
 * For 1D intraday, filters to Indian market hours (09:00–16:00 IST) and
 * keeps only the latest trading day.
 */
export function extractChartData(
  result: YahooChartResult | undefined,
  onlyIntraday: boolean
): ChartData | null {
  if (!result) return null;

  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const opens = quote.open ?? [];
  const highs = quote.high ?? [];
  const lows = quote.low ?? [];
  const closes = quote.close ?? [];
  const volumes = quote.volume ?? [];
  const meta = result.meta ?? {};
  const events = result.events ?? {};

  const ohlcAll: OHLCPoint[] = [];
  const volAll: VolPoint[] = [];

  timestamps.forEach((ts, i) => {
    const o = opens[i];
    const h = highs[i];
    const l = lows[i];
    const c = closes[i];
    const v = volumes[i];
    if (o == null || h == null || l == null || c == null) return;

    const timeMs = ts * 1000;
    if (onlyIntraday) {
      const istHour = new Date(timeMs + IST_OFFSET_MS).getUTCHours();
      if (istHour < 9 || istHour >= 16) return;
    }

    ohlcAll.push([timeMs, o, h, l, c]);
    if (v != null) volAll.push([timeMs, v]);
  });

  let ohlc = ohlcAll;
  let vol = volAll;
  if (onlyIntraday && ohlcAll.length > 0) {
    const latestDateStr = new Date(ohlcAll[ohlcAll.length - 1][0] + IST_OFFSET_MS)
      .toISOString()
      .slice(0, 10);
    const sameDay = (t: number) =>
      new Date(t + IST_OFFSET_MS).toISOString().slice(0, 10) === latestDateStr;
    ohlc = ohlcAll.filter(([t]) => sameDay(t));
    vol = volAll.filter(([t]) => sameDay(t));
  }

  if (ohlc.length === 0) return null;
  return { ohlc, vol, meta, events };
}

export interface FlagPoint {
  x: number;
  title: string;
  text: string;
}

export interface EventFlags {
  dividends: FlagPoint[];
  splits: FlagPoint[];
  earnings: FlagPoint[];
}

function buildFlagSet(
  obj: Record<string, unknown> | undefined,
  minT: number,
  maxT: number,
  title: string,
  text: (item: Record<string, unknown>) => string
): FlagPoint[] {
  if (!obj) return [];
  return Object.values(obj)
    .map((raw) => {
      const item = raw as Record<string, unknown>;
      const date = typeof item.date === 'number' ? (item.date as number) * 1000 : null;
      if (date == null || date < minT || date > maxT) return null;
      return { x: date, title, text: text(item) };
    })
    .filter((p): p is FlagPoint => p != null);
}

export function buildEventFlags(
  events: NonNullable<YahooChartResult['events']>,
  ohlc: OHLCPoint[]
): EventFlags {
  const minT = ohlc[0][0];
  const maxT = ohlc[ohlc.length - 1][0];

  return {
    dividends: buildFlagSet(
      events.dividends,
      minT,
      maxT,
      'D',
      (item) => `Dividend ₹${(item.amount as number)?.toFixed?.(2) ?? item.amount}`
    ),
    splits: buildFlagSet(
      events.splits,
      minT,
      maxT,
      'S',
      (item) => `Split ${item.splitRatio ?? `${item.numerator}:${item.denominator}`}`
    ),
    earnings: buildFlagSet(events.earnings, minT, maxT, 'E', () => 'Earnings'),
  };
}

/**
 * Colour each volume bar by whether its close was higher or lower than the
 * previous bar's close. Returns shaped series points ready for Highcharts.
 */
export function buildVolumeSeriesData(
  ohlc: OHLCPoint[],
  vol: VolPoint[],
  isDark: boolean
): { x: number; y: number; color: string }[] {
  const closeAt = new Map(ohlc.map((p) => [p[0], p[4]]));
  const fallback = isDark ? '#4b5563' : '#9ca3af';
  const upColor = '#16a34a';
  const downColor = '#dc2626';

  return vol.map(([t, v], i) => {
    const thisClose = closeAt.get(t);
    const prevClose = i > 0 ? closeAt.get(vol[i - 1][0]) : thisClose;
    let color = fallback;
    if (thisClose != null && prevClose != null) {
      color = thisClose >= prevClose ? upColor : downColor;
    }
    return { x: t, y: v, color };
  });
}
