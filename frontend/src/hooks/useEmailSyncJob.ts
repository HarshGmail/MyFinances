'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCancelSyncMutation,
  useEmailSyncMutation,
  useSyncJobStatusQuery,
} from '@myfinances/core/api';
import type { EmailSyncPreview, SyncSource } from '@myfinances/core/types';
import { toast } from 'sonner';

const COMBINED_JOB_KEY = 'emailSync_activeJobId';

function storageKey(sources?: SyncSource[]): string {
  if (!sources || sources.length === 0) return COMBINED_JOB_KEY;
  return `emailSync_job_${[...sources].sort().join('-')}`;
}

function previewTotal(preview: EmailSyncPreview): number {
  return (
    preview.mutualFunds.length +
    preview.gold.length +
    (preview.stocks?.length ?? 0) +
    (preview.crypto?.length ?? 0)
  );
}

interface UseEmailSyncJobOptions {
  sources?: SyncSource[];
  onDone?: (preview: EmailSyncPreview) => void;
}

export function useEmailSyncJob({ sources, onDone }: UseEmailSyncJobOptions = {}) {
  const key = storageKey(sources);
  const queryClient = useQueryClient();
  const { mutateAsync: startSync, isPending: isStarting } = useEmailSyncMutation();
  const { mutateAsync: cancelSyncJob } = useCancelSyncMutation();
  const [jobId, setJobId] = useState<string | null>(null);
  const [preview, setPreview] = useState<EmailSyncPreview | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) setJobId(stored);
  }, [key]);

  const { data: jobStatus } = useSyncJobStatusQuery(jobId);
  const isSyncing = isStarting || (!!jobId && jobStatus?.status === 'processing');

  const clear = useCallback(() => {
    setJobId(null);
    localStorage.removeItem(key);
  }, [key]);

  useEffect(() => {
    if (!jobStatus) return;
    if (jobStatus.status === 'done' && jobStatus.result) {
      const result = jobStatus.result;
      setPreview(result);
      queryClient.invalidateQueries({ queryKey: ['goldLeases'] });
      clear();
      const total = previewTotal(result);
      if (total === 0 && result.duplicatesSkipped === 0 && result.errors.length === 0) {
        toast.info('No new transactions found');
      } else {
        toast.success(
          `Found ${total} new transaction${total !== 1 ? 's' : ''} (${result.duplicatesSkipped} duplicate${result.duplicatesSkipped !== 1 ? 's' : ''} skipped)`
        );
      }
      onDone?.(result);
    } else if (jobStatus.status === 'failed') {
      clear();
      toast.error(jobStatus.error ?? 'Sync failed');
    } else if (jobStatus.status === 'cancelled') {
      clear();
      toast.info('Sync stopped');
    }
  }, [jobStatus, queryClient, clear, onDone]);

  const sync = useCallback(async () => {
    try {
      const { jobId: startedJobId } = await startSync(sources);
      localStorage.setItem(key, startedJobId);
      setJobId(startedJobId);
      toast.info('Sync started — checking for new emails…');
    } catch {
      toast.error('Sync failed to start');
    }
  }, [startSync, sources, key]);

  const stop = useCallback(async () => {
    if (!jobId) return;
    try {
      await cancelSyncJob(jobId);
      clear();
      toast.info('Sync stopped');
    } catch {
      toast.error('Failed to stop sync');
    }
  }, [cancelSyncJob, jobId, clear]);

  const clearPreview = useCallback(() => setPreview(null), []);

  return { sync, stop, isSyncing, preview, clearPreview };
}
