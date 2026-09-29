'use client';

import { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import type { GoalsSummary } from '@myfinances/core/calc/goals';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import { useGoalsData } from '@myfinances/core/hooks/useGoalsData';
import type { UserGoal } from '@myfinances/core/types';
import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteGoalDialog } from './DeleteGoalDialog';
import { GoalCard } from './GoalCard';
import { GoalDialog } from './GoalDialog';

const SKELETON_CARD_COUNT = 3;
const GOAL_GRID_CLASS = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3';

function GoalsSummaryRow({
  summary,
  goalCount,
  loading,
}: {
  summary: GoalsSummary;
  goalCount: number;
  loading: boolean;
}) {
  const monthlyShortfall = summary.totalRequiredMonthly - summary.totalCurrentMonthly;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryStatCard
        loading={loading}
        label="Saved toward goals"
        value={formatCurrency(summary.totalSaved)}
      />
      <SummaryStatCard
        loading={loading}
        label="Total target"
        value={formatCurrency(summary.totalTarget)}
      />
      <SummaryStatCard
        loading={loading}
        label="On track"
        value={`${summary.onTrackCount} of ${goalCount}`}
      >
        {summary.achievedCount > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">{summary.achievedCount} achieved</p>
        )}
      </SummaryStatCard>
      <SummaryStatCard
        loading={loading}
        label="Monthly needed vs investing"
        value={`${formatCurrency(summary.totalRequiredMonthly)}/mo`}
      >
        <p className="mt-1 text-xs text-muted-foreground">
          Investing {formatCurrency(summary.totalCurrentMonthly)}/mo
          {monthlyShortfall > 0 && (
            <span className="text-red-600 dark:text-red-400">
              {' '}
              · {formatCurrency(monthlyShortfall)} short
            </span>
          )}
        </p>
      </SummaryStatCard>
    </div>
  );
}

function GoalsEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card>
      <CardContent className="mx-auto flex max-w-lg flex-col items-center gap-4 py-12 text-center">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Target className="size-6" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Plan for what matters</h3>
          <p className="text-sm text-muted-foreground">
            A goal is a target amount by a date, like a house down payment or your child&apos;s
            education. Link a share of any mutual fund, stock, deposit, gold, crypto or EPF, plus
            any cash you keep aside, and see whether you&apos;re on track and how much to invest
            each month.
          </p>
        </div>
        <Button onClick={onCreate}>
          <Plus />
          Create your first goal
        </Button>
      </CardContent>
    </Card>
  );
}

function GoalCardsSkeleton() {
  return (
    <div className={GOAL_GRID_CLASS}>
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <Skeleton key={index} className="h-[320px] w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function GoalsPage() {
  const goalsData = useGoalsData();
  const { views, summary, isLoading, isHoldingsLoading } = goalsData;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<UserGoal | undefined>(undefined);
  const [deletingGoal, setDeletingGoal] = useState<UserGoal | null>(null);

  const openCreate = () => {
    setEditingGoal(undefined);
    setDialogOpen(true);
  };

  const openEdit = (goal: UserGoal) => {
    setEditingGoal(goal);
    setDialogOpen(true);
  };

  const hasGoals = views.length > 0;

  return (
    <div className="container mx-auto space-y-6 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold">Goals</h2>
          <p className="text-sm text-muted-foreground">
            Track what your investments are working toward.
          </p>
        </div>
        <Button onClick={openCreate} disabled={isLoading}>
          <Plus />
          New goal
        </Button>
      </div>

      {isLoading ? (
        <>
          <GoalsSummaryRow summary={summary} goalCount={0} loading />
          <GoalCardsSkeleton />
        </>
      ) : hasGoals ? (
        <>
          <GoalsSummaryRow summary={summary} goalCount={views.length} loading={isHoldingsLoading} />
          {isHoldingsLoading ? (
            <GoalCardsSkeleton />
          ) : (
            <div className={GOAL_GRID_CLASS}>
              {views.map((view) => (
                <GoalCard
                  key={view.goal._id}
                  view={view}
                  onEdit={() => openEdit(view.goal)}
                  onDelete={() => setDeletingGoal(view.goal)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <GoalsEmptyState onCreate={openCreate} />
      )}

      <GoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        goal={editingGoal}
        goalsData={goalsData}
      />
      <DeleteGoalDialog
        goal={deletingGoal}
        onOpenChange={(open) => !open && setDeletingGoal(null)}
      />
    </div>
  );
}
