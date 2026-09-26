import { useMemo } from 'react';
import { Text, View } from 'react-native';
import {
  useMfapiNavHistoryBatchQuery,
  useMutualFundInfoFetchQuery,
} from '@myfinances/core/api/query/mutual-funds-info';
import { useMutualFundTransactionsQuery } from '@myfinances/core/api/query/mutual-funds';
import {
  buildMfFundRows,
  latestNavMap,
  summariseMfRows,
} from '@myfinances/core/calc/portfolioCalculations';
import { buildMfDailySummary } from '@myfinances/core/calc/mfDailyMoves';
import { formatNavDate } from '@myfinances/core/calc/navDates';
import {
  formatCurrency,
  formatSignedCurrency,
  formatSignedPercent,
} from '@myfinances/core/calc/numbers';
import { Card, EmptyState, Label, LoadingState, Row, Screen } from '@/components/ui';
import { HoldingCard, SignedText, SummaryCard } from '@/components/HoldingCard';
import { BreadthBar, ChangeBars } from '@/components/ChangeBars';
import { changeClass } from '@/lib/theme';

const NAV_DECIMALS = 4;

function formatNav(nav: number) {
  return `₹${nav.toFixed(NAV_DECIMALS)}`;
}

function formatOptionalPercent(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : formatSignedPercent(value);
}

export default function MutualFundsScreen() {
  const infoQuery = useMutualFundInfoFetchQuery();
  const transactionsQuery = useMutualFundTransactionsQuery();
  const schemeNumbers = useMemo(
    () => Array.from(new Set((infoQuery.data ?? []).map((info) => info.schemeNumber))),
    [infoQuery.data]
  );
  const navQuery = useMfapiNavHistoryBatchQuery(schemeNumbers);

  const rows = useMemo(() => {
    if (!transactionsQuery.data || !infoQuery.data) return [];
    return buildMfFundRows(
      transactionsQuery.data,
      infoQuery.data,
      latestNavMap(schemeNumbers, navQuery.data)
    ).filter((row) => row.totalUnits > 0);
  }, [transactionsQuery.data, infoQuery.data, schemeNumbers, navQuery.data]);

  const daily = useMemo(() => {
    if (!navQuery.data) return null;
    return buildMfDailySummary(
      rows.map((row) => ({
        fundName: row.fundName,
        units: row.totalUnits,
        navHistory: row.schemeNumber ? navQuery.data[row.schemeNumber]?.data : undefined,
      }))
    );
  }, [rows, navQuery.data]);

  const totals = useMemo(
    () => summariseMfRows(rows, transactionsQuery.data ?? []),
    [rows, transactionsQuery.data]
  );

  const dailyByFund = useMemo(
    () => new Map((daily?.funds ?? []).map((fund) => [fund.fundName, fund])),
    [daily]
  );

  const isLoading =
    infoQuery.isLoading ||
    transactionsQuery.isLoading ||
    (schemeNumbers.length > 0 && navQuery.isLoading);
  if (isLoading) return <LoadingState />;

  const refresh = () => {
    infoQuery.refetch();
    transactionsQuery.refetch();
    navQuery.refetch();
  };

  return (
    <Screen
      underHeader
      refreshing={infoQuery.isFetching || transactionsQuery.isFetching || navQuery.isFetching}
      onRefresh={refresh}
    >
      <SummaryCard
        label="Current valuation"
        value={totals.currentValue}
        profitLoss={totals.profitLoss}
        profitLossPercentage={totals.profitLossPercentage}
      >
        <Row label="Invested" value={formatCurrency(totals.invested)} />
        <Row label="XIRR" value={formatOptionalPercent(totals.xirr)} />
      </SummaryCard>

      {daily && daily.funds.length > 0 && (
        <Card>
          <Text className="text-base font-semibold text-foreground">Today&apos;s move</Text>
          <Text className="text-xs text-muted">
            {daily.latestNavDate && daily.previousNavDate
              ? `NAV of ${formatNavDate(daily.latestNavDate)} vs ${formatNavDate(daily.previousNavDate)}. `
              : ''}
            NAVs publish after market close.
          </Text>
          <Text className={`text-2xl font-bold ${changeClass(daily.totalChange)}`}>
            {formatSignedCurrency(daily.totalChange)}{' '}
            <Text className="text-sm">({formatSignedPercent(daily.totalChangePct)})</Text>
          </Text>
          <View className="gap-1.5">
            <Text className="text-xs">
              <Text className="text-gain">▲ {daily.advancers}</Text>
              <Text className="text-muted"> · </Text>
              <Text className="text-loss">▼ {daily.decliners}</Text>
              {daily.staleCount > 0 && (
                <Text className="text-muted"> · {daily.staleCount} pending</Text>
              )}
            </Text>
            <BreadthBar advancers={daily.advancers} decliners={daily.decliners} />
          </View>
          {daily.funds.filter((fund) => !fund.isStale).length > 1 && (
            <View className="gap-2 pt-2">
              <Label>Contribution by fund</Label>
              <ChangeBars
                bars={daily.funds
                  .filter((fund) => !fund.isStale)
                  .map((fund) => ({
                    label: fund.fundName,
                    change: fund.valueChange,
                    changePct: fund.navChange?.changePct ?? 0,
                  }))}
              />
            </View>
          )}
        </Card>
      )}

      {rows.length ? (
        rows.map((row) => {
          const move = dailyByFund.get(row.fundName);
          return (
            <HoldingCard
              key={row.fundName}
              title={row.fundName}
              currentValue={row.currentValue}
              profitLoss={row.profitLoss}
              profitLossPercentage={row.profitLossPercentage}
              metrics={[
                { label: 'Units', value: row.totalUnits.toFixed(3) },
                { label: 'NAV', value: row.currentNav === null ? '—' : formatNav(row.currentNav) },
                { label: 'Invested', value: formatCurrency(row.totalInvested) },
                {
                  label: 'Day',
                  value: move?.isStale ? (
                    'NAV pending'
                  ) : (
                    <SignedText value={move?.valueChange ?? 0}>
                      {formatSignedCurrency(move?.valueChange ?? 0)}
                    </SignedText>
                  ),
                },
                { label: '1M', value: formatOptionalPercent(move?.monthChange?.changePct) },
                { label: 'XIRR', value: formatOptionalPercent(row.fundXirr) },
              ]}
            />
          );
        })
      ) : (
        <EmptyState message="No mutual fund holdings yet." />
      )}
    </Screen>
  );
}
