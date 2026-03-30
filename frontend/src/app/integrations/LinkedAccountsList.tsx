'use client';

import { useState, useEffect } from 'react';
import {
  useEmailDisconnectMutation,
  useEmailResetSyncMutation,
  useEmailUpdateSettingsMutation,
} from '@/api/mutations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, RefreshCw, Link, Link2Off } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { LinkedEmailAccount } from '@/api/dataInterface';

export default function LinkedAccountsList({
  accounts,
  onConnect,
  onAccountRemoved,
  isSyncing,
}: {
  accounts: LinkedEmailAccount[];
  onConnect: () => void;
  onAccountRemoved: () => void;
  isSyncing: boolean;
}) {
  const { mutateAsync: disconnect, isPending: isDisconnecting } = useEmailDisconnectMutation();
  const { mutateAsync: resetSync, isPending: isResettingSync } = useEmailResetSyncMutation();
  const { mutateAsync: updateSettings, isPending: isSavingSettings } =
    useEmailUpdateSettingsMutation();

  const [senderEdits, setSenderEdits] = useState<Record<string, string>>({});
  const [editingAccount, setEditingAccount] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const a of accounts) {
      initial[a.email] = a.safegoldSender ?? 'estatements@safegold.in';
    }
    setSenderEdits(initial);
  }, [accounts]);

  const handleDisconnect = async (email: string) => {
    try {
      await disconnect(email);
      onAccountRemoved();
      toast.success('Account disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  const handleResetSync = async (email: string) => {
    try {
      await resetSync(email);
      toast.success('Sync history cleared');
    } catch {
      toast.error('Failed to reset sync');
    }
  };

  const handleSaveSender = async (email: string) => {
    try {
      await updateSettings({ email, safegoldSender: senderEdits[email] ?? '' });
      setEditingAccount(null);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Linked Gmail Accounts</CardTitle>
          <Button onClick={onConnect} size="sm" variant="outline" className="gap-1.5">
            <Link className="h-3.5 w-3.5" />
            Add Account
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.length === 0 && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              Connect a Gmail account to read CDSL eCAS, SafeGold, and CoinDCX emails. We only
              request <strong>read-only</strong> access.
            </p>
            <Button onClick={onConnect} className="gap-2">
              <Link className="h-4 w-4" />
              Connect Gmail
            </Button>
          </div>
        )}
        {accounts.map((account) => (
          <div key={account.email} className="border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium text-sm">{account.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {account.lastSyncAt
                      ? `Last synced ${format(new Date(account.lastSyncAt), 'PPp')}`
                      : 'Never synced'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResetSync(account.email)}
                  disabled={isResettingSync || isSyncing}
                  title="Clear sync history — next sync will re-fetch all emails from the beginning"
                  className="gap-1 text-xs h-7"
                >
                  <RefreshCw className={`h-3 w-3 ${isResettingSync ? 'animate-spin' : ''}`} />
                  Full Re-sync
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDisconnect(account.email)}
                  disabled={isDisconnecting}
                  className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 h-7 text-xs"
                >
                  <Link2Off className="h-3 w-3" />
                  Remove
                </Button>
              </div>
            </div>

            <div className="space-y-1.5 pl-11">
              <Label className="text-xs text-muted-foreground">SafeGold sender email</Label>
              {editingAccount === account.email ? (
                <div className="flex gap-2">
                  <Input
                    value={senderEdits[account.email] ?? ''}
                    onChange={(e) =>
                      setSenderEdits((prev) => ({ ...prev, [account.email]: e.target.value }))
                    }
                    className="text-xs h-7"
                    placeholder="estatements@safegold.in"
                  />
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleSaveSender(account.email)}
                    disabled={isSavingSettings}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      setSenderEdits((prev) => ({
                        ...prev,
                        [account.email]: account.safegoldSender ?? 'estatements@safegold.in',
                      }));
                      setEditingAccount(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">
                    {senderEdits[account.email] || 'estatements@safegold.in'}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() => setEditingAccount(account.email)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
