import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  formatCurrency,
  formatSignedCurrency,
  formatSignedPercent,
} from '@myfinances/core/calc/numbers';
import { getProfitLossColor } from '@myfinances/core/calc/text';
import { PortfolioMove } from '@myfinances/core/calc/dailyMoves';
import { formatIstSessionDate, NseMarketStatus } from '@myfinances/core/calc/marketHours';
import RefreshIndicator from '@/app/home/RefreshIndicator';

interface TodayHeaderProps {
  total: PortfolioMove;
  marketStatus: NseMarketStatus;
  lastTradeTime: string | null;
  isRefreshing: boolean;
  lastUpdatedAt: number | null;
}

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

export default function TodayHeader({
  total,
  marketStatus,
  lastTradeTime,
  isRefreshing,
  lastUpdatedAt,
}: TodayHeaderProps) {
  const isLive = marketStatus === 'open';
  return (
    <Card className="mb-6">
      <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">Today&apos;s move</p>
          <div className={`text-3xl font-bold md:text-4xl ${getProfitLossColor(total.change)}`}>
            {formatSignedCurrency(total.change)}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className={getProfitLossColor(total.change)}>
              {formatSignedPercent(total.changePct)}
            </span>{' '}
            on {formatCurrency(total.currentValue)} across movable assets
          </p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isLive ? 'default' : 'secondary'} className="gap-1.5">
              {isLive && <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />}
              {marketStatusText(marketStatus, lastTradeTime)}
            </Badge>
            <Badge variant="outline">Gold &amp; crypto live 24×7</Badge>
          </div>
          <RefreshIndicator isRefreshing={isRefreshing} lastUpdatedAt={lastUpdatedAt} />
        </div>
      </CardContent>
    </Card>
  );
}
