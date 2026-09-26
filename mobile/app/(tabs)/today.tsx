import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTodayMovesData } from '@myfinances/core/hooks/useTodayMovesData';
import {
  ASSET_CLASS_LABELS,
  AssetClass,
  AssetMove,
  HoldingMove,
} from '@myfinances/core/calc/dailyMoves';
import { formatIstSessionDate, NseMarketStatus } from '@myfinances/core/calc/marketHours';
import {
  formatCurrency,
  formatSignedCurrency,
  formatSignedPercent,
} from '@myfinances/core/calc/numbers';
import { Card, EmptyState, Label, LoadingState, Screen } from '@/components/ui';
import { BreadthBar, ChangeBars } from '@/components/ChangeBars';
import { changeClass } from '@/lib/theme';

const ASSET_ROUTES: Record<AssetClass, Href> = {
  stocks: '/assets/stocks',
  mutualFunds: '/assets/mutual-funds',
  gold: '/assets/gold',
  crypto: '/assets/crypto',
};

function marketStatusText(status: NseMarketStatus, lastTradeTime: string | null): string {
  const session = lastTradeTime ? formatIstSessionDate(lastTradeTime) : 'last session';
  switch (status) {
    case 'open':
      return 'NSE open · live';
    case 'pre-open':
      return `NSE opens 9:15 · showing ${session}`;
    case 'weekend':
      return `Weekend · showing ${session}`;
    default:
      return `NSE closed · session of ${session}`;
  }
}

function AssetMoveCard({ move }: { move: AssetMove }) {
  const unchanged = move.holdings.length - move.advancers - move.decliners;
  return (
    <Pressable onPress={() => router.push(ASSET_ROUTES[move.assetClass])}>
      <Card>
        <Label>{ASSET_CLASS_LABELS[move.assetClass]}</Label>
        <Text className={`text-2xl font-bold ${changeClass(move.change)}`}>
          {formatSignedCurrency(move.change)}
        </Text>
        <Text className="text-sm text-muted">
          <Text className={changeClass(move.change)}>{formatSignedPercent(move.changePct)}</Text>
          {' · worth '}
          {formatCurrency(move.currentValue)}
        </Text>
        {move.holdings.length > 1 && (
          <View className="gap-1.5">
            <Text className="text-xs">
              <Text className="text-gain">▲ {move.advancers} up </Text>
              <Text className="text-loss"> ▼ {move.decliners} down</Text>
              {unchanged > 0 && <Text className="text-muted"> · {unchanged} flat</Text>}
            </Text>
            <BreadthBar advancers={move.advancers} decliners={move.decliners} />
          </View>
        )}
        <Text className="text-xs text-muted">{move.basisLabel}</Text>
      </Card>
    </Pressable>
  );
}

function MoverList({ title, holdings }: { title: string; holdings: HoldingMove[] }) {
  return (
    <View className="gap-1">
      <Label>{title}</Label>
      {holdings.length ? (
        holdings.map((holding) => (
          <View
            key={`${holding.assetClass}:${holding.name}`}
            className="flex-row items-center justify-between border-b border-border py-2"
          >
            <View className="flex-1 pr-3">
              <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                {holding.name}
              </Text>
              <Text className="text-xs text-muted">{ASSET_CLASS_LABELS[holding.assetClass]}</Text>
            </View>
            <View className="items-end">
              <Text className={`text-sm font-semibold ${changeClass(holding.change)}`}>
                {formatSignedCurrency(holding.change)}
              </Text>
              <Text className={`text-xs ${changeClass(holding.change)}`}>
                {formatSignedPercent(holding.changePct)}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Text className="py-2 text-sm text-muted">Nothing here today.</Text>
      )}
    </View>
  );
}

export default function TodayScreen() {
  const queryClient = useQueryClient();
  const { moves, total, movers, marketStatus, lastTradeTime, isInitialLoad, isRefreshing } =
    useTodayMovesData();

  if (isInitialLoad) return <LoadingState />;

  return (
    <Screen
      title="Today"
      refreshing={isRefreshing}
      onRefresh={() => queryClient.invalidateQueries()}
    >
      {!moves.length ? (
        <EmptyState message="Add stocks, mutual funds, gold or crypto to see how they move each day." />
      ) : (
        <>
          <Card>
            <Label>Today&apos;s move</Label>
            <Text className={`text-4xl font-bold ${changeClass(total.change)}`}>
              {formatSignedCurrency(total.change)}
            </Text>
            <Text className="text-sm text-muted">
              <Text className={changeClass(total.change)}>
                {formatSignedPercent(total.changePct)}
              </Text>
              {' on '}
              {formatCurrency(total.currentValue)}
            </Text>
            <View className="flex-row flex-wrap gap-2 pt-1">
              <Text className="rounded-full bg-accent px-2.5 py-1 text-xs text-foreground">
                {marketStatusText(marketStatus, lastTradeTime)}
              </Text>
              <Text className="rounded-full border border-border px-2.5 py-1 text-xs text-muted">
                Gold &amp; crypto live 24×7
              </Text>
            </View>
          </Card>

          {moves.map((move) => (
            <AssetMoveCard key={move.assetClass} move={move} />
          ))}

          <Card>
            <Text className="text-base font-semibold text-foreground">What drove today</Text>
            <ChangeBars
              bars={moves.map((move) => ({
                label: ASSET_CLASS_LABELS[move.assetClass],
                change: move.change,
                changePct: move.changePct,
              }))}
            />
          </Card>

          <Card>
            <Text className="text-base font-semibold text-foreground">Top movers</Text>
            <MoverList title="Gainers" holdings={movers.gainers} />
            <MoverList title="Losers" holdings={movers.losers} />
          </Card>
        </>
      )}
    </Screen>
  );
}
