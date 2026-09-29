import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useStockFinancialsQuery,
  useStockFullProfile,
  useStocksPortfolioQuery,
} from '@myfinances/core/api/query/stocks';
import {
  INTERVALS,
  buildMetricCards,
  getMetricCalculation,
} from '@myfinances/core/calc/stockVerdicts';
import { METRIC_DEFINITIONS } from '@myfinances/core/calc/stockMetricDefinitions';
import { closePriceSeries } from '@myfinances/core/calc/portfolioSeries';
import { formatCurrency, formatSignedPercent } from '@myfinances/core/calc/numbers';
import { Button, Card, EmptyState, Label, LoadingState, Screen } from '@/components/ui';
import { LineChart } from '@/components/LineChart';
import { TimeframePicker } from '@/components/TimeframePicker';
import { changeClass, colors } from '@/lib/theme';

const PHONE_INTERVAL_LABELS = ['1D', '1W', '1M', '1Y', '5Y'];
const PHONE_INTERVALS = INTERVALS.filter((option) => PHONE_INTERVAL_LABELS.includes(option.label));
const INTRADAY_LABEL = '1D';
const DEFAULT_INTERVAL = '1M';
const TIMEFRAME_OPTIONS = PHONE_INTERVALS.map((option) => ({ label: option.label, days: 0 }));

function formatAxis(label: string) {
  return (timestamp: number) =>
    label === INTRADAY_LABEL
      ? new Date(timestamp).toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata',
        })
      : new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function MetricSheet({
  metricLabel,
  financials,
  onClose,
}: {
  metricLabel: string | null;
  financials: Parameters<typeof getMetricCalculation>[1] | undefined;
  onClose: () => void;
}) {
  const definition = metricLabel ? METRIC_DEFINITIONS[metricLabel] : undefined;
  const calculation =
    metricLabel && financials ? getMetricCalculation(metricLabel, financials) : null;
  return (
    <Modal
      visible={metricLabel !== null}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <SafeAreaView edges={['bottom']} className="max-h-[80%] rounded-t-2xl bg-card">
          <ScrollView contentContainerClassName="gap-3 p-5">
            <Text className="text-lg font-semibold text-foreground">
              {definition?.title ?? metricLabel}
            </Text>
            {definition ? (
              <>
                <Text className="text-sm text-foreground">{definition.description}</Text>
                <Label>How it is calculated</Label>
                <Text className="text-sm text-foreground">{definition.howCalculated}</Text>
              </>
            ) : null}
            {calculation ? (
              <View className="gap-1 rounded-lg bg-accent p-3">
                {calculation.label1 ? (
                  <Text className="text-xs text-muted">
                    {calculation.label1}: {String(calculation.value1)}
                  </Text>
                ) : null}
                {calculation.label2 ? (
                  <Text className="text-xs text-muted">
                    {calculation.label2}: {String(calculation.value2)}
                  </Text>
                ) : null}
                {calculation.formula ? (
                  <Text className="text-xs text-muted">{calculation.formula}</Text>
                ) : null}
                {calculation.result ? (
                  <Text className="text-sm font-semibold text-foreground">
                    {calculation.result}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {definition ? (
              <>
                <Label>What it tells us</Label>
                <Text className="text-sm text-foreground">{definition.whatItTellsUs}</Text>
                {definition.goodRange ? (
                  <>
                    <Label>Good range</Label>
                    <Text className="text-sm text-foreground">{definition.goodRange}</Text>
                  </>
                ) : null}
              </>
            ) : null}
            <Button label="Close" variant="secondary" onPress={onClose} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const [intervalLabel, setIntervalLabel] = useState(DEFAULT_INTERVAL);
  const [openMetric, setOpenMetric] = useState<string | null>(null);
  const interval =
    PHONE_INTERVALS.find((option) => option.label === intervalLabel) ?? PHONE_INTERVALS[0];
  const financialsQuery = useStockFinancialsQuery(symbol ?? '');
  const profileQuery = useStockFullProfile(symbol ?? '', interval.range, interval.interval);
  const portfolioQuery = useStocksPortfolioQuery();
  const holding = portfolioQuery.data?.portfolio.find((stock) => stock.stockName === symbol);

  const series = useMemo(
    () =>
      closePriceSeries(
        profileQuery.data?.chartData?.chart?.result?.[0],
        intervalLabel === INTRADAY_LABEL
      ),
    [profileQuery.data, intervalLabel]
  );
  const cards = useMemo(() => {
    const financials = financialsQuery.data;
    const hasFundamentals =
      financials && Object.values(financials).some((module) => module !== null);
    return hasFundamentals ? buildMetricCards(financials) : [];
  }, [financialsQuery.data]);

  if (financialsQuery.isLoading) return <LoadingState />;
  const price = financialsQuery.data?.price;
  const currentPrice = price?.regularMarketPrice ?? holding?.currentPrice ?? null;
  const changePct = price?.regularMarketChangePercent ?? holding?.oneDayChangePercentage ?? 0;

  return (
    <Screen
      underHeader
      refreshing={financialsQuery.isFetching}
      onRefresh={() => {
        financialsQuery.refetch();
        profileQuery.refetch();
      }}
    >
      <Stack.Screen options={{ title: symbol ?? 'Stock' }} />
      {currentPrice === null && !cards.length ? (
        <EmptyState message="No data for this symbol." />
      ) : (
        <>
          <Card>
            <Text className="text-base font-semibold text-foreground">
              {price?.longName ?? price?.shortName ?? symbol}
            </Text>
            <View className="flex-row items-baseline gap-2">
              <Text className="text-2xl font-bold text-foreground">
                {currentPrice === null ? '—' : formatCurrency(currentPrice)}
              </Text>
              <Text className={`text-sm ${changeClass(changePct)}`}>
                {formatSignedPercent(changePct)}
              </Text>
            </View>
          </Card>

          <Card>
            <TimeframePicker
              timeframes={TIMEFRAME_OPTIONS}
              selected={intervalLabel}
              onSelect={setIntervalLabel}
            />
            {profileQuery.isLoading ? (
              <LoadingState />
            ) : (
              <LineChart
                series={[{ label: 'Price', color: colors.foreground, points: series }]}
                formatY={formatCurrency}
                formatX={formatAxis(intervalLabel)}
              />
            )}
          </Card>

          <Card>
            <Text className="text-base font-semibold text-foreground">Fundamentals</Text>
            <Label>
              {cards.length
                ? 'Tap a metric to see what it means.'
                : 'Fundamentals are unavailable right now. Pull down to retry.'}
            </Label>
            {cards.map((card) => (
              <Pressable
                key={card.label}
                onPress={() => setOpenMetric(card.label)}
                className="border-t border-border py-2"
                accessibilityRole="button"
              >
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">{card.label}</Text>
                  <Text className="text-sm font-medium text-foreground">{card.value}</Text>
                </View>
                {card.verdict ? (
                  <Text className={`text-xs ${card.verdict.color}`}>{card.verdict.text}</Text>
                ) : null}
              </Pressable>
            ))}
          </Card>
        </>
      )}
      <MetricSheet
        metricLabel={openMetric}
        financials={financialsQuery.data}
        onClose={() => setOpenMetric(null)}
      />
    </Screen>
  );
}
