import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProfitLossColor } from '@/utils/text';
import { ASSET_CLASS_LABELS, HoldingMove } from '@/utils/dailyMoves';
import { formatSignedCurrency, formatSignedPercent } from '@/utils/numbers';

function MoverRow({ holding }: { holding: HoldingMove }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium" title={holding.name}>
          {holding.name}
        </p>
        <Badge variant="outline" className="mt-0.5 text-[10px] font-normal">
          {ASSET_CLASS_LABELS[holding.assetClass]}
        </Badge>
      </div>
      <div className={`shrink-0 text-right text-sm ${getProfitLossColor(holding.change)}`}>
        <p className="font-semibold">{formatSignedCurrency(holding.change)}</p>
        <p className="text-xs">{formatSignedPercent(holding.changePct)}</p>
      </div>
    </li>
  );
}

function MoverColumn({ title, holdings }: { title: string; holdings: HoldingMove[] }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-1 text-sm font-medium text-muted-foreground">{title}</h3>
      {holdings.length ? (
        <ul className="divide-y">
          {holdings.map((holding) => (
            <MoverRow key={`${holding.assetClass}:${holding.name}`} holding={holding} />
          ))}
        </ul>
      ) : (
        <p className="py-2 text-sm text-muted-foreground">Nothing here today.</p>
      )}
    </div>
  );
}

export default function TopMoversList({
  gainers,
  losers,
}: {
  gainers: HoldingMove[];
  losers: HoldingMove[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top movers</CardTitle>
        <p className="text-sm text-muted-foreground">
          Individual holdings with the biggest rupee impact today.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <MoverColumn title="Gainers" holdings={gainers} />
        <MoverColumn title="Losers" holdings={losers} />
      </CardContent>
    </Card>
  );
}
