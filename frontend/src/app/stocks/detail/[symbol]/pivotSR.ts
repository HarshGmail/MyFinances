import { OHLCPoint } from './chartIndicators';

export interface SRLevel {
  /** Average price of the cluster — where the line is drawn. */
  price: number;
  /** Current role: support if price is below current close, resistance if above. */
  type: 'support' | 'resistance';
  /** Number of pivots in this cluster — proxy for level strength. */
  touches: number;
  /**
   * True if price has decisively traded on the *opposite* side of this level
   * for at least `breakConfirmBars` consecutive closes — meaning the level
   * has flipped roles at some point (broken support → resistance, etc.).
   */
  hasReversed: boolean;
}

export interface SROptions {
  /** Pivot detection window. A bar is a pivot if it's the strict extreme over ±window bars. */
  window?: number;
  /** Cluster tolerance as percentage of price (e.g. 0.5 = 0.5%). */
  clusterTolerancePct?: number;
  /** Minimum pivots in a cluster for the level to be kept. */
  minTouches?: number;
  /** Maximum number of levels to return (top-N by strength). */
  maxLines?: number;
  /** Consecutive closes on the opposite side required to confirm a role reversal. */
  breakConfirmBars?: number;
}

interface Pivot {
  index: number;
  price: number;
}

function findPivots(ohlc: OHLCPoint[], window: number): Pivot[] {
  const pivots: Pivot[] = [];
  for (let i = window; i < ohlc.length - window; i++) {
    const high = ohlc[i][2];
    const low = ohlc[i][3];

    let isPivotHigh = true;
    let isPivotLow = true;
    for (let k = i - window; k <= i + window; k++) {
      if (k === i) continue;
      if (ohlc[k][2] >= high) isPivotHigh = false;
      if (ohlc[k][3] <= low) isPivotLow = false;
      if (!isPivotHigh && !isPivotLow) break;
    }
    if (isPivotHigh) pivots.push({ index: i, price: high });
    if (isPivotLow) pivots.push({ index: i, price: low });
  }
  return pivots;
}

interface Cluster {
  members: Pivot[];
  meanPrice: number;
}

interface AutoSRParams {
  window: number;
  tolerance: number;
  minTouches: number;
  /**
   * Minimum % separation between any two final levels. Two clusters that
   * survive merging but fall within this gap will trigger non-maximum
   * suppression — the weaker (fewer touches) is dropped. Roughly 2-3×
   * `tolerance`; merging fuses adjacent clusters, NMS prunes visually
   * stacked ones at slightly larger gaps.
   */
  minSeparation: number;
}

/**
 * Pivot/clustering parameters have to scale with bar count. Switching from
 * 1Y daily (~250 bars) to 1Y hourly (~1600 bars) ~6× the pivots; with fixed
 * params, dozens of tight clusters all qualify and the chart fills with
 * stacked near-identical lines. Wider window = more selective pivots,
 * larger tolerance = more aggressive merging, higher minTouches = stronger
 * levels only, larger minSeparation = visual breathing room between zones.
 */
function autoSRParams(N: number): AutoSRParams {
  if (N <= 200) return { window: 5, tolerance: 0.5, minTouches: 2, minSeparation: 1.5 };
  if (N <= 500) return { window: 8, tolerance: 0.8, minTouches: 3, minSeparation: 2.0 };
  if (N <= 1000) return { window: 12, tolerance: 1.0, minTouches: 3, minSeparation: 2.5 };
  if (N <= 2000) return { window: 18, tolerance: 1.5, minTouches: 4, minSeparation: 3.5 };
  return { window: 25, tolerance: 2.0, minTouches: 5, minSeparation: 4.5 };
}

/**
 * Non-maximum suppression: walk levels strongest-first, drop any that fall
 * within `minSeparationPct` of an already-kept level. Clustering merges
 * pivots that overlap in price; this prunes nearby clusters that survive
 * separately but visually stack on the chart.
 */
function suppressNearby(levels: SRLevel[], minSeparationPct: number): SRLevel[] {
  const kept: SRLevel[] = [];
  for (const lvl of levels) {
    const tooClose = kept.some(
      (k) => (Math.abs(lvl.price - k.price) / k.price) * 100 < minSeparationPct
    );
    if (!tooClose) kept.push(lvl);
  }
  return kept;
}

/**
 * Greedy clustering walks pivots in price order, so the running mean can
 * drift and split what should be one zone into several adjacent clusters.
 * After filtering by touches, do a final merge pass: any two surviving
 * clusters within `tolerancePct` collapse into one.
 */
