import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMfapiNavHistoryBatchQuery } from '@myfinances/core/api/query/mutual-funds-info';
import {
  MF_INTERVALS,
  buildMFMetricCards,
  computeMFMetrics,
  filterNavDataByInterval,
} from '@myfinances/core/calc/mfMetrics';
import { parseNavDate } from '@myfinances/core/calc/navDates';
import { formatSignedPercent } from '@myfinances/core/calc/numbers';
import { Card, EmptyState, Label, LoadingState, Row, Screen } from '@/components/ui';
import { LineChart } from '@/components/LineChart';
import { TimeframePicker } from '@/components/TimeframePicker';
import { changeClass, colors } from '@/lib/theme';

const DEFAULT_INTERVAL = '1Y';
const PERCENT = 100;
const INTERVAL_OPTIONS = MF_INTERVALS.map((interval) => ({
  label: interval.label,
  days: interval.days,
}));

export default function FundDetailScreen() {
  const { scheme, name } = useLocalSearchParams<{ scheme: string; name?: string }>();
  const batchQuery = useMfapiNavHistoryBatchQuery(scheme ? [scheme] : []);
  const history = scheme ? batchQuery.data?.[scheme] : undefined;
  const [interval, setInterval] = useState(DEFAULT_INTERVAL);
  const navData = useMemo(() => history?.data ?? [], [history]);

  const metrics = useMemo(
    () => (navData.length ? computeMFMetrics(navData, history?.meta ?? null) : null),
    [navData, history?.meta]
  );
  const series = useMemo(() => {
    if (!navData.length) return [];
    const days = MF_INTERVALS.find((option) => option.label === interval)?.days ?? Infinity;
    return filterNavDataByInterval(navData, days)
      .map((point) => ({ x: parseNavDate(point.date), y: parseFloat(point.nav) }))
      .reverse();
  }, [navData, interval]);

  if (batchQuery.isLoading) return <LoadingState />;
  const title = history?.meta?.scheme_name ?? name ?? 'Fund';

  return (
    <Screen underHeader refreshing={batchQuery.isFetching} onRefresh={batchQuery.refetch}>
      <Stack.Screen options={{ title: 'Fund' }} />
      {!metrics ? (
        <EmptyState message="No NAV history for this fund." />
      ) : (
        <>
          <Card>
            <Text className="text-base font-semibold text-foreground">{title}</Text>
            {metrics.fundHouse ? <Label>{metrics.fundHouse}</Label> : null}
            <View className="flex-row items-baseline gap-2 pt-1">
              <Text className="text-2xl font-bold text-foreground">
                ₹{metrics.currentNAV.toFixed(4)}
              </Text>
              <Text className={`text-sm ${changeClass(metrics.change1D)}`}>
                {formatSignedPercent(metrics.changePct1D * PERCENT)}
              </Text>
            </View>
            {metrics.category ? <Label>{metrics.category}</Label> : null}
          </Card>

          <Card>
            <TimeframePicker
              timeframes={INTERVAL_OPTIONS}
              selected={interval}
              onSelect={setInterval}
            />
            <LineChart
              series={[{ label: 'NAV', color: colors.foreground, points: series }]}
              formatY={(value) => `₹${value.toFixed(2)}`}
              formatX={(timestamp) =>
                new Date(timestamp).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
              }
            />
          </Card>

          <Card>
            <Text className="text-base font-semibold text-foreground">Returns and risk</Text>
            {buildMFMetricCards(metrics)
              .filter((card) => card.label !== 'Current NAV')
              .map((card) => (
                <View key={card.label} className="border-t border-border py-2">
                  <Row label={card.label} value={card.value} />
                  {card.verdict ? (
                    <Text className={`text-xs ${card.verdict.color}`}>{card.verdict.text}</Text>
                  ) : null}
                </View>
              ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
