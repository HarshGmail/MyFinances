import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/numbers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function CapitalGainsCard({ cgData }: { cgData: any }) {
  const fy = cgData.summary?.currentFY ?? '';
  const s = cgData.summary?.byFY?.[fy];
  if (!s) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Capital Gains — FY {fy}</h3>
        <span className="text-xs text-muted-foreground">Realized only</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Equity STCG</p>
          <p className={`font-medium ${s.equityStcg >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(s.equityStcg)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Equity LTCG</p>
          <p className={`font-medium ${s.equityLtcg >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(s.equityLtcg)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Crypto Gains</p>
          <p className={`font-medium ${s.cryptoGains >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(s.cryptoGains)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Est. Tax Liability</p>
          <p className="font-medium text-orange-500">{formatCurrency(s.totalEstimatedTax ?? 0)}</p>
        </div>
      </div>
    </Card>
  );
}
