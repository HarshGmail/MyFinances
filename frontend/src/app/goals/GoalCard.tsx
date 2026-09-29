'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarClock, Pencil, Trash2 } from 'lucide-react';
import type { GoalView } from '@myfinances/core/calc/goals';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AssetMixBar } from './AssetMixBar';
import { GoalStatusBadge } from './GoalStatusBadge';
import {
  MONTHLY_BASIS_LABELS,
  STATUS_META,
  clampProgress,
  linkedHoldingsLabel,
  timeLeftLabel,
} from './goalDisplay';

export function GoalCard({
  view,
  onEdit,
  onDelete,
}: {
  view: GoalView;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { goal, value, status } = view;
  const targetDate = new Date(goal.targetDate);
  const isAchieved = status === 'achieved';

  return (
    <Card className="gap-0 py-0 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-2 px-5 pt-5">
        <Link href={`/goals/${goal._id}`} className="min-w-0 flex-1 focus-visible:outline-none">
          <h3 className="truncate text-lg font-semibold">{goal.goalName}</h3>
          <GoalStatusBadge status={status} className="mt-1" />
        </Link>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${goal.goalName}`}
            title="Edit goal"
            onClick={onEdit}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${goal.goalName}`}
            title="Delete goal"
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <Link href={`/goals/${goal._id}`} className="block space-y-4 px-5 pt-4 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl font-bold">{formatCurrency(value.currentValue)}</span>
            <span className={`text-sm font-medium ${STATUS_META[status].textClassName}`}>
              {Math.round(view.progressPct)}%
            </span>
          </div>
          <Progress
            value={clampProgress(view.progressPct)}
            indicatorClassName={STATUS_META[status].indicatorClassName}
          />
          <p className="text-xs text-muted-foreground">
            of {formatCurrency(view.targetAmount)}
            {goal.inflationAdjusted && (
              <> · inflation-adjusted from {formatCurrency(view.targetInTodaysMoney)}</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarClock className="size-4 shrink-0" />
          <span>
            {format(targetDate, 'MMM yyyy')} · {timeLeftLabel(targetDate, view.monthsLeft)}
          </span>
        </div>

        {!isAchieved && (
          <div className="grid grid-cols-2 gap-3 rounded-md bg-muted/50 p-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Needs</div>
              <div className="font-semibold">{formatCurrency(view.requiredMonthly)}/mo</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Investing ({MONTHLY_BASIS_LABELS[view.monthlyBasis]})
              </div>
              <div className="font-semibold">{formatCurrency(view.currentMonthly)}/mo</div>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <AssetMixBar byType={value.byType} />
          <p className="text-xs text-muted-foreground">
            {linkedHoldingsLabel(value.lines, goal.manualAmount)}
          </p>
        </div>
      </Link>
    </Card>
  );
}
