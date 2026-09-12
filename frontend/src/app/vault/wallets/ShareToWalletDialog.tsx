'use client';

import { useEffect, useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { WalletSummary } from '@/api/dataInterface';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VaultDecryptedItem, getItemTitle, getShareableFields, maskValue } from '../vaultTypes';

interface ShareToWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: VaultDecryptedItem | null;
  wallets: { summary: WalletSummary; name: string }[];
  onShare: (walletId: string, selectedFieldNames: string[]) => Promise<void>;
  isPending: boolean;
}

export function ShareToWalletDialog({
  open,
  onOpenChange,
  item,
  wallets,
  onShare,
  isPending,
}: ShareToWalletDialogProps) {
  const [walletId, setWalletId] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const fields = useMemo(
    () => (item ? getShareableFields(item.category, item.content) : []),
    [item]
  );

  useEffect(() => {
    if (!open || !item) return;
    setSelected(fields.filter((field) => field.shareByDefault).map((field) => field.name));
    setWalletId((current) => current || wallets[0]?.summary.id || '');
  }, [open, item, fields, wallets]);

  const toggle = (name: string) => {
    setSelected((current) =>
      current.includes(name) ? current.filter((entry) => entry !== name) : [...current, name]
    );
  };

  const secretsSelected = fields.filter(
    (field) => field.secret && selected.includes(field.name)
  ).length;

  const handleShare = async () => {
    if (!walletId || selected.length === 0 || isPending) return;
    try {
      await onShare(walletId, selected);
      onOpenChange(false);
      toast.success('Shared to wallet');
    } catch (error) {
      toast.error('Could not share to the wallet', { description: (error as Error)?.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share to a wallet</DialogTitle>
          {item && (
            <p className="text-sm text-muted-foreground">
              Choose exactly what the other members of the wallet can see of{' '}
              <span className="font-medium text-foreground">
                {getItemTitle(item.category, item.content)}
              </span>
              .
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {wallets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have no wallets yet. Create one from the Wallets tab first.
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <span className="text-sm font-medium">Wallet</span>
                <Select value={walletId} onValueChange={setWalletId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map(({ summary, name }) => (
                      <SelectItem key={summary.id} value={summary.id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Fields to share</span>
                <div className="rounded-lg border divide-y">
                  {fields.map((field) => {
                    const isChecked = selected.includes(field.name);
                    return (
                      <label
                        key={field.name}
                        className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-accent/40"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(field.name)}
                          className="h-4 w-4 rounded border-input accent-primary shrink-0"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm">{field.label}</span>
                          <span className="block text-xs text-muted-foreground truncate font-mono">
                            {field.secret ? maskValue(field.value) : field.value}
                          </span>
                        </span>
                        {field.secret && (
                          <TriangleAlert
                            className="h-4 w-4 text-amber-500 shrink-0"
                            aria-label="Sensitive field"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {secretsSelected > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <TriangleAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">
                      You are sharing {secretsSelected} sensitive{' '}
                      {secretsSelected === 1 ? 'field' : 'fields'}
                    </p>
                    <p className="text-muted-foreground">
                      Members can read and copy these, and removing someone later cannot undo what
                      they already saw. Card issuers also treat sharing full card credentials as a
                      breach of your cardholder terms.
                    </p>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                This shares a copy. Editing the entry in your vault will not update it — use
                Re-share to push changes.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!walletId || selected.length === 0 || isPending} onClick={handleShare}>
            {isPending ? 'Sharing…' : `Share ${selected.length} fields`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
