'use client';

import { useState, useEffect } from 'react';
import {
  useExpensesQuery,
  useUserProfileQuery,
  useMonthlyInvestmentSummaryQuery,
  useExpenseTransactionsQuery,
  useExpenseTransactionNamesQuery,
} from '@myfinances/core/api';
import { useUpiEmailSyncMutation } from '@myfinances/core/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/useAppStore';
import { Plus } from 'lucide-react';
import { useDashboardData } from './useDashboardData';
import { useTrackerData } from './useTrackerData';
import { DashboardTab } from './DashboardTab';
import { TrackerTab } from './TrackerTab';
import { CreditCardsTab } from './credit-cards/CreditCardsTab';
import { useUrlState } from '@/utils/useUrlState';

type Tab = 'dashboard' | 'tracker' | 'cards';

const TABS = ['dashboard', 'tracker', 'cards'] as const satisfies readonly Tab[];

const TAB_LABELS: Record<Tab, string> = {
  dashboard: 'Dashboard',
  tracker: 'Tracker',
  cards: 'Credit Cards',
};

const TAB_HEADERS: Record<Tab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Financial Dashboard',
    subtitle: 'Track your income, investments, and spending patterns',
  },
  tracker: {
    title: 'Expense Tracker',
    subtitle: 'Log and analyze your day-to-day expenses',
  },
  cards: {
    title: 'Credit Cards',
    subtitle: 'Statements synced from your inbox — spends, EMIs, interest and GST',
  },
};

export default function ExpensesPage() {
  const { theme } = useAppStore();
  const [activeTab, setActiveTab] = useUrlState<Tab>('tab', 'dashboard', TABS);
  const [trackerDrawerOpen, setTrackerDrawerOpen] = useState(false);
  const { mutate: syncUpiEmails } = useUpiEmailSyncMutation();

  const { data: user, isLoading: userLoading } = useUserProfileQuery();
  const { data: expenses, isLoading: expensesLoading } = useExpensesQuery();
  const { data: monthlyInvestmentSummary, isLoading: summaryLoading } =
    useMonthlyInvestmentSummaryQuery();
  const { data: expenseTransactions, isLoading: transactionsLoading } =
    useExpenseTransactionsQuery();
  const { data: expenseNames } = useExpenseTransactionNamesQuery();

  const isLoading = userLoading || expensesLoading || summaryLoading;

  // Sync UPI emails when tracker tab opens
  useEffect(() => {
    if (activeTab === 'tracker') {
      syncUpiEmails();
    }
  }, [activeTab, syncUpiEmails]);

  const dashboard = useDashboardData({
    user,
    expenses,
    monthlyInvestmentSummary,
    theme,
  });
  const tracker = useTrackerData({ expenseTransactions, theme, user });

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{TAB_HEADERS[activeTab].title}</h1>
          <p className="text-muted-foreground mt-1">{TAB_HEADERS[activeTab].subtitle}</p>
        </div>
        {activeTab === 'tracker' && (
          <Button onClick={() => setTrackerDrawerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Expense
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard' && (
        <DashboardTab
          expenses={expenses}
          monthlyAnalysis={dashboard.monthlyAnalysis}
          currentMonthData={dashboard.currentMonthData}
          overallStats={dashboard.overallStats}
          cashFlowChartOptions={dashboard.cashFlowChartOptions}
          savingsRateChartOptions={dashboard.savingsRateChartOptions}
        />
      )}

      {activeTab === 'tracker' && (
        <TrackerTab
          expenseTransactions={expenseTransactions}
          expenseNames={expenseNames}
          isLoading={transactionsLoading}
          drawerOpen={trackerDrawerOpen}
          onDrawerOpenChange={setTrackerDrawerOpen}
          stats={tracker.stats}
          timelineOptions={tracker.timelineOptions}
          categoryOptions={tracker.categoryOptions}
          monthlyOptions={tracker.monthlyOptions}
        />
      )}

      {activeTab === 'cards' && <CreditCardsTab />}
    </div>
  );
}
