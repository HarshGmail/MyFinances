'use client';

import type { ReactNode } from 'react';
import { CalendarClock } from 'lucide-react';
import type { EmiPlan } from '@myfinances/core/calc/creditCards';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import type { CreditCard } from '@myfinances/core/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cardDisplayName, formatCardDate } from './cardDisplay';

const PERCENT = 100;

function installmentProgressLabel(plan: EmiPlan): string {
  if (plan.installmentsTotal === 0) return 'Tenure unknown';
  return `${plan.installmentsPaid} of ${plan.installmentsTotal} paid · ${plan.installmentsRemaining} left`;
}

function PlanStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium truncate">{value}</dd>
    </div>
  );
}

function EmiPlanCard({ plan, cardName }: { plan: EmiPlan; cardName: string }) {
  const hasKnownTenure = plan.installmentsTotal > 0;
  const progressPct = hasKnownTenure
    ? (plan.installmentsPaid / plan.installmentsTotal) * PERCENT
    : 0;

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base truncate" title={plan.description}>
          {plan.description}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{cardName}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">{installmentProgressLabel(plan)}</p>
          {hasKnownTenure && <Progress value={progressPct} />}
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          <PlanStat label="Monthly installment" value={formatCurrency(plan.monthlyInstallment)} />
          <PlanStat
            label="Est. outstanding"
            value={hasKnownTenure ? formatCurrency(plan.estimatedOutstanding) : '—'}
          />
          <PlanStat label="Principal paid" value={formatCurrency(plan.principalPaid)} />
          <PlanStat label="Interest paid" value={formatCurrency(plan.interestPaid)} />
          <PlanStat label="GST on interest" value={formatCurrency(plan.gstPaid)} />
          <PlanStat label="Last billed" value={formatCardDate(plan.lastBilledOn)} />
        </dl>
      </CardContent>
    </Card>
  );
}

export function EmiPlansSection({ plans, cards }: { plans: EmiPlan[]; cards: CreditCard[] }) {
  if (plans.length === 0) return null;

  const cardNameById = new Map(cards.map((card) => [card._id, cardDisplayName(card)]));

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-muted-foreground" />
        EMI Plans
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <EmiPlanCard
            key={plan.key}
            plan={plan}
            cardName={cardNameById.get(plan.cardId) ?? 'Unknown card'}
          />
        ))}
      </div>
    </section>
  );
}
