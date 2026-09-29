import { GOAL_ASSET_LABELS, type GoalView, type ReturnBasis } from '@myfinances/core/calc/goals';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RETURN_BASIS_LABELS, formatPercentNumber } from './goalDisplay';

const PERCENT = 100;

const RETURN_BASIS_EXPLANATIONS: Record<ReturnBasis, string> = {
  override: 'You set this return yourself. Projections use it as-is.',
  history:
    'Blended from the actual XIRR of every linked holding, weighted by how much each contributes.',
  rate: 'Taken from the interest rate of the linked deposits.',
  default:
    'Blended across linked holdings, weighted by value. Holdings with at least a year of history use their own XIRR (capped between −5% and 25%), deposits use their interest rate, and the rest fall back to an asset-class default.',
};

export function GoalAssumptions({ view, inflationPct }: { view: GoalView; inflationPct: number }) {
  const { expectedReturn, goal } = view;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assumptions</CardTitle>
        <p className="text-sm text-muted-foreground">
          The numbers that drive the projection and the monthly amount needed.
        </p>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-medium">Expected return</h3>
            <span className="text-lg font-semibold">
              {formatPercentNumber(expectedReturn.pct)}% / yr
            </span>
          </div>
          <p className="text-muted-foreground">{RETURN_BASIS_EXPLANATIONS[expectedReturn.basis]}</p>
          {expectedReturn.sources.length > 0 && (
            <ul className="divide-y rounded-md border">
              {expectedReturn.sources.map((source) => (
                <li
                  key={`${source.assetType}:${source.label}`}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate">{source.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {GOAL_ASSET_LABELS[source.assetType]} · {RETURN_BASIS_LABELS[source.basis]} ·{' '}
                      {Math.round(source.weight * PERCENT)}% weight
                    </div>
                  </div>
                  <span className="shrink-0 font-medium">{formatPercentNumber(source.pct)}%</span>
                </li>
              ))}
            </ul>
          )}
          {expectedReturn.basis === 'override' && (
            <p className="text-xs text-muted-foreground">
              Without your override, the linked holdings would suggest{' '}
              {formatPercentNumber(expectedReturn.blendedPct)}% a year
              {expectedReturn.sources.length > 0 ? ', blended from the list above.' : '.'}
            </p>
          )}
        </section>

        <section className="space-y-1">
          <h3 className="font-medium">Inflation</h3>
          {goal.inflationAdjusted ? (
            <p className="text-muted-foreground">
              Your target of {formatCurrency(view.targetInTodaysMoney)} is in today&apos;s money. At{' '}
              {formatPercentNumber(inflationPct)}% average inflation it grows to{' '}
              <span className="font-medium text-foreground">
                {formatCurrency(view.targetAmount)}
              </span>{' '}
              by the target date, and that is what the goal tracks.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Not inflation-adjusted. The target is treated as a fixed amount on the target date.
            </p>
          )}
        </section>

        <section className="space-y-1">
          <h3 className="font-medium">Monthly contribution</h3>
          {view.monthlyBasis === 'planned' ? (
            <p className="text-muted-foreground">
              Using your planned {formatCurrency(view.currentMonthly)} a month.
            </p>
          ) : (
            <p className="text-muted-foreground">
              No planned amount set, so this uses the average of the last 12 months of net
              contributions into the linked holdings (scaled by each allocation):{' '}
              <span className="font-medium text-foreground">
                {formatCurrency(view.currentMonthly)}
              </span>{' '}
              a month.
            </p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
