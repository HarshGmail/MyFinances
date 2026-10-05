'use client';

import { useEffect, useMemo, useState } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
  AlertTriangle,
  CreditCard as CreditCardIcon,
  Plus,
  RefreshCw,
  Settings2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  invalidateCreditCardQueries,
  useCardSyncJobStatusQuery,
  useCreditCardAlertsQuery,
  useCreditCardStatementsQuery,
  useCreditCardSyncMutation,
  useCreditCardTransactionsQuery,
  useCreditCardsQuery,
} from '@myfinances/core/api';
import {
  currentCycleSpendByCard,
  latestStatementByCard,
  summariseLiveAlerts,
  type EmiPlan,
} from '@myfinances/core/calc/creditCards';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import type { CardSyncResult } from '@myfinances/core/types';
import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/useAppStore';
import { mutationErrorMessage } from '@/app/goals/goalDisplay';
import { CardFormDialog } from './CardFormDialog';
import { CardSummaryStrip } from './CardSummaryStrip';
import { CardTransactionsTable } from './CardTransactionsTable';
import { EmiPlansSection } from './EmiPlansSection';
import { ManageCardsDialog } from './ManageCardsDialog';
import { ALL_CARDS, cardDisplayName, pluralise } from './cardDisplay';
import { useCreditCardsData } from './useCreditCardsData';

const ACTIVE_SYNC_JOB_STORAGE_KEY = 'cardSync_activeJobId';
const EMI_BILLING_GRACE_DAYS = 45;

function isActiveEmiPlan(plan: EmiPlan): boolean {
  const billedRecently =
    differenceInCalendarDays(new Date(), parseISO(plan.lastBilledOn)) <= EMI_BILLING_GRACE_DAYS;
  const hasInstallmentsLeft = plan.installmentsTotal === 0 || plan.installmentsRemaining > 0;
  return billedRecently && hasInstallmentsLeft;
}

function syncSummaryMessage(result: CardSyncResult): string {
  const parts = [
    `${pluralise(result.statementsImported, 'statement')} and ${pluralise(result.transactionsImported, 'transaction')} imported`,
  ];
  if (result.passwordsDiscovered > 0) {
    parts.push(`${pluralise(result.passwordsDiscovered, 'password')} found automatically`);
  }
  return parts.join(' · ');
}

function useCardStatementSync() {
  const queryClient = useQueryClient();
  const startSync = useCreditCardSyncMutation();
  const [jobId, setJobId] = useState<string | null>(null);
  const [syncWarnings, setSyncWarnings] = useState<string[]>([]);
  const { data: jobStatus, isError: jobStatusUnavailable } = useCardSyncJobStatusQuery(jobId);

  useEffect(() => {
    const storedJobId = localStorage.getItem(ACTIVE_SYNC_JOB_STORAGE_KEY);
    if (storedJobId) setJobId(storedJobId);
  }, []);

  useEffect(() => {
    if (!jobStatus || jobStatus.status === 'processing') return;

    if (jobStatus.status === 'done' && jobStatus.result) {
      const { result } = jobStatus;
      const hasImports = result.statementsImported > 0 || result.transactionsImported > 0;
      if (hasImports) toast.success(syncSummaryMessage(result));
      else toast.info('No new statements found');
      setSyncWarnings(result.errors);
      invalidateCreditCardQueries(queryClient);
    } else if (jobStatus.status === 'failed') {
      toast.error(jobStatus.error ?? 'Statement sync failed');
    } else if (jobStatus.status === 'cancelled') {
      toast.info('Statement sync stopped');
    }
    setJobId(null);
    localStorage.removeItem(ACTIVE_SYNC_JOB_STORAGE_KEY);
  }, [jobStatus, queryClient]);

  useEffect(() => {
    if (!jobStatusUnavailable) return;
    setJobId(null);
    localStorage.removeItem(ACTIVE_SYNC_JOB_STORAGE_KEY);
  }, [jobStatusUnavailable]);

  const sync = () => {
    setSyncWarnings([]);
    startSync.mutate(undefined, {
      onSuccess: ({ jobId: startedJobId }) => {
        localStorage.setItem(ACTIVE_SYNC_JOB_STORAGE_KEY, startedJobId);
        setJobId(startedJobId);
        toast.info('Sync started — looking for statement emails…');
      },
      onError: (error) =>
        toast.error('Could not start sync', { description: mutationErrorMessage(error) }),
    });
  };

  const isSyncing = startSync.isPending || !!jobId;

  return {
    sync,
    isSyncing,
    syncWarnings,
    dismissWarnings: () => setSyncWarnings([]),
  };
}

function EmptyCardsState({ onAddCard }: { onAddCard: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center text-center py-14 px-6 gap-4">
        <CreditCardIcon className="h-12 w-12 text-muted-foreground opacity-40" />
        <div className="space-y-2 max-w-lg">
          <p className="text-lg font-medium">Track your credit cards from their statements</p>
          <p className="text-sm text-muted-foreground">
            We read the monthly statement PDFs your bank emails you and pull out every spend, EMI,
            interest charge and GST line. You&apos;ll need a Gmail account linked in{' '}
            <Link href="/integrations" className="underline text-primary">
              Integrations
            </Link>
            .
          </p>
          <p className="text-sm text-muted-foreground">
            Add a card with the email address its statements come from. The PDF password is optional
            — if you leave it blank we try common name and date-of-birth formats and remember the
            one that works. We also read your bank&apos;s spend-alert emails to show this
            cycle&apos;s spending live, before the statement arrives.
          </p>
        </div>
        <Button onClick={onAddCard}>
          <Plus className="h-4 w-4 mr-2" />
          Add card
        </Button>
      </CardContent>
    </Card>
  );
}

