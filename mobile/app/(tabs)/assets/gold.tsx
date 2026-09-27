import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import {
  useGoldLeasesQuery,
  useGoldTransactionsQuery,
  useSafeGoldRatesQuery,
} from '@myfinances/core/api/query/gold';
import { computeGoldStats } from '@myfinances/core/calc/goldCategories';
import { useGoldLeaseData } from '@myfinances/core/hooks/useGoldLeaseData';
import {
  formatCurrency,
  formatSignedCurrency,
  formatSignedPercent,
} from '@myfinances/core/calc/numbers';
import { Card, Label, LoadingState, Row, Screen } from '@/components/ui';
import { SummaryCard } from '@/components/HoldingCard';
import { changeClass } from '@/lib/theme';
import { AssetCapitalGains } from '@/components/CapitalGains';
import { LineChart } from '@/components/LineChart';
import { TimeframePicker } from '@/components/TimeframePicker';
import { getPastDate, getTimeframes } from '@myfinances/core/calc/chartHelpers';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RATE_LOOKBACK_DAYS = 365;
const GOLD_TIMEFRAMES = getTimeframes('1y');
const DEFAULT_TIMEFRAME = '3m';
const GRAM_DECIMALS = 4;
const GOLD_COLOR = '#eab308';

function grams(value: number) {
  return `${value.toFixed(GRAM_DECIMALS)} g`;
}

function rateWindow() {
  const now = new Date();
  return {
    endDate: now.toISOString().slice(0, 10),
    startDate: new Date(now.getTime() - RATE_LOOKBACK_DAYS * MS_PER_DAY).toISOString().slice(0, 10),
  };
}

export default function GoldScreen() {
  const [{ startDate, endDate }] = useState(rateWindow);
  const ratesQuery = useSafeGoldRatesQuery({ startDate, endDate });
  const transactionsQuery = useGoldTransactionsQuery();
  const leasesQuery = useGoldLeasesQuery();

  const rates = useMemo(() => ratesQuery.data?.data ?? [], [ratesQuery.data]);
  const currentRate = rates.length ? parseFloat(rates[rates.length - 1].rate) : 0;
  const previousRate = rates.length > 1 ? parseFloat(rates[rates.length - 2].rate) : currentRate;

  const stats = useMemo(
    () =>
      transactionsQuery.data && currentRate
        ? computeGoldStats(transactionsQuery.data, currentRate)
        : null,
    [transactionsQuery.data, currentRate]
  );
  const [timeframe, setTimeframe] = useState(DEFAULT_TIMEFRAME);
  const rateSeries = useMemo(() => {
    const days = GOLD_TIMEFRAMES.find((option) => option.label === timeframe)?.days ?? 0;
    const since = getPastDate(days);
    return rates
      .map((row) => ({ x: Date.parse(row.date), y: parseFloat(row.rate) }))
      .filter((point) => point.x >= since);
  }, [rates, timeframe]);
  const lease = useGoldLeaseData(transactionsQuery.data, leasesQuery.data?.leases ?? []);

  if (transactionsQuery.isLoading || ratesQuery.isLoading) return <LoadingState />;

  const dayChange = (stats?.totalGold ?? 0) * (currentRate - previousRate);
  const refresh = () => {
    ratesQuery.refetch();
    transactionsQuery.refetch();
    leasesQuery.refetch();
  };

  return (
    <Screen
      underHeader
      refreshing={ratesQuery.isFetching || transactionsQuery.isFetching}
      onRefresh={refresh}
    >
      {stats ? (
        <SummaryCard
          label="Gold value"
          value={stats.currentValue}
          profitLoss={stats.profitLoss}
          profitLossPercentage={stats.profitLossPercentage}
        >
          <Row label="Holding" value={grams(stats.totalGold)} />
          <Row label="Invested" value={formatCurrency(stats.totalInvested)} />
          <Row label="Live rate" value={`${formatCurrency(currentRate)}/g`} />
          <Row label="Avg buy price" value={`${formatCurrency(stats.avgPrice)}/g`} />
          <Row
            label="Since last close"
            value={
              <Text className={`text-sm font-medium ${changeClass(dayChange)}`}>
                {formatSignedCurrency(dayChange)}
              </Text>
            }
          />
          <Row
            label="XIRR"
            value={stats.xirrValue === null ? '—' : formatSignedPercent(stats.xirrValue)}
          />
        </SummaryCard>
      ) : (
        <Card>
          <Text className="text-sm text-muted">No gold holdings yet.</Text>
        </Card>
      )}

      {rateSeries.length > 1 && (
        <Card>
          <Text className="text-base font-semibold text-foreground">Gold rate (₹/g)</Text>
          <TimeframePicker
            timeframes={GOLD_TIMEFRAMES}
            selected={timeframe}
            onSelect={setTimeframe}
          />
          <LineChart
            series={[{ label: 'Rate', color: GOLD_COLOR, points: rateSeries }]}
            formatY={formatCurrency}
            formatX={(timestamp) =>
              new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
            }
          />
        </Card>
      )}

      {lease.activeLeases.length > 0 && (
        <Card>
          <Text className="text-base font-semibold text-foreground">Gold leasing</Text>
          <Row label="Leased" value={grams(lease.activeLeaseStats.leasedGrams)} />
          <Row label="Average yield" value={`${lease.activeLeaseStats.averageYield.toFixed(2)}%`} />
          <Row
            label="Expected monthly"
            value={grams(lease.activeLeaseStats.expectedMonthlyGrams)}
          />
          {lease.latestMonth && (
            <Row
              label={`Last payout (${lease.latestMonth.label})`}
              value={grams(lease.latestMonth.netGrams)}
            />
          )}
          <Row label="Lifetime interest" value={grams(lease.totals.grossGrams)} />
          <Row label="Lifetime TDS" value={grams(lease.totals.tdsGrams)} />
          <View className="gap-1 pt-2">
            <Label>Active leases</Label>
            {lease.activeLeases.map((item) => (
              <View
                key={item.commitId}
                className="flex-row justify-between border-t border-border py-2"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-sm text-foreground" numberOfLines={1}>
                    {item.borrower}
                  </Text>
                  <Text className="text-xs text-muted">
                    Until {new Date(item.endDate).toLocaleDateString('en-IN')}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm text-foreground">{grams(item.leasedGrams)}</Text>
                  <Text className="text-xs text-muted">{item.yieldPercent}%</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      )}
      <AssetCapitalGains asset="gold" />
    </Screen>
  );
}
