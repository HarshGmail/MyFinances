'use client';

import { RefreshCw } from 'lucide-react';
import type { SyncSource } from '@myfinances/core/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEmailSyncJob } from '@/hooks/useEmailSyncJob';
import EmailSyncPreviewCard from '@/app/integrations/EmailSyncPreview';
import { useEmailImportMutation } from '@myfinances/core/api';
import { toast } from 'sonner';

export function SyncNowAction({ source, label }: { source: SyncSource; label: string }) {
  const { sync, isSyncing, preview, clearPreview } = useEmailSyncJob({ sources: [source] });
  const { mutateAsync: importTxns, isPending: isImporting } = useEmailImportMutation();

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
      clearPreview();
    } catch {
      toast.error('Import failed');
    }
  };

  return (
    <>
      <Button variant="outline" onClick={sync} disabled={isSyncing} className="gap-2">
        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Syncing…' : 'Sync now'}
      </Button>
      <Dialog open={!!preview} onOpenChange={(open) => !open && clearPreview()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{label} — sync preview</DialogTitle>
          </DialogHeader>
          {preview && (
            <EmailSyncPreviewCard
              preview={preview}
              onImport={handleImport}
              isImporting={isImporting}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
