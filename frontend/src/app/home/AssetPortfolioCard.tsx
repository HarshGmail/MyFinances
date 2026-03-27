import { Card } from '@/components/ui/card';
import { formatCurrency, formatToPercentage } from '@/utils/numbers';
import { getProfitLossColor } from '@/utils/text';

type AssetSummary = {
  invested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
};

export default function AssetPortfolioCard({
  title,
  summary,
  xirr,
  hasData,
  emptyMessage,
}: {
  title: string;
  summary: AssetSummary;
  xirr: number | null;
  hasData: boolean;
  emptyMessage: string;
}) {
  return (
    <Card className="p-6 flex-1">
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {hasData ? (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Invested:</span>
            <span>{formatCurrency(summary.invested)}</span>
          </div>
          <div className="flex justify-between">
            <span>Current Value:</span>
            <span className={getProfitLossColor(summary.profitLoss)}>
              {formatCurrency(summary.currentValue)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>P&L:</span>
            <span className={getProfitLossColor(summary.profitLoss)}>
              {formatCurrency(summary.profitLoss)} (
              {formatToPercentage(summary.profitLossPercentage)}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span>XIRR:</span>
            <span className={xirr !== null && xirr >= 0 ? 'text-green-600' : 'text-red-600'}>
              {xirr !== null ? `${xirr.toFixed(2)}%` : 'N/A'}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-24 text-muted-foreground">
          <p className="text-sm">{emptyMessage}</p>
        </div>
      )}
    </Card>
  );
}
