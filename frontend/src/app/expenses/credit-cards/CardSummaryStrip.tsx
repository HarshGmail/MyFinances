'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, CreditCard as CreditCardIcon } from 'lucide-react';
import type { CardDueSummary } from '@myfinances/core/calc/creditCards';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import { issuerLabel } from '@myfinances/core/schemas/creditCards';
import type { CreditCardStatement } from '@myfinances/core/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  MISMATCH_BADGE_CLASS,
  dueBadge,
  formatCardDate,
  passwordBadge,
  utilisationIndicatorClass,
} from './cardDisplay';

const PERCENT = 100;

function statementPeriodLabel(statement: CreditCardStatement): string {
  const end = formatCardDate(statement.periodEnd);
  return statement.periodStart
    ? `${formatCardDate(statement.periodStart)} – ${end}`
    : `Up to ${end}`;
}

function StatLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium truncate">{value}</dd>
    </div>
  );
}

function UtilisationBar({
  statement,
  utilisation,
}: {
  statement: CreditCardStatement;
  utilisation: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Utilisation {(utilisation * PERCENT).toFixed(0)}%</span>
        <span>Limit {formatCurrency(statement.creditLimit ?? 0)}</span>
      </div>
      <Progress
        value={utilisation * PERCENT}
        className="bg-muted"
        indicatorClassName={utilisationIndicatorClass(utilisation)}
      />
    </div>
  );
}

function StatementDetails({
  statement,
  utilisation,
  daysUntilDue,
}: {
  statement: CreditCardStatement;
  utilisation: number | null;
  daysUntilDue: number | null;
}) {
  const due = daysUntilDue === null ? null : dueBadge(daysUntilDue);

  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-[11px] text-muted-foreground">Total due</p>
        <p className="text-xl font-bold leading-tight">{formatCurrency(statement.totalDue)}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        <StatLine
          label="Minimum due"
          value={statement.minimumDue !== undefined ? formatCurrency(statement.minimumDue) : '—'}
        />
        <StatLine
          label="Due date"
          value={statement.dueDate ? formatCardDate(statement.dueDate) : '—'}
        />
      </dl>
      {due && (
        <Badge variant="outline" className={due.className}>
          {due.label}
        </Badge>
      )}
      {utilisation !== null && <UtilisationBar statement={statement} utilisation={utilisation} />}
      <p className="text-xs text-muted-foreground">Statement {statementPeriodLabel(statement)}</p>
      {!statement.reconciled && (
        <Badge variant="outline" className={`gap-1 font-normal ${MISMATCH_BADGE_CLASS}`}>
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Totals don&apos;t reconcile — some lines may be missing
        </Badge>
      )}
    </div>
  );
}

function CardTile({ summary, cycleSpend }: { summary: CardDueSummary; cycleSpend: number }) {
  const { card, statement, utilisation, daysUntilDue } = summary;
  const password = passwordBadge(card);

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">{issuerLabel(card.issuer)}</p>
            <p className="text-sm font-semibold truncate">
              {card.label}{' '}
              <span className="text-muted-foreground font-normal">••{card.lastDigits}</span>
            </p>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 font-normal text-[10px] px-1.5 py-0 ${password.className}`}
          >
            {password.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2.5">
        {statement ? (
          <StatementDetails
            statement={statement}
            utilisation={utilisation}
            daysUntilDue={daysUntilDue}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <CreditCardIcon className="h-6 w-6 mb-1.5 opacity-30" />
            <p className="text-xs">No statement yet</p>
          </div>
        )}
        {cycleSpend > 0 && (
          <div className="flex items-baseline justify-between border-t pt-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              This cycle
            </span>
            <span className="text-sm font-semibold">{formatCurrency(cycleSpend)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CardSummaryStrip({
  summaries,
  cycleSpendByCard,
}: {
  summaries: CardDueSummary[];
  cycleSpendByCard: Record<string, number>;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {summaries.map((summary) => (
        <CardTile
          key={summary.card._id}
          summary={summary}
          cycleSpend={cycleSpendByCard[summary.card._id] ?? 0}
        />
      ))}
    </div>
  );
}
