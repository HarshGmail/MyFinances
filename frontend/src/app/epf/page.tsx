'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  useEpfQuery,
  useEpfTimelineQuery,
  useInflationQuery,
  useUserProfileQuery,
} from '@/api/query';
import { useAddEpfAccountMutation } from '@/api/mutations';
import { EpfAccountPayload } from '@/api/dataInterface';
import { useAppStore } from '@/store/useAppStore';

import { calculateEPFGrowth } from './useEpfCalculations';
import { EpfPageSkeleton } from './EpfPageSkeleton';
import { EpfAccountsDrawer } from './EpfAccountsDrawer';
import { AddEpfAccountDialog } from './AddEpfAccountDialog';
import { EpfSummaryCards } from './EpfSummaryCards';
import { EpfGrowthChart } from './EpfGrowthChart';
import { EpfContributionTimeline } from './EpfContributionTimeline';
import { EpfPassbookImportDialog } from './EpfPassbookImportDialog';

const epfAccountSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
  epfAmount: z.number().min(1, 'EPF amount must be greater than 0'),
  creditDay: z.number().min(1).max(31),
  startDate: z.date(),
});

export default function EPFPage() {
  const { theme } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const form = useForm<EpfAccountPayload>({
    resolver: zodResolver(epfAccountSchema),
    defaultValues: {
      organizationName: '',
      epfAmount: 0,
      creditDay: 5,
      startDate: new Date(),
    },
  });

  const { mutateAsync: addAccount, isPending } = useAddEpfAccountMutation();
  const { data, refetch, isLoading: epfLoading, error: epfError } = useEpfQuery();
  const { data: user } = useUserProfileQuery();
  const { data: inflationData } = useInflationQuery(5);
  const {
    data: timelineData,
    refetch: refetchTimeline,
    isLoading: timelineLoading,
    error: timelineError,
  } = useEpfTimelineQuery();

  const isLoading = epfLoading || timelineLoading;
  const error = epfError || timelineError;

  const inflationAnnualPct =
    Number.isFinite(inflationData?.average) && inflationData?.average !== undefined
      ? inflationData.average
      : 5;

  const { yearlyData, summary } = calculateEPFGrowth(data ?? [], user?.dob, inflationAnnualPct);

  const onSubmit = async (values: EpfAccountPayload) => {
    try {
      await addAccount(values);
      setDialogOpen(false);
      toast.success('EPF account added successfully');
      form.reset();
      await refetch();
      await refetchTimeline();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleAddAccountClick = () => {
    setDrawerOpen(false);
    setTimeout(() => setDialogOpen(true), 150);
  };

  if (isLoading) return <EpfPageSkeleton />;

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-3xl font-bold text-center mb-8">EPF</h1>
        <div className="text-red-500 text-center">Error loading EPF data</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-center flex-1">EPF</h1>
        <div className="flex items-center gap-2">
          <button
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            onClick={() => setImportDialogOpen(true)}
          >
            Import Passbook
          </button>
          <EpfAccountsDrawer
            accounts={data}
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            onAddAccountClick={handleAddAccountClick}
          />
        </div>
      </div>

      <EpfPassbookImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />

      <AddEpfAccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        onSubmit={onSubmit}
        isPending={isPending}
      />

      {data && data.length > 0 && summary && timelineData && (
        <div className="space-y-6">
          <EpfSummaryCards summary={summary} currentBalance={timelineData.totalCurrentBalance} />
          <EpfGrowthChart
            yearlyData={yearlyData}
            inflationAnnualPct={inflationAnnualPct}
            theme={theme}
          />
          <EpfContributionTimeline timelineData={timelineData} />
        </div>
      )}
    </div>
  );
}
