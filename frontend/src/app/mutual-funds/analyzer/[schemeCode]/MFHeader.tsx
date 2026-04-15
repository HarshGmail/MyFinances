'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MFHeaderProps {
  fundName: string;
  fundHouse?: string;
  currentNAV: number;
  change1D: number;
  changePct1D: number;
  isInPortfolio: boolean;
  isLoading: boolean;
}

export default function MFHeader({
  fundName,
  fundHouse,
  currentNAV,
  change1D,
  changePct1D,
  isInPortfolio,
  isLoading,
}: MFHeaderProps) {
  if (isLoading && !currentNAV) {
    return <Skeleton className="h-24 w-full" />;
  }

  const isPositive = change1D >= 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-500';

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{fundName}</h1>
          {fundHouse && <p className="text-sm text-muted-foreground mt-1">{fundHouse}</p>}
        </div>
        {!isInPortfolio && (
          <Badge variant="outline" className="shrink-0">
            Not in portfolio
          </Badge>
        )}
        {isInPortfolio && <Badge className="shrink-0 bg-green-600">In portfolio</Badge>}
      </div>

      <div className="flex items-baseline gap-3">
        <div className="text-2xl font-semibold">₹{currentNAV.toFixed(2)}</div>
        <div className={`flex items-center gap-1 text-sm font-medium ${changeColor}`}>
          {isPositive ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownRight className="h-4 w-4" />
          )}
          <span>
            {isPositive ? '+' : ''}
            {change1D.toFixed(2)} ({changePct1D >= 0 ? '+' : ''}
            {(changePct1D * 100).toFixed(2)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
