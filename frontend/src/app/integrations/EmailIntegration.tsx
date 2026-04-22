'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useUserProfileQuery,
  useEmailIntegrationStatusQuery,
  useSyncJobStatusQuery,
} from '@/api/query';
import {
  useEmailSyncMutation,
  useEmailImportMutation,
  useCancelSyncMutation,
} from '@/api/mutations';
import { apiRequest } from '@/api/configs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, AlertTriangle, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import { EmailSyncPreview as EmailSyncPreviewType } from '@/api/dataInterface';
import LinkedAccountsList from './LinkedAccountsList';
import EmailSyncPreviewCard from './EmailSyncPreview';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';

function OAuthRedirectHandler({
  onEmailConnected,
  onEmailError,
}: {
  onEmailConnected: () => void;
  onEmailError: (msg: string) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailConnected = searchParams.get('emailConnected');
    const emailError = searchParams.get('emailError');

    if (emailConnected === 'true') {
      onEmailConnected();
      window.history.replaceState({}, '', '/integrations');
    } else if (emailError) {
      onEmailError(decodeURIComponent(emailError));
      window.history.replaceState({}, '', '/integrations');
    }
  }, [searchParams, onEmailConnected, onEmailError]);

  return null;
}

export default function EmailIntegration({
  onConnected,
  onConnectionError,
}: {
  onConnected: () => void;
  onConnectionError: (msg: string) => void;
}) {
  const { data: profile } = useUserProfileQuery();
  const { data: status, isLoading, refetch } = useEmailIntegrationStatusQuery();
  const { mutateAsync: sync, isPending: isSyncSubmitting } = useEmailSyncMutation();
  const { mutateAsync: importTxns, isPending: isImporting } = useEmailImportMutation();
  const { mutateAsync: cancelSyncJob, isPending: isCancelling } = useCancelSyncMutation();

  const [preview, setPreview] = useState<EmailSyncPreviewType | null>(null);
  const [syncJobId, setSyncJobId] = useState<string | null>(null);

  // Restore job ID from localStorage so polling survives a page refresh
  useEffect(() => {
    const stored = localStorage.getItem('emailSync_activeJobId');
    if (stored) setSyncJobId(stored);
  }, []);

  // Pre-warm the Rust PDF parsing service on mount — fire and forget
  useEffect(() => {
    void apiRequest({ endpoint: '/email-integration/wake', method: 'GET' }).catch(() => {});
  }, []);

  const { data: syncJobData } = useSyncJobStatusQuery(syncJobId);
  const isSyncing = isSyncSubmitting || (!!syncJobId && syncJobData?.status === 'processing');

  // When the job finishes, lift the results into preview state
  useEffect(() => {
    if (!syncJobData) return;
    if (syncJobData.status === 'done' && syncJobData.result) {
      const result = syncJobData.result;
      setPreview(result);
      setSyncJobId(null);
      localStorage.removeItem('emailSync_activeJobId');
      const total =
        result.mutualFunds.length +
        result.gold.length +
        (result.stocks?.length ?? 0) +
        (result.crypto?.length ?? 0);
      if (total === 0 && result.duplicatesSkipped === 0 && result.errors.length === 0) {
        toast.info('No new transactions found');
      } else {
        toast.success(
          `Found ${total} new transaction${total !== 1 ? 's' : ''} (${result.duplicatesSkipped} duplicates skipped)`
        );
      }
    } else if (syncJobData.status === 'failed') {
      setSyncJobId(null);
      localStorage.removeItem('emailSync_activeJobId');
      toast.error(syncJobData.error ?? 'Sync failed');
    } else if (syncJobData.status === 'cancelled') {
      setSyncJobId(null);
      localStorage.removeItem('emailSync_activeJobId');
      toast.info('Sync stopped');
    }
  }, [syncJobData]);

  const handleConnect = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/email-integration/oauth/connect`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success && json.data?.authUrl) {
        window.location.href = json.data.authUrl;
      } else {
        toast.error('Failed to get auth URL');
      }
    } catch {
      toast.error('Connection failed');
    }
  };

  const handleSync = async () => {
    try {
      const { jobId } = await sync();
      localStorage.setItem('emailSync_activeJobId', jobId);
      setSyncJobId(jobId);
      toast.info('Sync started — checking for new emails…');
    } catch {
      toast.error('Sync failed');
    }
  };

  const handleStop = async () => {
    if (!syncJobId) return;
    try {
      await cancelSyncJob(syncJobId);
      localStorage.removeItem('emailSync_activeJobId');
      setSyncJobId(null);
      toast.info('Sync stopped');
    } catch {
      toast.error('Failed to stop sync');
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    try {
      const result = await importTxns({
        mutualFunds: preview.mutualFunds,
        gold: preview.gold,
        stocks: preview.stocks ?? [],
        crypto: preview.crypto ?? [],
      });
      toast.success(`Imported ${result.total} transaction${result.total !== 1 ? 's' : ''}`);
      setPreview(null);
      await refetch();
    } catch {
      toast.error('Import failed');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const accounts = status?.accounts ?? [];
  const connected = accounts.length > 0;
  const missingPhone = !profile?.phone;
  const missingPan = !profile?.panNumber;
  const canSync = !missingPhone && !missingPan;

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <OAuthRedirectHandler onEmailConnected={onConnected} onEmailError={onConnectionError} />
      </Suspense>

      <div>
        <h2 className="text-2xl font-bold mb-1">Email Import</h2>
        <p className="text-muted-foreground">
          Auto-import mutual fund, gold, and crypto transactions from CDSL eCAS, SafeGold, and
          CoinDCX emails.
        </p>
      </div>

      <LinkedAccountsList
        accounts={accounts}
        onConnect={handleConnect}
        onAccountRemoved={() => {
          setPreview(null);
          refetch();
        }}
        isSyncing={isSyncing}
      />

      {connected && (missingPhone || missingPan) && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 text-sm">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-yellow-800 dark:text-yellow-300">
            <p className="font-medium mb-1">Profile incomplete — sync disabled</p>
            <p className="text-xs">
              {[missingPhone && 'Phone number', missingPan && 'PAN number']
                .filter(Boolean)
                .join(' and ')}{' '}
              {missingPhone && missingPan ? 'are' : 'is'} required to open password-protected PDFs.
              Set {missingPhone && missingPan ? 'them' : 'it'} in{' '}
              <a href="/profile" className="underline font-medium">
                Profile
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {connected && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Sync Emails</CardTitle>
                <div className="flex items-center gap-2">
                  {isSyncing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStop}
                      disabled={isCancelling}
                      className="gap-2"
                    >
                      <StopCircle className="h-4 w-4" />
                      {isCancelling ? 'Stopping…' : 'Stop'}
                    </Button>
                  )}
                  <Button onClick={handleSync} disabled={isSyncing || !canSync} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing…' : 'Sync Now'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Fetches emails from all linked accounts and extracts transactions. You&apos;ll get a
                preview before anything is saved.
              </p>
              {preview && preview.errors.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-yellow-800 dark:text-yellow-300 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Sync warnings
                  </div>
                  {preview.errors.map((e, i) => (
                    <p key={i} className="text-xs text-yellow-700 dark:text-yellow-400">
                      {e}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {preview && (
            <EmailSyncPreviewCard
              preview={preview}
              onImport={handleImport}
              isImporting={isImporting}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What gets imported</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="space-y-1">
                <p className="font-medium text-foreground">CDSL eCAS (monthly email)</p>
                <p>
                  Mutual fund transactions and equity holdings. Password: your PAN number (set in
                  Profile).
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">SafeGold (monthly email)</p>
                <p>
                  Gold purchase and sale transactions. Password: first 4 letters of your name + last
                  4 digits of your phone (set in Profile).
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">CoinDCX (trade confirmation email)</p>
                <p>Crypto trades from &ldquo;CoinDCX Trade Executed&rdquo; emails.</p>
              </div>
              <p className="text-xs border-t pt-3">
                Make sure your PAN number and phone number are set in{' '}
                <a href="/profile" className="text-primary underline">
                  Profile
                </a>{' '}
                for password-protected PDFs to open correctly.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
