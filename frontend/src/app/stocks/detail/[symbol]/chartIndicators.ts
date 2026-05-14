export type OHLCPoint = [number, number, number, number, number]; // [time, o, h, l, c]
export type Point = [number, number]; // [time, value]
export type VolPoint = [number, number]; // [time, volume]
export type BandPoint = [number, number, number]; // [time, lower, upper]

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function computeSMA(ohlc: OHLCPoint[], period: number): Point[] {
  if (ohlc.length < period) return [];
  const out: Point[] = [];
  let sum = 0;
  for (let i = 0; i < ohlc.length; i++) {
    sum += ohlc[i][4];
    if (i >= period) sum -= ohlc[i - period][4];
    if (i >= period - 1) out.push([ohlc[i][0], sum / period]);
  }
  return out;
}

export function computeEMA(ohlc: OHLCPoint[], period: number): Point[] {
  if (ohlc.length < period) return [];
  const out: Point[] = [];
  const alpha = 2 / (period + 1);

  // Seed EMA with SMA of first `period` closes — standard practice.
  let seedSum = 0;
  for (let i = 0; i < period; i++) seedSum += ohlc[i][4];
  let ema = seedSum / period;
  out.push([ohlc[period - 1][0], ema]);

  for (let i = period; i < ohlc.length; i++) {
    ema = alpha * ohlc[i][4] + (1 - alpha) * ema;
    out.push([ohlc[i][0], ema]);
  }
  return out;
}

export function computeVolSMA(vol: VolPoint[], period: number): Point[] {
  if (vol.length < period) return [];
  const out: Point[] = [];
  let sum = 0;
  for (let i = 0; i < vol.length; i++) {
    sum += vol[i][1];
    if (i >= period) sum -= vol[i - period][1];
    if (i >= period - 1) out.push([vol[i][0], sum / period]);
  }
  return out;
}

export interface BollingerResult {
  middle: Point[];
  band: BandPoint[]; // [time, lower, upper] for arearange series
}

export function computeBollinger(
  ohlc: OHLCPoint[],
  period = 20,
  stdDevMultiplier = 2
): BollingerResult {
  if (ohlc.length < period) return { middle: [], band: [] };
  const middle: Point[] = [];
  const band: BandPoint[] = [];

  for (let i = period - 1; i < ohlc.length; i++) {
    let sum = 0;
    for (let k = i - period + 1; k <= i; k++) sum += ohlc[k][4];
    const mean = sum / period;

    let varSum = 0;
    for (let k = i - period + 1; k <= i; k++) {
      const d = ohlc[k][4] - mean;
      varSum += d * d;
    }
    const stdDev = Math.sqrt(varSum / period);

    const t = ohlc[i][0];
    middle.push([t, mean]);
    band.push([t, mean - stdDevMultiplier * stdDev, mean + stdDevMultiplier * stdDev]);
  }
  return { middle, band };
}

export function computeVWAP(ohlc: OHLCPoint[], volumes: VolPoint[], intraday: boolean): Point[] {
  const volMap = new Map(volumes);
  let cumPV = 0;
  let cumV = 0;
  let currentDay = '';
  const out: Point[] = [];
  for (const [t, , h, l, c] of ohlc) {
    const v = volMap.get(t) ?? 0;
    if (intraday) {
      const day = new Date(t + IST_OFFSET_MS).toISOString().slice(0, 10);
      if (day !== currentDay) {
        cumPV = 0;
        cumV = 0;
        currentDay = day;
      }
    }
    const typical = (h + l + c) / 3;
    cumPV += typical * v;
    cumV += v;
    if (cumV > 0) out.push([t, cumPV / cumV]);
  }
  return out;
}
