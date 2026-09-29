'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import { useGoalsData } from '@myfinances/core/hooks/useGoalsData';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { GoalStatusBadge } from '../goals/GoalStatusBadge';
import { STATUS_META, clampProgress } from '../goals/goalDisplay';

const MAX_GOALS_SHOWN = 3;

export default function GoalsCard() {
  const { views, isLoading, isHoldingsLoading } = useGoalsData();

  if (isLoading || isHoldingsLoading || views.length === 0) return null;

  const shown = [...views]
    .sort((a, b) => new Date(a.goal.targetDate).getTime() - new Date(b.goal.targetDate).getTime())
    .slice(0, MAX_GOALS_SHOWN);

  return (
    <Card className="mb-6 gap-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Goals</h3>
        <Link
          href="/goals"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          View all {views.length}
          <ChevronRight className="size-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {shown.map((view) => (
          <Link
            key={view.goal._id}
            href={`/goals/${view.goal._id}`}
            className="space-y-2 rounded-md border p-3 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{view.goal.goalName}</span>
              <GoalStatusBadge status={view.status} />
            </div>
            <Progress
              value={clampProgress(view.progressPct)}
              indicatorClassName={STATUS_META[view.status].indicatorClassName}
            />
            <p className="text-xs text-muted-foreground">
              {formatCurrency(view.value.currentValue)} of {formatCurrency(view.targetAmount)}
            </p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
