import Highcharts from 'highcharts/highstock';
import type { YAxisPlotLinesOptions } from 'highcharts/highstock';
import {
  extractChartData,
  buildEventFlags,
  buildVolumeSeriesData,
  YahooChartResult,
} from './chartTransforms';
import { buildChartSeries } from './chartSeries';
import { OverlayConfig } from './stockDetailStore';

export interface BuildChartOptionsArgs {
  result: YahooChartResult | undefined;
  symbol: string;
  overlays: OverlayConfig;
  isIntraday: boolean;
  onlyIntraday: boolean;
  isDark: boolean;
}

function buildPlotLines(
  meta: Record<string, unknown>,
  showDayHL: boolean,
  isDark: boolean
): YAxisPlotLinesOptions[] {
  const lines: YAxisPlotLinesOptions[] = [];
  const fwHigh = meta.fiftyTwoWeekHigh;
  const fwLow = meta.fiftyTwoWeekLow;

  if (typeof fwHigh === 'number') {
    lines.push({
      value: fwHigh,
      color: isDark ? '#6ee7b7' : '#059669',
      dashStyle: 'ShortDash',
      width: 1,
      label: {
        text: `52W High ₹${fwHigh.toFixed(2)}`,
        align: 'right',
        x: -8,
        style: { color: isDark ? '#6ee7b7' : '#059669', fontSize: '10px' },
      },
      zIndex: 3,
    });
  }
  if (typeof fwLow === 'number') {
    lines.push({
      value: fwLow,
      color: isDark ? '#fca5a5' : '#b91c1c',
      dashStyle: 'ShortDash',
      width: 1,
      label: {
        text: `52W Low ₹${fwLow.toFixed(2)}`,
        align: 'right',
        x: -8,
        y: 12,
        style: { color: isDark ? '#fca5a5' : '#b91c1c', fontSize: '10px' },
      },
      zIndex: 3,
    });
  }

  if (showDayHL) {
    const dayHigh = meta.regularMarketDayHigh;
    const dayLow = meta.regularMarketDayLow;
    if (typeof dayHigh === 'number') {
      lines.push({
        value: dayHigh,
        color: '#10b981',
        dashStyle: 'Solid',
        width: 1.5,
        label: {
          text: `Day High ₹${dayHigh.toFixed(2)}`,
          align: 'left',
          x: 8,
          style: { color: '#10b981', fontSize: '10px', fontWeight: '600' },
        },
        zIndex: 3,
      });
    }
    if (typeof dayLow === 'number') {
      lines.push({
        value: dayLow,
        color: '#f43f5e',
        dashStyle: 'Solid',
        width: 1.5,
        label: {
          text: `Day Low ₹${dayLow.toFixed(2)}`,
          align: 'left',
          x: 8,
          y: 12,
          style: { color: '#f43f5e', fontSize: '10px', fontWeight: '600' },
        },
        zIndex: 3,
      });
    }
  }

  return lines;
}

/**
 * Assemble the full Highcharts.Options for the stock detail chart.
 * Returns null if the Yahoo payload is empty or yields no usable data.
 */
export function buildChartOptions({
  result,
  symbol,
  overlays,
  isIntraday,
  onlyIntraday,
  isDark,
}: BuildChartOptionsArgs): Highcharts.Options | null {
  const data = extractChartData(result, onlyIntraday);
  if (!data) return null;

  const { ohlc, vol, meta, events } = data;
  const firstClose = ohlc[0][4];
  const lastClose = ohlc[ohlc.length - 1][4];
  const isUp = lastClose >= firstClose;

  const upColor = '#16a34a';
  const downColor = '#dc2626';
  const textColor = isDark ? '#d1d5db' : '#6b7280';
  const titleColor = isDark ? '#fff' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const borderColor = isDark ? '#4b5563' : '#d1d5db';
  const bgColor = isDark ? '#1f2937' : 'rgba(255,255,255,0.95)';

  const volumeSeriesData = buildVolumeSeriesData(ohlc, vol, isDark);
  const flags = buildEventFlags(events, ohlc);
  const series = buildChartSeries({
    symbol,
    ohlc,
    vol,
    volumeSeriesData,
    flags,
    overlays,
    isIntraday,
  });
  const plotLines = buildPlotLines(meta, overlays.dayHL, isDark);

  return {
    chart: {
      height: 520,
      backgroundColor: 'transparent',
      style: { fontFamily: 'inherit' },
    },
    time: { timezone: 'Asia/Kolkata' },
    rangeSelector: { enabled: false },
    navigator: {
      enabled: true,
      height: 40,
      maskFill: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
      series: { color: isUp ? upColor : downColor, lineWidth: 1 },
      xAxis: {
        labels: { style: { color: textColor, fontSize: '10px' } },
        gridLineColor: gridColor,
      },
    },
    scrollbar: { enabled: false },
    title: { text: undefined },
    xAxis: {
      ordinal: true,
      labels: {
        style: { color: textColor },
        formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
          const t = this.value as number;
          const fmt = this.chart.time.dateFormat.bind(this.chart.time);
          if (isIntraday) return fmt('%H:%M', t);
          return fmt('%e %b', t);
        },
      },
      gridLineWidth: 1,
      gridLineColor: gridColor,
      lineColor: borderColor,
    },
    yAxis: [
      {
        labels: {
          align: 'right',
          x: -6,
          style: { color: textColor },
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
            return '₹' + Highcharts.numberFormat(this.value as number, 0);
          },
        },
        title: { text: undefined },
        height: '72%',
        lineWidth: 1,
        lineColor: borderColor,
        gridLineColor: gridColor,
        resize: { enabled: true },
        plotLines,
      },
      {
        labels: {
          align: 'right',
          x: -6,
          style: { color: textColor, fontSize: '10px' },
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
            const v = this.value as number;
            if (v >= 1e7) return (v / 1e7).toFixed(1) + 'Cr';
            if (v >= 1e5) return (v / 1e5).toFixed(1) + 'L';
            if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
            return String(v);
          },
        },
        title: { text: 'Volume', style: { color: textColor, fontSize: '10px' } },
        top: '75%',
        height: '25%',
        offset: 0,
        lineWidth: 1,
        lineColor: borderColor,
        gridLineColor: gridColor,
      },
    ],
    tooltip: {
      split: true,
      backgroundColor: bgColor,
      borderColor,
      borderRadius: 8,
      shadow: true,
      style: { color: titleColor, fontSize: '12px' },
      xDateFormat: '%e %b %Y %H:%M',
    },
    plotOptions: {
      candlestick: {
        color: downColor,
        upColor,
        lineColor: downColor,
        upLineColor: upColor,
      },
      column: { borderWidth: 0 },
      series: {
        animation: { duration: 400 },
        dataGrouping: { enabled: false },
      },
    },
    legend: { enabled: false },
    series,
    credits: { enabled: false },
  };
}