function SyncWarnings({ warnings, onDismiss }: { warnings: string[]; onDismiss: () => void }) {
  if (warnings.length === 0) return null;

  return (
    <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-yellow-800 dark:text-yellow-300 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          Sync warnings
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-yellow-800 dark:text-yellow-300"
          onClick={onDismiss}
          aria-label="Dismiss sync warnings"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {warnings.map((warning, index) => (
        <p key={index} className="text-xs text-yellow-700 dark:text-yellow-400 break-words">
          {warning}
        </p>
      ))}
    </div>
  );
}

function ChartCard({ options }: { options: Highcharts.Options }) {
  return (
    <Card className="min-w-0">
      <CardContent className="pt-4">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </CardContent>
    </Card>
  );
}

function CreditCardsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full sm:w-96" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-56 w-full" />
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

export function CreditCardsTab() {
  const theme = useAppStore((state) => state.theme);
  const [selectedCardId, setSelectedCardId] = useState<string>(ALL_CARDS);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const { sync, isSyncing, syncWarnings, dismissWarnings } = useCardStatementSync();

  const { data: cards = [], isLoading: cardsLoading } = useCreditCardsQuery();
  const { data: statements = [] } = useCreditCardStatementsQuery();
  const { data: allTransactions = [], isLoading: transactionsLoading } =
    useCreditCardTransactionsQuery();
  const { data: allAlerts = [] } = useCreditCardAlertsQuery();

  const isFilteredToCard = selectedCardId !== ALL_CARDS;
  const visibleCards = useMemo(
    () => (isFilteredToCard ? cards.filter((card) => card._id === selectedCardId) : cards),
    [cards, isFilteredToCard, selectedCardId]
  );
  const transactions = useMemo(
    () =>
      isFilteredToCard
        ? allTransactions.filter((tx) => tx.cardId === selectedCardId)
        : allTransactions,
    [allTransactions, isFilteredToCard, selectedCardId]
  );
  const alerts = useMemo(
    () =>
      isFilteredToCard ? allAlerts.filter((alert) => alert.cardId === selectedCardId) : allAlerts,
    [allAlerts, isFilteredToCard, selectedCardId]
  );
  const dueSummaries = useMemo(
    () => latestStatementByCard(visibleCards, statements),
    [visibleCards, statements]
  );
  const cycleSpendByCard = useMemo(() => currentCycleSpendByCard(alerts), [alerts]);
  const liveSummary = useMemo(() => summariseLiveAlerts(alerts), [alerts]);

  const { summary, emiPlans, monthlySpendOptions, categoryOptions, costOfCreditOptions } =
    useCreditCardsData({ cards, transactions, theme });

  const activeEmiCount = emiPlans.filter(isActiveEmiPlan).length;

  useEffect(() => {
    if (isFilteredToCard && !cardsLoading && !cards.some((card) => card._id === selectedCardId)) {
      setSelectedCardId(ALL_CARDS);
    }
  }, [cards, cardsLoading, isFilteredToCard, selectedCardId]);

  if (cardsLoading) return <CreditCardsSkeleton />;

  if (cards.length === 0) {
    return (
      <>
        <EmptyCardsState onAddCard={() => setIsAddCardOpen(true)} />
        <CardFormDialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={selectedCardId} onValueChange={setSelectedCardId}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CARDS}>All cards</SelectItem>
            {cards.map((card) => (
              <SelectItem key={card._id} value={card._id}>
                {cardDisplayName(card)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2">
          <Button onClick={sync} disabled={isSyncing} className="gap-2 flex-1 sm:flex-none">
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing…' : 'Sync statements'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsManageOpen(true)}
            className="gap-2 flex-1 sm:flex-none"
          >
            <Settings2 className="h-4 w-4" />
            Manage cards
          </Button>
        </div>
      </div>

      <SyncWarnings warnings={syncWarnings} onDismiss={dismissWarnings} />

      <CardSummaryStrip summaries={dueSummaries} cycleSpendByCard={cycleSpendByCard} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryStatCard
          label="This cycle (live)"
          value={formatCurrency(liveSummary.total)}
          loading={transactionsLoading}
        >
          <p className="text-[10px] text-muted-foreground mt-1">
            From alert emails since the last statement
          </p>
        </SummaryStatCard>
        <SummaryStatCard
          label="Spent this month"
          value={formatCurrency(summary.spend.thisMonth)}
          loading={transactionsLoading}
        >
          <p className="text-[10px] text-muted-foreground mt-1">Billed statements only</p>
        </SummaryStatCard>
        <SummaryStatCard
          label="Cost of credit"
          value={formatCurrency(summary.costOfCreditTotal)}
          valueClassName={summary.costOfCreditTotal > 0 ? 'text-red-600 dark:text-red-400' : ''}
          loading={transactionsLoading}
        >
          <p className="text-[10px] text-muted-foreground mt-1">Interest + GST + fees</p>
        </SummaryStatCard>
        <SummaryStatCard label="Active EMIs" value={activeEmiCount} loading={transactionsLoading} />
      </div>

      {transactions.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard options={monthlySpendOptions} />
            <ChartCard options={categoryOptions} />
          </div>
          {summary.costOfCreditTotal > 0 && <ChartCard options={costOfCreditOptions} />}
        </>
      )}

      <EmiPlansSection plans={emiPlans} cards={cards} />

      <CardTransactionsTable
        cards={cards}
        transactions={transactions}
        alerts={alerts}
        isLoading={transactionsLoading}
      />

      <ManageCardsDialog open={isManageOpen} onOpenChange={setIsManageOpen} cards={cards} />
    </div>
  );
}
