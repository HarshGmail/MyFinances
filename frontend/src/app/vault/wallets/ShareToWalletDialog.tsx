'use client';

import { useEffect, useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { WalletSummary } from '@myfinances/core/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VaultDecryptedItem, getItemTitle, getShareableFields, maskValue } from '../vaultTypes';

interface ShareToWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: VaultDecryptedItem[];
  wallets: { summary: WalletSummary; name: string }[];
  onShare: (
    walletIds: string[],
    selectedFieldNamesByItemId: Record<string, string[]>
  ) => Promise<void>;
  isPending: boolean;
}

function defaultFieldNames(item: VaultDecryptedItem): string[] {
  return getShareableFields(item.category, item.content)
    .filter((field) => field.shareByDefault)
    .map((field) => field.name);
}

function toggleIn(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

export function ShareToWalletDialog({
  open,
  onOpenChange,
  items,
  wallets,
  onShare,
  isPending,
}: ShareToWalletDialogProps) {
  const [walletIds, setWalletIds] = useState<string[]>([]);
  const [selectedByItem, setSelectedByItem] = useState<Record<string, string[]>>({});

  const isSingleItem = items.length === 1;
  const singleItem = isSingleItem ? items[0] : null;
  const onlyWalletId = wallets.length === 1 ? wallets[0].summary.id : null;

  const singleItemFields = useMemo(
    () => (singleItem ? getShareableFields(singleItem.category, singleItem.content) : []),
    [singleItem]
  );

  const itemsSignature = items.map((item) => item.id).join(',');

  useEffect(() => {
    if (!open || items.length === 0) return;
    const defaults: Record<string, string[]> = {};
    for (const item of items) defaults[item.id] = defaultFieldNames(item);
    setSelectedByItem(defaults);
    setWalletIds(onlyWalletId ? [onlyWalletId] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemsSignature, onlyWalletId]);

  const selectedFieldCount = Object.values(selectedByItem).reduce(
    (total, names) => total + names.length,
    0
  );

  const secretsSelected = items.reduce((total, item) => {
    const selected = new Set(selectedByItem[item.id] ?? []);
    return (
      total +
      getShareableFields(item.category, item.content).filter(
        (field) => field.secret && selected.has(field.name)
      ).length
    );
  }, 0);

  const itemsWithNothingSelected = items.filter(
    (item) => (selectedByItem[item.id] ?? []).length === 0
  ).length;

  const canShare =
    walletIds.length > 0 && selectedFieldCount > 0 && itemsWithNothingSelected === 0 && !isPending;

  const handleShare = async () => {
    if (!canShare) return;
    try {
      await onShare(walletIds, selectedByItem);
      onOpenChange(false);
      const entryLabel = items.length === 1 ? 'Entry' : `${items.length} entries`;
      const walletLabel = walletIds.length === 1 ? 'wallet' : `${walletIds.length} wallets`;
      toast.success(`${entryLabel} shared to ${walletLabel}`);
    } catch (error) {
      toast.error('Could not share to the wallet', { description: (error as Error)?.message });
    }
  };

  const shareButtonLabel = isPending
    ? 'Sharing…'
    : `Share ${selectedFieldCount} ${selectedFieldCount === 1 ? 'field' : 'fields'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isSingleItem ? 'Share to a wallet' : `Share ${items.length} entries`}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {singleItem ? (
              <>
                Choose exactly what the other members of the wallet can see of{' '}
                <span className="font-medium text-foreground">
                  {getItemTitle(singleItem.category, singleItem.content)}
                </span>
                .
              </>
            ) : (
              'Each entry shares only the fields ticked below. Sensitive fields start unticked.'
            )}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {wallets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have no wallets yet. Create one from the Wallets tab first.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <span className="text-sm font-medium">
                  {wallets.length === 1 ? 'Wallet' : 'Wallets'}
                </span>
                <div className="rounded-lg border divide-y">
                  {wallets.map(({ summary, name }) => (
                    <label
                      key={summary.id}
                      className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-accent/40"
                    >
                      <input
                        type="checkbox"
                        checked={walletIds.includes(summary.id)}
                        onChange={() => setWalletIds((current) => toggleIn(current, summary.id))}
                        className="h-4 w-4 rounded border-input accent-primary shrink-0"
                      />
                      <span className="flex-1 min-w-0 text-sm truncate">{name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {summary.memberCount} {summary.memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {singleItem ? (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Fields to share</span>
                  <div className="rounded-lg border divide-y">
                    {singleItemFields.map((field) => (
                      <label
                        key={field.name}
                        className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-accent/40"
                      >
                        <input
                          type="checkbox"
                          checked={(selectedByItem[singleItem.id] ?? []).includes(field.name)}
                          onChange={() =>
                            setSelectedByItem((current) => ({
                              ...current,
                              [singleItem.id]: toggleIn(current[singleItem.id] ?? [], field.name),
                            }))
                          }
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
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Entries and their fields</span>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const fields = getShareableFields(item.category, item.content);
                      const selected = selectedByItem[item.id] ?? [];
                      return (
                        <details
                          key={item.id}
                          className="rounded-lg border [&_summary::-webkit-details-marker]:hidden"
                        >
                          <summary className="flex cursor-pointer items-center justify-between gap-3 p-2.5 text-sm hover:bg-accent/40">
                            <span className="min-w-0 truncate font-medium">
                              {getItemTitle(item.category, item.content)}
                            </span>
                            <span
                              className={`shrink-0 text-xs ${
                                selected.length === 0 ? 'text-destructive' : 'text-muted-foreground'
                              }`}
                            >
                              {selected.length} of {fields.length}
                            </span>
                          </summary>
                          <div className="divide-y border-t">
                            {fields.map((field) => (
                              <label
                                key={field.name}
                                className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-accent/40"
                              >
                                <input
                                  type="checkbox"
                                  checked={selected.includes(field.name)}
                                  onChange={() =>
                                    setSelectedByItem((current) => ({
                                      ...current,
                                      [item.id]: toggleIn(current[item.id] ?? [], field.name),
                                    }))
                                  }
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
                            ))}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </div>
              )}

              {itemsWithNothingSelected > 0 && (
                <p className="text-sm text-destructive">
                  {itemsWithNothingSelected}{' '}
                  {itemsWithNothingSelected === 1 ? 'entry has' : 'entries have'} no fields ticked.
                  Tick at least one field, or deselect{' '}
                  {itemsWithNothingSelected === 1 ? 'it' : 'them'}.
                </p>
              )}

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
          <Button disabled={!canShare} onClick={handleShare}>
            {shareButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
