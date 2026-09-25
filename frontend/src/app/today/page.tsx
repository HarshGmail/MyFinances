'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { useTodayMovesData } from './useTodayMovesData';
import TodayHeader from './TodayHeader';
import AssetMoveCard from './AssetMoveCard';
import TopMoversList from './TopMoversList';

const ContributionChart = dynamic(() => import('./ContributionChart'), { ssr: false });

function TodaySkeleton() {
  return (
    <div className="p-4">
      <Skeleton className="mb-6 h-[140px] w-full" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[170px] w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  );
}

export default function TodayPage() {
  const {
    moves,
    total,
    movers,
    marketStatus,
    lastTradeTime,
    isInitialLoad,
    isRefreshing,
    lastUpdatedAt,
  } = useTodayMovesData();

  if (isInitialLoad) return <TodaySkeleton />;

  if (!moves.length) {
    return (
      <div className="p-4">
        <h2 className="mb-2 text-2xl font-bold">Today</h2>
        <p className="text-muted-foreground">
          Add stocks, mutual funds, gold or crypto to see how they move each day.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="mb-4 text-2xl font-bold">Today</h2>
      <TodayHeader
        total={total}
        marketStatus={marketStatus}
        lastTradeTime={lastTradeTime}
        isRefreshing={isRefreshing}
        lastUpdatedAt={lastUpdatedAt}
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {moves.map((move) => (
          <AssetMoveCard key={move.assetClass} move={move} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ContributionChart moves={moves} />
        <TopMoversList gainers={movers.gainers} losers={movers.losers} />
      </div>
    </div>
  );
}
