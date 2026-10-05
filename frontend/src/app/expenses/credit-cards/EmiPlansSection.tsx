'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { CalendarClock, ChevronDown } from 'lucide-react';
import {
  classifyEmiPlans,
  emiChargesByCard,
  type EmiPlan,
} from '@myfinances/core/calc/creditCards';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import type { CreditCard } from '@myfinances/core/types';
import { Button } from '@/components/ui/button';
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
  const monthlyCharge = plan.monthlyInterest + plan.monthlyGst;

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
            label="Monthly charge"
            value={monthlyCharge > 0 ? formatCurrency(monthlyCharge) : '—'}
          />
          <PlanStat
            label="Est. outstanding"
            value={hasKnownTenure ? formatCurrency(plan.estimatedOutstanding) : '—'}
          />
          <PlanStat label="Principal paid" value={formatCurrency(plan.principalPaid)} />
          <PlanStat label="Interest paid" value={formatCurrency(plan.interestPaid)} />
          <PlanStat label="GST on interest" value={formatCurrency(plan.gstPaid)} />
          <PlanStat label="Started" value={formatCardDate(plan.startedOn)} />
          <PlanStat label="Last billed" value={formatCardDate(plan.lastBilledOn)} />
        </dl>
      </CardContent>
    </Card>
  );
}

function PlanGrid({
  plans,
  cardNameById,
}: {
  plans: EmiPlan[];
  cardNameById: Map<string, string>;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {plans.map((plan) => (
        <EmiPlanCard
          key={plan.key}
          plan={plan}
          cardName={cardNameById.get(plan.cardId) ?? 'Unknown card'}
        />
      ))}
    </div>
  );
}

function EmiChargeBreakdown({
  plans,
  cardNameById,
}: {
  plans: EmiPlan[];
  cardNameById: Map<string, string>;
}) {
  const breakdown = useMemo(() => emiChargesByCard(plans), [plans]);
  if (breakdown.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Monthly EMI charges by card</CardTitle>
        <p className="text-xs text-muted-foreground">
          Interest and GST each active EMI adds to the card&apos;s bill this cycle
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {breakdown.map((card) => (
          <div key={card.cardId} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold truncate">
                {cardNameById.get(card.cardId) ?? 'Unknown card'}
              </span>
              <span className="text-sm font-semibold">{formatCurrency(card.total)}</span>
            </div>
            <ul className="space-y-1">
              {card.plans.map((charge) => (
                <li
                  key={charge.plan.key}
                  className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground"
                >
                  <span className="truncate" title={charge.plan.description}>
                    {charge.plan.description}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatCurrency(charge.interest)} + {formatCurrency(charge.gst)} GST ={' '}
                    <span className="text-foreground font-medium">
                      {formatCurrency(charge.total)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function EmiPlansSection({ plans, cards }: { plans: EmiPlan[]; cards: CreditCard[] }) {
  const [showInactive, setShowInactive] = useState(false);
  const { active, completed, stale } = useMemo(() => classifyEmiPlans(plans), [plans]);
  const cardNameById = useMemo(
    () => new Map(cards.map((card) => [card._id, cardDisplayName(card)])),
    [cards]
  );

  if (plans.length === 0) return null;

  const inactiveCount = completed.length + stale.length;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-muted-foreground" />
        EMI Plans
      </h2>

      <EmiChargeBreakdown plans={active} cardNameById={cardNameById} />

      {active.length > 0 ? (
        <PlanGrid plans={active} cardNameById={cardNameById} />
      ) : (
        <p className="text-sm text-muted-foreground">No active EMI plans.</p>
      )}

      {inactiveCount > 0 && (
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => setShowInactive((open) => !open)}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showInactive ? 'rotate-180' : ''}`}
            />
            {showInactive ? 'Hide' : 'Show'} {completed.length} completed
            {stale.length > 0 ? ` · ${stale.length} stale` : ''}
          </Button>
          {showInactive && (
            <div className="space-y-6">
              {completed.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Completed</h3>
                  <PlanGrid plans={completed} cardNameById={cardNameById} />
                </div>
              )}
              {stale.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Stale — no recent statement
                  </h3>
                  <PlanGrid plans={stale} cardNameById={cardNameById} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
