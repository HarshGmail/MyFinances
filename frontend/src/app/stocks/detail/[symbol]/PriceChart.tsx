'use client';

import { useMemo } from 'react';
import Highcharts from 'highcharts/esm/highstock';
import 'highcharts/esm/highcharts-more';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStockFullProfile, useStockTransactionsQuery } from '@/api/query/stocks';
import { useAppStore } from '@/store/useAppStore';
import { useUrlBoolean } from '@/utils/useUrlState';
import { INTERVALS, Interval } from './verdicts';
import { useStockDetailInterval, useStockDetailOverlays } from './stockDetailStore';
import { buildChartOptions } from './chartOptions';
import ChartLegendDrawer from './ChartLegendDrawer';
import OverlaysDrawer from './OverlaysDrawer';
import PriceChartHeader from './PriceChartHeader';

interface Props {
  symbol: string;
}

export default function PriceChart({ symbol }: Props) {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';

  const [selectedIntervalLabel, setSelectedIntervalLabel] = useStockDetailInterval();
  const [overlays] = useStockDetailOverlays();

  const [legendOpen, setLegendOpen] = useUrlBoolean('legend', false);
  const [overlaysOpen, setOverlaysOpen] = useUrlBoolean('ovPanel', false);

  const selectedInterval: Interval =
    INTERVALS.find((i) => i.label === selectedIntervalLabel) ?? INTERVALS[0];
  const isIntraday = selectedInterval.range === '1d' || selectedInterval.range === '1w';
  const onlyIntraday = selectedInterval.range === '1d';

  const { data: chartProfileData, isLoading } = useStockFullProfile(
    symbol,
    selectedInterval.range,
    selectedInterval.interval
  );

  const { data: transactions } = useStockTransactionsQuery();

  const result = chartProfileData?.chartData?.chart?.result?.[0];

  const hasDayHL = useMemo(() => {
    const meta = result?.meta;
    return (
      typeof meta?.regularMarketDayHigh === 'number' ||
      typeof meta?.regularMarketDayLow === 'number'
    );
  }, [result]);

  const chartOptions = useMemo(
    () =>
      buildChartOptions({
        result,
        symbol,
        overlays,
        isIntraday,
        onlyIntraday,
        isDark,
        transactions,
      }),
    [result, symbol, overlays, isIntraday, onlyIntraday, isDark, transactions]
  );

  return (
    <Card>
      <PriceChartHeader
        selectedIntervalLabel={selectedIntervalLabel}
        onChangeInterval={setSelectedIntervalLabel}
        overlays={overlays}
        onOpenLegend={() => setLegendOpen(true)}
        onOpenOverlays={() => setOverlaysOpen(true)}
      />

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
      <OverlaysDrawer
        isOpen={overlaysOpen}
        onClose={() => setOverlaysOpen(false)}
        isIntraday={isIntraday}
        hasDayHL={hasDayHL}
      />
    </Card>
  );
}
