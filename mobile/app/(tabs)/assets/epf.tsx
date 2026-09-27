import { Text, View } from 'react-native';
import { useEpfQuery, useEpfTimelineQuery } from '@myfinances/core/api/query/epf';
import { useInflationQuery } from '@myfinances/core/api/query/inflation';
import { useUserProfileQuery } from '@myfinances/core/api/query/profile';
import { calculateEPFGrowth, resolveInflationPct } from '@myfinances/core/calc/epfProjection';
import { LineChart } from '@/components/LineChart';
import { colors } from '@/lib/theme';
import { calcEPFPortfolio } from '@myfinances/core/calc/portfolioCalculations';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import { router } from 'expo-router';
import { AddButton, Card, EmptyState, Label, LoadingState, Row, Screen } from '@/components/ui';
import { SummaryCard } from '@/components/HoldingCard';

const INFLATION_LOOKBACK_YEARS = 5;
const LAKH = 100000;
const CRORE = 10000000;

function compactCrore(value: number) {
  return value >= CRORE ? `₹${(value / CRORE).toFixed(1)}Cr` : `₹${Math.round(value / LAKH)}L`;
}

function formatDate(value?: string) {
  return value
    ? new Date(value).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '';
}

export default function EpfScreen() {
  const accountsQuery = useEpfQuery();
  const timelineQuery = useEpfTimelineQuery();
  const profileQuery = useUserProfileQuery();
  const inflationQuery = useInflationQuery(INFLATION_LOOKBACK_YEARS);
  const inflationPct = resolveInflationPct(inflationQuery.data?.average);
  const projection = calculateEPFGrowth(
    accountsQuery.data ?? [],
    profileQuery.data?.dob,
    inflationPct
  );

  if (accountsQuery.isLoading || timelineQuery.isLoading) return <LoadingState />;

  const timeline = timelineQuery.data;
  const summary = timeline ? calcEPFPortfolio(timeline) : null;
  const rows = [...(timeline?.timeline ?? [])].reverse();

  return (
    <Screen
      underHeader
      refreshing={accountsQuery.isFetching || timelineQuery.isFetching}
      onRefresh={() => {
        accountsQuery.refetch();
        timelineQuery.refetch();
      }}
    >
      {summary && timeline ? (
        <SummaryCard
          label="EPF balance"
          value={summary.currentValue}
          profitLoss={summary.profitLoss}
          profitLossPercentage={summary.profitLossPercentage}
        >
          <Row label="Contributions" value={formatCurrency(timeline.totalContributions)} />
          <Row label="Interest earned" value={formatCurrency(timeline.totalInterest)} />
        </SummaryCard>
      ) : (
        <EmptyState message="No EPF accounts yet." />
      )}

      {projection.summary && (
        <Card>
          <Text className="text-base font-semibold text-foreground">At retirement (58)</Text>
          <Row label="Projected balance" value={formatCurrency(projection.summary.finalBalance)} />
          <Row
            label="In today's money"
            value={formatCurrency(projection.summary.finalBalanceReal)}
          />
          <Row label="Years to go" value={String(projection.summary.yearsToRetirement)} />
          <LineChart
            height={150}
            series={[
              {
                label: 'Balance',
                color: colors.foreground,
                points: projection.yearlyData.map((point) => ({ x: point.year, y: point.balance })),
              },
              {
                label: "Today's money",
                color: colors.gain,
                dashed: true,
                points: projection.yearlyData.map((point) => ({
                  x: point.year,
                  y: point.realBalance,
                })),
              },
            ]}
            formatY={compactCrore}
            formatX={(year) => String(year)}
          />
          <Label>
            {`Assumes 8.25% interest, today's monthly credit until 58, and ${inflationPct.toFixed(1)}% inflation.${profileQuery.data?.dob ? '' : ' Add your date of birth in Edit profile for an accurate timeline.'}`}
          </Label>
        </Card>
      )}

      <AddButton label="Add EPF account" onPress={() => router.push('/assets/forms/epf-account')} />

      {(accountsQuery.data ?? []).length > 0 && (
        <Card>
          <Text className="text-base font-semibold text-foreground">Accounts</Text>
          {accountsQuery.data!.map((account) => (
            <Row
              key={account._id}
              label={account.organizationName}
              value={`${formatCurrency(account.epfAmount)}/mo`}
            />
          ))}
        </Card>
      )}

      {rows.length > 0 && (
        <Card>
          <Text className="text-base font-semibold text-foreground">Timeline</Text>
          {rows.map((row, index) => (
            <View
              key={`${row.type}-${row.financialYear ?? row.startDate}-${index}`}
              className="flex-row justify-between border-t border-border py-2"
            >
              <View className="flex-1 pr-3">
                <Text className="text-sm text-foreground">
                  {row.type === 'interest' ? `Interest FY ${row.financialYear}` : row.organization}
                </Text>
                <Label>
                  {row.type === 'interest'
                    ? `Credited ${formatDate(row.interestCreditDate)}`
                    : `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`}
                </Label>
              </View>
              <Text className="text-sm font-medium text-foreground">
                {formatCurrency(row.totalContribution)}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
