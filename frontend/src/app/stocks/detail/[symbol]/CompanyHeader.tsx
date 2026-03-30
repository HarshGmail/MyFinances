import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  companyName: string;
  symbol: string;
  isInPortfolio: boolean;
  currentPrice?: number;
  change?: number;
  changePct?: number;
  isLoading: boolean;
}

export default function CompanyHeader({
  companyName,
  symbol,
  isInPortfolio,
  currentPrice,
  change,
  changePct,
  isLoading,
}: Props) {
  const isPositive = (change ?? 0) >= 0;

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">{companyName}</h1>
          {!isInPortfolio && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Not in portfolio
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{symbol}</p>
      </div>

      {currentPrice !== undefined ? (
        <div className="text-right">
          <div className="text-3xl font-bold">₹{currentPrice.toFixed(2)}</div>
          <div
            className={`flex items-center gap-1 justify-end text-sm font-medium ${
              isPositive ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {change !== undefined && `${isPositive ? '+' : ''}₹${change.toFixed(2)}`}
            {changePct !== undefined && ` (${isPositive ? '+' : ''}${changePct.toFixed(2)}%)`}
          </div>
        </div>
      ) : (
        isLoading && <Skeleton className="h-14 w-32" />
      )}
    </div>
  );
}
