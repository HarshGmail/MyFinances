import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useQueryClient } from '@tanstack/react-query';
import { useHomePortfolioData } from '@myfinances/core/hooks/useHomePortfolioData';
import { formatCurrency, formatSignedPercent } from '@myfinances/core/calc/numbers';
import { Card, Label, LoadingState, Row, Screen } from '@/components/ui';
import { useSession } from '@/lib/session';
import { changeClass } from '@/lib/theme';

interface AssetSummary {
  invested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

function formatXirr(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : formatSignedPercent(value);
}

function AssetRow({
  label,
  summary,
  xirr,
  href,
}: {
  label: string;
  summary: AssetSummary;
  xirr?: number | null;
  href?: Href;
}) {
  if (summary.invested <= 0 && summary.currentValue <= 0) return null;
  const content = (
    <Card>
      <View className="flex-row items-start justify-between">
        <Label>{label}</Label>
        <Text className={`text-xs font-medium ${changeClass(summary.profitLoss)}`}>
          {formatSignedPercent(summary.profitLossPercentage)}
        </Text>
      </View>
      <Text className="text-xl font-bold text-foreground">
        {formatCurrency(summary.currentValue)}
      </Text>
      <Row label="Invested" value={formatCurrency(summary.invested)} />
      <Row
        label="P&L"
        value={
          <Text className={`text-sm font-medium ${changeClass(summary.profitLoss)}`}>
            {formatCurrency(summary.profitLoss)}
          </Text>
        }
      />
      {xirr !== undefined && <Row label="XIRR" value={formatXirr(xirr)} />}
    </Card>
  );
  return href ? <Pressable onPress={() => router.push(href)}>{content}</Pressable> : content;
}

export default function HomeScreen() {
  const queryClient = useQueryClient();
  const userName = useSession((state) => state.user?.name);
  const {
    portfolioSummary,
    overallXirr,
    stockXirr,
    mfXirr,
    goldXirr,
    cryptoXirr,
    isInitialLoad,
    isRefreshing,
    aiPrompt,
  } = useHomePortfolioData(userName);

  if (isInitialLoad) return <LoadingState />;

  const { total } = portfolioSummary;

  return (
    <Screen
      title={userName ? `Hi, ${userName.split(' ')[0]}` : 'Portfolio'}
      refreshing={isRefreshing}
      onRefresh={() => queryClient.invalidateQueries()}
      right={
        <Pressable onPress={() => Clipboard.setStringAsync(aiPrompt)} accessibilityRole="button">
          <Text className="text-xs text-muted">Copy AI prompt</Text>
        </Pressable>
      }
    >
      <Card>
        <Label>Total value</Label>
        <Text className="text-3xl font-bold text-foreground">
          {formatCurrency(total.currentValue)}
        </Text>
        <Text className={`text-sm ${changeClass(total.profitLoss)}`}>
          {formatCurrency(total.profitLoss)} ({formatSignedPercent(total.profitLossPercentage)})
        </Text>
        <Row label="Invested" value={formatCurrency(total.invested)} />
        <Row label="Overall XIRR" value={formatXirr(overallXirr)} />
      </Card>

      <AssetRow
        label="Stocks"
        summary={portfolioSummary.stocks}
        xirr={stockXirr}
        href="/assets/stocks"
      />
      <AssetRow
        label="Mutual Funds"
        summary={portfolioSummary.mutualFunds}
        xirr={mfXirr}
        href="/assets/mutual-funds"
      />
      <AssetRow label="Gold" summary={portfolioSummary.gold} xirr={goldXirr} href="/assets/gold" />
      <AssetRow
        label="Crypto"
        summary={portfolioSummary.crypto}
        xirr={cryptoXirr}
        href="/assets/crypto"
      />
      <AssetRow label="EPF" summary={portfolioSummary.epf} href="/assets/epf" />
      <AssetRow label="Fixed Deposits" summary={portfolioSummary.fd} href="/assets/deposits" />
      <AssetRow label="Recurring Deposits" summary={portfolioSummary.rd} href="/assets/deposits" />
    </Screen>
  );
}
