import type { YAxisPlotLinesOptions } from 'highcharts/highstock';
import { OHLCPoint } from './chartIndicators';
import { computeSupportResistance, SRLevel, SROptions } from './pivotSR';

const SUPPORT_COLOR = '#22c55e'; // green-500
const RESISTANCE_COLOR = '#ef4444'; // red-500
const SUPPORT_COLOR_DIM = '#16a34a'; // green-600 for light theme contrast
const RESISTANCE_COLOR_DIM = '#dc2626';

/** Line width grows with touches but is capped to keep things readable. */
function widthFromTouches(touches: number): number {
  return Math.min(1 + (touches - 2) * 0.4, 3);
}

function levelToPlotLine(level: SRLevel, isDark: boolean): YAxisPlotLinesOptions {
  const isSupport = level.type === 'support';
  const baseColor = isSupport
    ? isDark
      ? SUPPORT_COLOR
      : SUPPORT_COLOR_DIM
    : isDark
      ? RESISTANCE_COLOR
      : RESISTANCE_COLOR_DIM;

  // Solid = level has held throughout. Dashed = level was broken at some
  // point and price now sits on the *opposite* side; classic role-reversal.
  const dashStyle = level.hasReversed ? 'ShortDash' : 'Solid';

  // Add a subtle marker in the label when role-reversed so the meaning is
  // explicit without needing the legend open.
  const prefix = isSupport ? 'S' : 'R';
  const tag = level.hasReversed ? `${prefix}*` : prefix;
  const text = `${tag} · ₹${level.price.toFixed(2)} · ${level.touches}×`;

  return {
    value: level.price,
    color: baseColor,
    dashStyle,
    width: widthFromTouches(level.touches),
    label: {
      text,
      align: 'right',
      x: -8,
      y: -2,
      style: {
        color: baseColor,
        fontSize: '10px',
        fontWeight: '500',
      },
    },
    zIndex: 2,
  };
}

/**
 * Build Highcharts plot-line configs for auto-detected support / resistance
 * levels. Returns an empty array when the dataset is too small or no
 * meaningful clusters were found.
 */
export function buildSRPlotLines(
  ohlc: OHLCPoint[],
  isDark: boolean,
  options?: SROptions
): YAxisPlotLinesOptions[] {
  const levels = computeSupportResistance(ohlc, options);
  return levels.map((l) => levelToPlotLine(l, isDark));
}
