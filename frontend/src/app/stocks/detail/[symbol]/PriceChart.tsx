'use client';

import { useState, useMemo } from 'react';
import { useStockFullProfile } from '@/api/query/stocks';
import { useAppStore } from '@/store/useAppStore';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { INTERVALS, Interval } from './verdicts';
import ChartLegendDrawer from './ChartLegendDrawer';

interface Props {
  symbol: string;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

type OHLCPoint = [number, number, number, number, number]; // [time, o, h, l, c]

function computeSMA(ohlc: OHLCPoint[], period: number): [number, number][] {
  if (ohlc.length < period) return [];
  const out: [number, number][] = [];
  let sum = 0;
  for (let i = 0; i < ohlc.length; i++) {
    sum += ohlc[i][4];
    if (i >= period) sum -= ohlc[i - period][4];
    if (i >= period - 1) out.push([ohlc[i][0], sum / period]);
  }
  return out;
}

function computeVWAP(
  ohlc: OHLCPoint[],
  volumes: [number, number][],
  intraday: boolean
): [number, number][] {
  const volMap = new Map(volumes);
  let cumPV = 0;
  let cumV = 0;
  let currentDay = '';
  const out: [number, number][] = [];
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

export default function PriceChart({ symbol }: Props) {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';

  const [selectedInterval, setSelectedInterval] = useState<Interval>(INTERVALS[0]);
  const [showSma20, setShowSma20] = useState(false);
  const [showSma50, setShowSma50] = useState(false);
  const [showVwap, setShowVwap] = useState(false);
  const [showDayHL, setShowDayHL] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  const { data: chartProfileData, isLoading } = useStockFullProfile(
    symbol,
    selectedInterval.range,
    selectedInterval.interval
  );

  const isIntraday = selectedInterval.range === '1d' || selectedInterval.range === '1w';

  const dayHL = useMemo(() => {
    const meta = chartProfileData?.chartData?.chart?.result?.[0]?.meta;
    return {
      high: typeof meta?.regularMarketDayHigh === 'number' ? meta.regularMarketDayHigh : null,
      low: typeof meta?.regularMarketDayLow === 'number' ? meta.regularMarketDayLow : null,
    };
  }, [chartProfileData]);

  const chartOptions = useMemo(() => {
    const result = chartProfileData?.chartData?.chart?.result?.[0];
    if (!result) return null;

    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const opens: (number | null)[] = quote.open || [];
    const highs: (number | null)[] = quote.high || [];
    const lows: (number | null)[] = quote.low || [];
    const closes: (number | null)[] = quote.close || [];
    const volumes: (number | null)[] = quote.volume || [];
    const meta = result.meta ?? {};
    const events = result.events ?? {};

    const onlyIntraday = selectedInterval.range === '1d';

    const ohlcAll: OHLCPoint[] = [];
    const volAll: [number, number][] = [];

    timestamps.forEach((ts: number, i: number) => {
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

    const volumeColors = vol.map(([t], i) => {
      const thisClose = ohlc.find((p) => p[0] === t)?.[4];
      const prevClose = i > 0 ? ohlc.find((p) => p[0] === vol[i - 1][0])?.[4] : thisClose;
      if (thisClose == null || prevClose == null) return isDark ? '#4b5563' : '#9ca3af';
      return thisClose >= prevClose ? upColor : downColor;
    });

    const volumeSeriesData = vol.map(([t, v], i) => ({
      x: t,
      y: v,
      color: volumeColors[i],
    }));

    // Flags from events
    const buildFlags = (
      obj: Record<string, unknown> | undefined,
      title: string,
      text: (item: Record<string, unknown>) => string
    ) => {
      if (!obj) return [];
      const minT = ohlc[0][0];
      const maxT = ohlc[ohlc.length - 1][0];
      return Object.values(obj)
        .map((raw) => {
          const item = raw as Record<string, unknown>;
          const date = typeof item.date === 'number' ? (item.date as number) * 1000 : null;
          if (date == null || date < minT || date > maxT) return null;
          return { x: date, title, text: text(item) };
        })
        .filter((p): p is { x: number; title: string; text: string } => p != null);
    };

    const dividendFlags = buildFlags(
      events.dividends as Record<string, unknown> | undefined,
      'D',
      (item) => `Dividend ₹${(item.amount as number)?.toFixed?.(2) ?? item.amount}`
    );
    const splitFlags = buildFlags(
      events.splits as Record<string, unknown> | undefined,
      'S',
      (item) => `Split ${item.splitRatio ?? `${item.numerator}:${item.denominator}`}`
    );
    const earningsFlags = buildFlags(
      events.earnings as Record<string, unknown> | undefined,
      'E',
      () => 'Earnings'
    );

    const sma20 = showSma20 ? computeSMA(ohlc, 20) : [];
    const sma50 = showSma50 ? computeSMA(ohlc, 50) : [];
    const vwap = showVwap ? computeVWAP(ohlc, vol, isIntraday) : [];

    const fwHigh = meta.fiftyTwoWeekHigh;
    const fwLow = meta.fiftyTwoWeekLow;
    const plotLines: Highcharts.YAxisPlotLinesOptions[] = [];
    if (typeof fwHigh === 'number') {
      plotLines.push({
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
      plotLines.push({
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

    const dayHigh = meta.regularMarketDayHigh;
    const dayLow = meta.regularMarketDayLow;
    if (showDayHL && typeof dayHigh === 'number') {
      plotLines.push({
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
    if (showDayHL && typeof dayLow === 'number') {
      plotLines.push({
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

    const options: Highcharts.Options = {
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
        series: {
          color: isUp ? upColor : downColor,
          lineWidth: 1,
        },
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
      series: [
        {
          type: 'candlestick',
          id: 'stockPrice',
          name: symbol,
          data: ohlc,
          yAxis: 0,
        },
        ...(sma20.length
          ? [
              {
                type: 'line' as const,
                id: 'sma20',
                name: 'SMA 20',
                data: sma20,
                color: '#f59e0b',
                lineWidth: 2,
                yAxis: 0,
                zIndex: 4,
                marker: { enabled: false },
                enableMouseTracking: true,
              },
            ]
          : []),
        ...(sma50.length
          ? [
              {
                type: 'line' as const,
                id: 'sma50',
                name: 'SMA 50',
                data: sma50,
                color: '#8b5cf6',
                lineWidth: 2,
                yAxis: 0,
                zIndex: 4,
                marker: { enabled: false },
                enableMouseTracking: true,
              },
            ]
          : []),
        ...(vwap.length
          ? [
              {
                type: 'line' as const,
                id: 'vwap',
                name: 'VWAP',
                data: vwap,
                color: '#06b6d4',
                lineWidth: 2,
                dashStyle: 'ShortDash' as const,
                yAxis: 0,
                zIndex: 4,
                marker: { enabled: false },
                enableMouseTracking: true,
              },
            ]
          : []),
        {
          type: 'column',
          id: 'volume',
          name: 'Volume',
          data: volumeSeriesData,
          yAxis: 1,
        },
        ...(dividendFlags.length
          ? [
              {
                type: 'flags' as const,
                id: 'dividends',
                name: 'Dividends',
                data: dividendFlags,
                onSeries: 'stockPrice',
                shape: 'circlepin' as const,
                width: 16,
                color: '#0ea5e9',
                fillColor: '#0ea5e9',
                style: { color: '#fff' },
              },
            ]
          : []),
        ...(splitFlags.length
          ? [
              {
                type: 'flags' as const,
                id: 'splits',
                name: 'Splits',
                data: splitFlags,
                onSeries: 'stockPrice',
                shape: 'squarepin' as const,
                width: 16,
                color: '#f97316',
                fillColor: '#f97316',
                style: { color: '#fff' },
              },
            ]
          : []),
        ...(earningsFlags.length
          ? [
              {
                type: 'flags' as const,
                id: 'earnings',
                name: 'Earnings',
                data: earningsFlags,
                onSeries: 'stockPrice',
                shape: 'flag' as const,
                width: 16,
                color: '#a855f7',
                fillColor: '#a855f7',
                style: { color: '#fff' },
              },
            ]
          : []),
      ],
      credits: { enabled: false },
    };

    return options;
  }, [
    chartProfileData,
    isDark,
    selectedInterval,
    isIntraday,
    showSma20,
    showSma50,
    showVwap,
    showDayHL,
    symbol,
  ]);

  const toggleBase = 'h-7 px-2 text-xs border transition-colors';
  const sma20ToggleClass = `${toggleBase} border-amber-500/60 text-amber-500 hover:bg-amber-500/10 data-[state=on]:bg-amber-500 data-[state=on]:text-white data-[state=on]:border-amber-500`;
  const sma50ToggleClass = `${toggleBase} border-violet-500/60 text-violet-500 hover:bg-violet-500/10 data-[state=on]:bg-violet-500 data-[state=on]:text-white data-[state=on]:border-violet-500`;
  const vwapToggleClass = `${toggleBase} border-cyan-500/60 text-cyan-500 hover:bg-cyan-500/10 data-[state=on]:bg-cyan-500 data-[state=on]:text-white data-[state=on]:border-cyan-500 disabled:border-gray-600 disabled:text-gray-600 disabled:hover:bg-transparent`;
  const dayHLToggleClass = `${toggleBase} border-emerald-500/60 text-emerald-500 hover:bg-emerald-500/10 data-[state=on]:bg-emerald-500 data-[state=on]:text-white data-[state=on]:border-emerald-500`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-base">Price Chart</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setLegendOpen(true)}
              aria-label="What do the chart elements mean?"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
          <Tabs
            value={selectedInterval.label}
            onValueChange={(v) =>
              setSelectedInterval(INTERVALS.find((i) => i.label === v) ?? INTERVALS[0])
            }
          >
            <TabsList className="bg-transparent p-0 h-auto gap-1">
              {INTERVALS.map((iv) => (
                <TabsTrigger
                  key={iv.label}
                  value={iv.label}
                  className="border border-gray-400 text-gray-400 rounded-md px-2 py-0.5 text-xs font-normal min-w-[28px] h-7 transition-colors duration-150 data-[state=active]:bg-gray-400 data-[state=active]:text-black data-[state=active]:border-gray-400 data-[state=active]:shadow-none"
                >
                  {iv.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-wrap items-center gap-1 pt-2">
          <span className="text-xs text-muted-foreground mr-1">Overlays:</span>
          <Toggle
            pressed={showSma20}
            onPressedChange={setShowSma20}
            className={sma20ToggleClass}
            aria-label="Toggle SMA 20"
          >
            SMA 20
          </Toggle>
          <Toggle
            pressed={showSma50}
            onPressedChange={setShowSma50}
            className={sma50ToggleClass}
            aria-label="Toggle SMA 50"
          >
            SMA 50
          </Toggle>
          <Toggle
            pressed={showVwap}
            onPressedChange={setShowVwap}
            className={vwapToggleClass}
            disabled={!isIntraday}
            aria-label="Toggle VWAP"
          >
            VWAP
          </Toggle>
          <Toggle
            pressed={showDayHL}
            onPressedChange={setShowDayHL}
            className={dayHLToggleClass}
            disabled={dayHL.high == null && dayHL.low == null}
            aria-label="Toggle Day High/Low"
          >
            {dayHL.high != null && dayHL.low != null
              ? `Day H/L ₹${dayHL.high.toFixed(2)} / ₹${dayHL.low.toFixed(2)}`
              : 'Day H/L'}
          </Toggle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[520px] w-full" />
        ) : chartOptions ? (
          <HighchartsReact
            highcharts={Highcharts}
            constructorType="stockChart"
            options={chartOptions}
            key={`${symbol}-${selectedInterval.label}`}
          />
        ) : (
          <div className="h-[520px] flex items-center justify-center text-muted-foreground text-sm">
            Chart data unavailable for this interval
          </div>
        )}
      </CardContent>
      <ChartLegendDrawer isOpen={legendOpen} onClose={() => setLegendOpen(false)} />
    </Card>
  );
}