function mergeNearbyClusters(clusters: Cluster[], tolerancePct: number): Cluster[] {
  if (clusters.length <= 1) return clusters;
  const sorted = [...clusters].sort((a, b) => a.meanPrice - b.meanPrice);
  const merged: Cluster[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const cur = sorted[i];
    const distPct = (Math.abs(cur.meanPrice - last.meanPrice) / last.meanPrice) * 100;
    if (distPct <= tolerancePct) {
      const allMembers = [...last.members, ...cur.members];
      const meanPrice = allMembers.reduce((s, p) => s + p.price, 0) / allMembers.length;
      merged[merged.length - 1] = { members: allMembers, meanPrice };
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

function clusterPivots(pivots: Pivot[], tolerancePct: number): Cluster[] {
  if (pivots.length === 0) return [];

  // Sort by price ascending; greedy single-pass grouping by proximity to
  // the running cluster mean.
  const sorted = [...pivots].sort((a, b) => a.price - b.price);
  const clusters: Cluster[] = [];
  let current: Pivot[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const pivot = sorted[i];
    const mean = current.reduce((s, p) => s + p.price, 0) / current.length;
    const distancePct = Math.abs(pivot.price - mean) / mean;

    if (distancePct * 100 <= tolerancePct) {
      current.push(pivot);
    } else {
      clusters.push({
        members: current,
        meanPrice: mean,
      });
      current = [pivot];
    }
  }
  // Flush the final cluster.
  const finalMean = current.reduce((s, p) => s + p.price, 0) / current.length;
  clusters.push({ members: current, meanPrice: finalMean });

  return clusters;
}

function hasRoleReversed(
  ohlc: OHLCPoint[],
  levelPrice: number,
  currentSide: 'above' | 'below',
  breakConfirmBars: number
): boolean {
  // Look for a run of consecutive closes on the *opposite* side of the level
  // from the current price — that's what role-reversal requires.
  const oppositeIsAbove = currentSide === 'below';
  let run = 0;
  for (let i = 0; i < ohlc.length; i++) {
    const close = ohlc[i][4];
    const onOpposite = oppositeIsAbove ? close > levelPrice : close < levelPrice;
    if (onOpposite) {
      run++;
      if (run >= breakConfirmBars) return true;
    } else {
      run = 0;
    }
  }
  return false;
}

/**
 * Compute the most meaningful support/resistance levels for the given OHLC
 * series. Pure function; no side effects.
 *
 *  1. Find pivot highs/lows over a ±N bar window.
 *  2. Cluster nearby pivots (within `clusterTolerancePct` of price).
 *  3. Drop clusters with too few touches.
 *  4. Classify each cluster as support or resistance based on current price.
 *  5. Tag clusters whose role has flipped at some point.
 *  6. Sort by touch count, return top-N.
 */
export function computeSupportResistance(ohlc: OHLCPoint[], options: SROptions = {}): SRLevel[] {
  const auto = autoSRParams(ohlc.length);
  const window = options.window ?? auto.window;
  const clusterTolerancePct = options.clusterTolerancePct ?? auto.tolerance;
  const minTouches = options.minTouches ?? auto.minTouches;
  const maxLines = options.maxLines ?? 8;
  const breakConfirmBars = options.breakConfirmBars ?? 2;

  if (ohlc.length < window * 2 + 5) return [];

  const pivots = findPivots(ohlc, window);
  if (pivots.length === 0) return [];

  const rawClusters = clusterPivots(pivots, clusterTolerancePct);
  const clusters = mergeNearbyClusters(rawClusters, clusterTolerancePct);
  const currentClose = ohlc[ohlc.length - 1][4];

  const levels: SRLevel[] = clusters
    .filter((c) => c.members.length >= minTouches)
    .map((c) => {
      const isSupport = currentClose >= c.meanPrice;
      const currentSide: 'above' | 'below' = isSupport ? 'above' : 'below';
      return {
        price: c.meanPrice,
        type: isSupport ? 'support' : 'resistance',
        touches: c.members.length,
        hasReversed: hasRoleReversed(ohlc, c.meanPrice, currentSide, breakConfirmBars),
      } as SRLevel;
    });

  levels.sort((a, b) => b.touches - a.touches);
  const pruned = suppressNearby(levels, auto.minSeparation);
  return pruned.slice(0, maxLines);
}
