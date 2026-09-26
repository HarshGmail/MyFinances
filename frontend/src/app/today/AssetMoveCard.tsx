import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatCurrency,
  formatSignedCurrency,
  formatSignedPercent,
} from '@myfinances/core/calc/numbers';
import { getProfitLossColor } from '@myfinances/core/calc/text';
import { ASSET_CLASS_LABELS, AssetClass, AssetMove } from '@myfinances/core/calc/dailyMoves';
import { BreadthBar } from '@/components/custom/BreadthBar';

const PORTFOLIO_PATHS: Record<AssetClass, string> = {
  stocks: '/stocks/portfolio',
  mutualFunds: '/mutual-funds/dashboard',
  gold: '/gold/portfolio',
  crypto: '/crypto/portfolio',
};

export default function AssetMoveCard({ move }: { move: AssetMove }) {
  const holdingCount = move.holdings.length;
  const unchanged = holdingCount - move.advancers - move.decliners;
  return (
    <Link href={PORTFOLIO_PATHS[move.assetClass]} className="group block">
      <Card className="h-full transition-colors group-hover:bg-accent/40">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {ASSET_CLASS_LABELS[move.assetClass]}
          </CardTitle>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <div className={`text-2xl font-bold ${getProfitLossColor(move.change)}`}>
              {formatSignedCurrency(move.change)}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className={getProfitLossColor(move.change)}>
                {formatSignedPercent(move.changePct)}
              </span>{' '}
              · worth {formatCurrency(move.currentValue)}
            </div>
          </div>
          {holdingCount > 1 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-green-600">▲ {move.advancers} up</span>
                <span className="text-red-600">▼ {move.decliners} down</span>
                {unchanged > 0 && <span className="text-muted-foreground">{unchanged} flat</span>}
              </div>
              <BreadthBar advancers={move.advancers} decliners={move.decliners} />
            </div>
          )}
          <p className="text-xs text-muted-foreground">{move.basisLabel}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
