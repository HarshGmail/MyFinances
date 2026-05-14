import type { SeriesOptionsType } from 'highcharts/highstock';
import {
  OHLCPoint,
  VolPoint,
  computeSMA,
  computeEMA,
  computeVWAP,
  computeBollinger,
  computeVolSMA,
} from './chartIndicators';
import { OverlayConfig } from './stockDetailStore';
import { EventFlags } from './chartTransforms';

export interface BuildSeriesArgs {
  symbol: string;
  ohlc: OHLCPoint[];
  vol: VolPoint[];
  volumeSeriesData: { x: number; y: number; color: string }[];
  flags: EventFlags;
  overlays: OverlayConfig;
  isIntraday: boolean;
}

const OVERLAY_COLORS = {
  sma20: '#f59e0b',
  sma50: '#8b5cf6',
  ema9: '#f472b6',
  ema21: '#818cf8',
  ema50: '#e879f9',
  vwap: '#06b6d4',
  bollinger: '#14b8a6',
  volSma: '#38bdf8',
};

function lineSeries(
  id: string,
  name: string,
  data: [number, number][],
  color: string,
  opts: Partial<SeriesOptionsType> = {}
): SeriesOptionsType {
  return {
    type: 'line',
    id,
    name,
    data,
    color,
    lineWidth: 2,
    yAxis: 0,
    zIndex: 4,
    marker: { enabled: false },
    enableMouseTracking: true,
    ...opts,
  } as SeriesOptionsType;
}

/**
 * Assemble the full Highcharts series array. Order matters: candlestick first
 * (so overlays draw above it), then overlays, volume, then flags. Each series
 * carries a stable `id` so Highcharts matches updates by id, not by index.
 */
export function buildChartSeries({
  symbol,
  ohlc,
  vol,
  volumeSeriesData,
  flags,
  overlays,
  isIntraday,
}: BuildSeriesArgs): SeriesOptionsType[] {
  const series: SeriesOptionsType[] = [];

  series.push({
    type: 'candlestick',
    id: 'stockPrice',
    name: symbol,
    data: ohlc,
    yAxis: 0,
  } as SeriesOptionsType);

  // Bollinger bands render first among overlays so lines sit over the fill.
  if (overlays.bollinger) {
    const { band } = computeBollinger(ohlc, 20, 2);
    if (band.length) {
      series.push({
        type: 'arearange',
        id: 'bollinger',
        name: 'Bollinger (20, 2σ)',
        data: band,
        color: OVERLAY_COLORS.bollinger,
        fillOpacity: 0.12,
        lineWidth: 1,
        yAxis: 0,
        zIndex: 2,
        marker: { enabled: false },
        enableMouseTracking: false,
      } as SeriesOptionsType);
    }
  }

  if (overlays.sma20) {
    const data = computeSMA(ohlc, 20);
    if (data.length) series.push(lineSeries('sma20', 'SMA 20', data, OVERLAY_COLORS.sma20));
  }
  if (overlays.sma50) {
    const data = computeSMA(ohlc, 50);
    if (data.length) series.push(lineSeries('sma50', 'SMA 50', data, OVERLAY_COLORS.sma50));
  }
  if (overlays.ema9) {
    const data = computeEMA(ohlc, 9);
    if (data.length) series.push(lineSeries('ema9', 'EMA 9', data, OVERLAY_COLORS.ema9));
  }
  if (overlays.ema21) {
    const data = computeEMA(ohlc, 21);
    if (data.length) series.push(lineSeries('ema21', 'EMA 21', data, OVERLAY_COLORS.ema21));
  }
  if (overlays.ema50) {
    const data = computeEMA(ohlc, 50);
    if (data.length) series.push(lineSeries('ema50', 'EMA 50', data, OVERLAY_COLORS.ema50));
  }
  if (overlays.vwap) {
    const data = computeVWAP(ohlc, vol, isIntraday);
    if (data.length)
      series.push(
        lineSeries('vwap', 'VWAP', data, OVERLAY_COLORS.vwap, { dashStyle: 'ShortDash' })
      );
  }

  series.push({
    type: 'column',
    id: 'volume',
    name: 'Volume',
    data: volumeSeriesData,
    yAxis: 1,
  } as SeriesOptionsType);

  if (overlays.volSma) {
    const data = computeVolSMA(vol, 20);
    if (data.length) {
      series.push({
        type: 'line',
        id: 'volSma',
        name: 'Volume SMA 20',
        data,
        color: OVERLAY_COLORS.volSma,
        lineWidth: 1.5,
        yAxis: 1,
        zIndex: 3,
        marker: { enabled: false },
        enableMouseTracking: true,
      } as SeriesOptionsType);
    }
  }

  if (flags.dividends.length) {
    series.push({
      type: 'flags',
      id: 'dividends',
      name: 'Dividends',
      data: flags.dividends,
      onSeries: 'stockPrice',
      shape: 'circlepin',
      width: 16,
      color: '#0ea5e9',
      fillColor: '#0ea5e9',
      style: { color: '#fff' },
    } as SeriesOptionsType);
  }
  if (flags.splits.length) {
    series.push({
      type: 'flags',
      id: 'splits',
      name: 'Splits',
      data: flags.splits,
      onSeries: 'stockPrice',
      shape: 'squarepin',
      width: 16,
      color: '#f97316',
      fillColor: '#f97316',
      style: { color: '#fff' },
    } as SeriesOptionsType);
  }
  if (flags.earnings.length) {
    series.push({
      type: 'flags',
      id: 'earnings',
      name: 'Earnings',
      data: flags.earnings,
      onSeries: 'stockPrice',
      shape: 'flag',
      width: 16,
      color: '#a855f7',
      fillColor: '#a855f7',
      style: { color: '#fff' },
    } as SeriesOptionsType);
  }

  return series;
}
