'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Pencil, SearchX, Trash2 } from 'lucide-react';
import type { GoalView } from '@myfinances/core/calc/goals';
import { formatCurrency, formatSignedCurrency } from '@myfinances/core/calc/numbers';
import { getProfitLossColor } from '@myfinances/core/calc/text';
import { useGoalsData } from '@myfinances/core/hooks/useGoalsData';
import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteGoalDialog } from '../DeleteGoalDialog';
import { GoalAssumptions } from '../GoalAssumptions';
import { GoalBreakdown } from '../GoalBreakdown';
import { GoalDialog } from '../GoalDialog';
import { GoalProgressChart } from '../GoalProgressChart';
import { GoalStatusBadge } from '../GoalStatusBadge';
import {
  MONTHLY_BASIS_LABELS,
  RETURN_BASIS_LABELS,
  STATUS_META,
  clampProgress,
  formatPercentNumber,
  timeLeftLabel,
} from '../goalDisplay';

const KPI_SKELETON_COUNT = 6;

function BackLink() {
  return (
    <Link
      href="/goals"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      All goals
    </Link>
  );
}

function GoalDetailSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-4">
      <BackLink />
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: KPI_SKELETON_COUNT }, (_, index) => (
          <Skeleton key={index} className="h-[120px] w-full" />
        ))}
      </div>
      <Skeleton className="h-[440px] w-full" />
    </div>
  );
}

function GoalNotFound() {
  return (
    <div className="container mx-auto space-y-6 p-4">
      <BackLink />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <SearchX className="size-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Goal not found</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            It may have been deleted, or the link is wrong.
          </p>
          <Button asChild variant="outline">
            <Link href="/goals">Back to goals</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function GoalKpis({ view }: { view: GoalView }) {
  const { goal, value } = view;
  const targetDate = new Date(goal.targetDate);
  const monthlyGap = view.requiredMonthly - view.currentMonthly;
  const projectedShortfall = view.targetAmount - view.projectedValue;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <SummaryStatCard label="Current value" value={formatCurrency(value.currentValue)}>
        <Progress
          className="mt-3"
          value={clampProgress(view.progressPct)}
          indicatorClassName={STATUS_META[view.status].indicatorClassName}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {Math.round(view.progressPct)}% of target · {formatCurrency(view.remaining)} to go
        </p>
      </SummaryStatCard>
      <SummaryStatCard label="Invested" value={formatCurrency(value.invested)}>
        <p className={`mt-1 text-sm ${getProfitLossColor(value.profitLoss)}`}>
          {formatSignedCurrency(value.profitLoss)} P/L
        </p>
      </SummaryStatCard>
      <SummaryStatCard label="Target" value={formatCurrency(view.targetAmount)}>
        <p className="mt-1 text-xs text-muted-foreground">
          By {format(targetDate, 'd MMM yyyy')} · {timeLeftLabel(targetDate, view.monthsLeft)}
        </p>
        {goal.inflationAdjusted && (
          <p className="text-xs text-muted-foreground">
            {formatCurrency(view.targetInTodaysMoney)} in today&apos;s money
          </p>
        )}
      </SummaryStatCard>
      <SummaryStatCard label="Monthly needed" value={`${formatCurrency(view.requiredMonthly)}/mo`}>
        <p className="mt-1 text-xs text-muted-foreground">
          Investing {formatCurrency(view.currentMonthly)}/mo (
          {MONTHLY_BASIS_LABELS[view.monthlyBasis]})
        </p>
        {monthlyGap > 0 && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {formatCurrency(monthlyGap)}/mo short
          </p>
        )}
      </SummaryStatCard>
      <SummaryStatCard
        label="Projected at target date"
        value={formatCurrency(view.projectedValue)}
        valueClassName={STATUS_META[view.status].textClassName}
      >
        <p className="mt-1 text-xs text-muted-foreground">
          {projectedShortfall > 0
            ? `${formatCurrency(projectedShortfall)} below target at current pace`
            : `${formatCurrency(-projectedShortfall)} above target at current pace`}
        </p>
      </SummaryStatCard>
      <SummaryStatCard
        label="Expected return"
        value={`${formatPercentNumber(view.expectedReturn.pct)}% / yr`}
      >
        <p className="mt-1 text-xs text-muted-foreground">
          Based on {RETURN_BASIS_LABELS[view.expectedReturn.basis]}
        </p>
      </SummaryStatCard>
    </div>
  );
}

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const goalsData = useGoalsData();
  const { views, isLoading, isHoldingsLoading, inflationPct } = goalsData;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const view = views.find((candidate) => candidate.goal._id === params.id);

  if (isLoading) return <GoalDetailSkeleton />;
  if (!view) return <GoalNotFound />;

  const { goal } = view;

  return (
    <div className="container mx-auto space-y-6 p-4">
      <BackLink />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold break-words">{goal.goalName}</h2>
            {!isHoldingsLoading && <GoalStatusBadge status={view.status} />}
          </div>
          {goal.description && (
            <p className="text-sm whitespace-pre-line text-muted-foreground">{goal.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </Button>
          <Button variant="outline" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>

      {isHoldingsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: KPI_SKELETON_COUNT }, (_, index) => (
            <Skeleton key={index} className="h-[120px] w-full" />
          ))}
        </div>
      ) : (
        <>
          <GoalKpis view={view} />
          <GoalProgressChart view={view} />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
            <GoalBreakdown view={view} />
            <GoalAssumptions view={view} inflationPct={inflationPct} />
          </div>
        </>
      )}

      <GoalDialog open={editOpen} onOpenChange={setEditOpen} goal={goal} goalsData={goalsData} />
      <DeleteGoalDialog
        goal={deleteOpen ? goal : null}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.replace('/goals')}
      />
    </div>
  );
}
