'use client';

import { useState } from 'react';
import {
  useExpensesQuery,
  useUserProfileQuery,
  useGoldTransactionsQuery,
  useCryptoTransactionsQuery,
  useStockTransactionsQuery,
  useMutualFundTransactionsQuery,
  useRecurringDepositsQuery,
  useExpenseTransactionsQuery,
  useExpenseTransactionNamesQuery,
} from '@/api/query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/useAppStore';
import { Plus } from 'lucide-react';
import { useDashboardData } from './useDashboardData';
import { useTrackerData } from './useTrackerData';
import { DashboardTab } from './DashboardTab';
import { TrackerTab } from './TrackerTab';

type Tab = 'dashboard' | 'tracker';

export default function ExpensesPage() {
  const { theme } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [trackerDrawerOpen, setTrackerDrawerOpen] = useState(false);

  const { data: user, isLoading: userLoading } = useUserProfileQuery();
  const { data: expenses, isLoading: expensesLoading } = useExpensesQuery();
  const { data: goldTransactions, isLoading: goldLoading } = useGoldTransactionsQuery();
  const { data: cryptoTransactions, isLoading: cryptoLoading } = useCryptoTransactionsQuery();
  const { data: stockTransactions, isLoading: stockLoading } = useStockTransactionsQuery();
  const { data: mutualFundTransactions, isLoading: mfLoading } = useMutualFundTransactionsQuery();
  const { data: rdData, isLoading: rdLoading } = useRecurringDepositsQuery();
  const { data: expenseTransactions, isLoading: transactionsLoading } = useExpenseTransactionsQuery();
  const { data: expenseNames } = useExpenseTransactionNamesQuery();

  const isLoading =
    userLoading || expensesLoading || goldLoading || cryptoLoading || stockLoading || mfLoading || rdLoading;

  const dashboard = useDashboardData({
    user, expenses, goldTransactions, cryptoTransactions,
    stockTransactions, mutualFundTransactions, rdData, theme,
  });
  const tracker = useTrackerData({ expenseTransactions, theme });

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
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-6 w-20" /></CardContent>
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
          <h1 className="text-3xl font-bold">
            {activeTab === 'dashboard' ? 'Financial Dashboard' : 'Expense Tracker'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {activeTab === 'dashboard'
              ? 'Track your income, investments, and spending patterns'
              : 'Log and analyze your day-to-day expenses'}
          </p>
        </div>
        {activeTab === 'tracker' && (
          <Button onClick={() => setTrackerDrawerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Expense
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['dashboard', 'tracker'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 capitalize transition-colors',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {tab}
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
    </div>
  );
}
