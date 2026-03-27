import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/numbers';
import { getProfitLossColor } from '@/utils/text';

type DepositSummary = {
  invested: number;
  currentValue: number;
  profitLoss: number;
};

export default function DepositCard({
  title,
  summary,
  items,
  emptyMessage,
}: {
  title: string;
  summary: DepositSummary;
  items: { dateOfMaturity: string | Date; rateOfInterest: number }[];
  emptyMessage: string;
}) {
  const activeCount = items.filter((item) => new Date(item.dateOfMaturity) > new Date()).length;
  const avgRate = items.length
    ? (items.reduce((sum, item) => sum + item.rateOfInterest, 0) / items.length).toFixed(2)
    : '0.00';

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {items.length > 0 ? (
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
            <span>Interest Earned:</span>
            <span className="text-green-600 font-medium">{formatCurrency(summary.profitLoss)}</span>
          </div>
          <div className="flex justify-between">
            <span>Active:</span>
            <span>{activeCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Avg Rate:</span>
            <span>{avgRate}%</span>
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
