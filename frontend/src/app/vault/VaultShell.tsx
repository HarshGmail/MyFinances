'use client';

import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { KeyRound, Lock, Plus, ScanFace, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { VaultCategory, VaultItemContent, WalletSummary } from '@/api/dataInterface';
import { useWalletsQuery } from '@/api/query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isIosDevice } from '@/lib/pwa';
import { useUrlState } from '@/utils/useUrlState';
import { CategoryRail } from './CategoryRail';
import { BiometricSetupDialog } from './BiometricSetupDialog';
import { ChangePinDialog } from './ChangePinDialog';
import { DestroyVaultDialog } from './DestroyVaultDialog';
import { VaultItemCard } from './VaultItemCard';
import { VaultItemDialog, VaultItemFormValues } from './VaultItemDialog';
import {
  VAULT_TAB_IDS,
  VaultDecryptedItem,
  VaultTabId,
  WALLETS_TAB_ID,
  buildSharedProjection,
  emptyContentFor,
  getCategoryDef,
  getItemTitle,
} from './vaultTypes';
import { ShareToWalletDialog } from './wallets/ShareToWalletDialog';
import { WalletsSection } from './wallets/WalletsSection';
import { useWalletActions } from './wallets/useWalletActions';
import { useWalletNames } from './wallets/useWalletNames';

interface VaultShellProps {
  items: VaultDecryptedItem[];
  damagedIds: string[];
  isBusy: boolean;
  publicKeyJwk: JsonWebKey | null;
  hasSharingKeys: boolean;
  resolveWalletKey: (
    walletId: string,
    wrappedWalletKey: WalletSummary['wrappedWalletKey'],
    keyEpoch: number
  ) => Promise<CryptoKey | null>;
  onLock: () => void;
  onSave: (category: VaultCategory, content: VaultItemContent, itemId?: string) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
  onChangePin: (newPin: string) => Promise<void>;
  onDestroy: () => Promise<void>;
  isBiometricAvailable: boolean;
  isBiometricEnrolled: boolean;
  onEnableBiometrics: (pin: string) => Promise<void>;
  onDisableBiometrics: () => Promise<void>;
}

function toFormValues(category: VaultCategory, item?: VaultDecryptedItem): VaultItemFormValues {
  const blank = emptyContentFor(category);
  return {
    fields: { ...blank.fields, ...(item?.content.fields ?? {}) },
    customFields: item?.content.customFields ?? [],
  };
}

function trimContent(values: VaultItemFormValues): VaultItemContent {
  const fields: Record<string, string> = {};
  for (const [name, value] of Object.entries(values.fields)) {
    const trimmed = (value ?? '').trim();
    if (trimmed) fields[name] = trimmed;
  }
  const customFields = values.customFields
    .map((field) => ({
      label: field.label.trim(),
      value: field.value.trim(),
      secret: Boolean(field.secret),
    }))
    .filter((field) => field.label && field.value);
  return { fields, customFields };
}

export function VaultShell({
  items,
  damagedIds,
  isBusy,
  publicKeyJwk,
  hasSharingKeys,
  resolveWalletKey,
  onLock,
  onSave,
  onRemove,
  onChangePin,
  onDestroy,
  isBiometricAvailable,
  isBiometricEnrolled,
  onEnableBiometrics,
  onDisableBiometrics,
}: VaultShellProps) {
  const [activeTab, setActiveTab] = useUrlState<VaultTabId>(
    'tab',
    'bank',
    VAULT_TAB_IDS as readonly VaultTabId[]
  );
  const isWalletsTab = activeTab === WALLETS_TAB_ID;
  const category = (isWalletsTab ? 'bank' : activeTab) as VaultCategory;
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultDecryptedItem | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<VaultDecryptedItem | null>(null);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [isBiometricSetupOpen, setIsBiometricSetupOpen] = useState(false);
  const [isDestroyOpen, setIsDestroyOpen] = useState(false);
  const [sharingItem, setSharingItem] = useState<VaultDecryptedItem | null>(null);
  const [isIos, setIsIos] = useState(false);
  const biometricLabel = isIos ? 'Face ID' : 'biometric unlock';

  useEffect(() => {
    setIsIos(isIosDevice());
  }, []);

  const {
    data: wallets,
    isLoading: isLoadingWallets,
    refetch: refetchWallets,
  } = useWalletsQuery(hasSharingKeys);
  const walletNames = useWalletNames(wallets, resolveWalletKey);
  const walletActions = useWalletActions({
    publicKeyJwk,
    resolveWalletKey,
    refetchWallets,
  });

  const form = useForm<VaultItemFormValues>({ defaultValues: toFormValues('bank') });
  const definition = getCategoryDef(category);

  const counts = useMemo(() => {
    const tally: Record<string, number> = {};
    for (const item of items) tally[item.category] = (tally[item.category] ?? 0) + 1;
    return tally;
  }, [items]);

  const visibleItems = useMemo(
    () => items.filter((item) => item.category === category),
    [items, category]
  );

  const walletOptions = useMemo(
    () =>
      (wallets ?? []).map((summary) => ({
        summary,
        name: walletNames[summary.id] ?? 'Wallet',
      })),
    [wallets, walletNames]
  );

  const handleShareToWallet = async (walletId: string, selectedFieldNames: string[]) => {
    if (!sharingItem) return;
    const target = wallets?.find((entry) => entry.id === walletId);
    if (!target) throw new Error('That wallet is no longer available');
    const projection = buildSharedProjection(
      sharingItem.category,
      sharingItem.content,
      selectedFieldNames
    );
    await walletActions.shareItemToWallet(target, sharingItem.category, projection, sharingItem.id);
  };

  const openAddDialog = () => {
    setEditingItem(null);
    form.reset(toFormValues(category));
    setIsItemDialogOpen(true);
  };

  const openEditDialog = (item: VaultDecryptedItem) => {
    setEditingItem(item);
    form.reset(toFormValues(item.category, item));
    setIsItemDialogOpen(true);
  };

  const handleSubmit = async (values: VaultItemFormValues) => {
    const content = trimContent(values);
    if (!content.fields[definition.titleField]) {
      toast.error(
        `${definition.fields.find((f) => f.name === definition.titleField)?.label} is required`
      );
      return;
    }
    try {
      await onSave(editingItem?.category ?? category, content, editingItem?.id);
      setIsItemDialogOpen(false);
      setEditingItem(null);
      toast.success(editingItem ? 'Entry updated' : 'Entry saved');
    } catch (error) {
      toast.error('Could not save the entry', { description: (error as Error)?.message });
    }
  };

  const handleDelete = async () => {
    if (!pendingDeletion) return;
    try {
      await onRemove(pendingDeletion.id);
      toast.success('Entry deleted');
      setPendingDeletion(null);
    } catch (error) {
      toast.error('Could not delete the entry', { description: (error as Error)?.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Encrypted in this browser with your PIN · locks itself after 5 minutes idle
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isBiometricAvailable && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() =>
                isBiometricEnrolled ? onDisableBiometrics() : setIsBiometricSetupOpen(true)
              }
            >
              <ScanFace className="h-4 w-4" />
              {isBiometricEnrolled ? `Disable ${biometricLabel}` : `Enable ${biometricLabel}`}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setIsChangePinOpen(true)}
          >
            <KeyRound className="h-4 w-4" />
            Change PIN
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setIsDestroyOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Destroy
          </Button>
          <Button size="sm" className="gap-1.5" onClick={onLock}>
            <Lock className="h-4 w-4" />
            Lock now
          </Button>
        </div>
      </div>

      {damagedIds.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="py-3 text-sm">
            {damagedIds.length} {damagedIds.length === 1 ? 'entry' : 'entries'} could not be
            decrypted. This usually means the stored data was altered outside the app.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-56 shrink-0">
          <CategoryRail
            selected={activeTab}
            onSelect={setActiveTab}
            counts={{ ...counts, [WALLETS_TAB_ID]: wallets?.length ?? 0 }}
          />
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          {isWalletsTab ? (
            <WalletsSection
              wallets={wallets}
              names={walletNames}
              isLoading={isLoadingWallets}
              hasSharingKeys={hasSharingKeys}
              isPending={walletActions.isWalletBusy}
              onCreate={walletActions.createWallet}
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{definition.label}</h2>
                  <p className="text-sm text-muted-foreground">{definition.description}</p>
                </div>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={openAddDialog}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>

              {visibleItems.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <definition.icon className="h-10 w-10 mx-auto text-muted-foreground/50" />
                    <p className="mt-3 font-medium">No {definition.label.toLowerCase()} yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add your first {definition.singular.toLowerCase()} to keep it encrypted here.
                    </p>
                    <Button size="sm" className="mt-4 gap-1.5" onClick={openAddDialog}>
                      <Plus className="h-4 w-4" />
                      Add {definition.singular}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {visibleItems.map((item) => (
                    <VaultItemCard
                      key={item.id}
                      item={item}
                      onEdit={openEditDialog}
                      onDelete={setPendingDeletion}
                      onShare={hasSharingKeys ? setSharingItem : undefined}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <VaultItemDialog
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        category={editingItem?.category ?? category}
        isEditing={Boolean(editingItem)}
        form={form}
        onSubmit={handleSubmit}
        isPending={isBusy}
      />

      <ShareToWalletDialog
        open={Boolean(sharingItem)}
        onOpenChange={(next) => {
          if (!next) setSharingItem(null);
        }}
        item={sharingItem}
        wallets={walletOptions}
        onShare={handleShareToWallet}
        isPending={walletActions.isWalletBusy}
      />

      <ChangePinDialog
        open={isChangePinOpen}
        onOpenChange={setIsChangePinOpen}
        onChangePin={onChangePin}
        isPending={isBusy}
        damagedCount={damagedIds.length}
      />

      <BiometricSetupDialog
        open={isBiometricSetupOpen}
        onOpenChange={setIsBiometricSetupOpen}
        onEnable={onEnableBiometrics}
        isPending={isBusy}
      />

      <DestroyVaultDialog
        open={isDestroyOpen}
        onOpenChange={setIsDestroyOpen}
        onDestroy={onDestroy}
        isPending={isBusy}
        itemCount={items.length}
      />

      <Dialog open={Boolean(pendingDeletion)} onOpenChange={() => setPendingDeletion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">
            {pendingDeletion && getItemTitle(pendingDeletion.category, pendingDeletion.content)}{' '}
            will be permanently removed from your vault.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeletion(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isBusy} onClick={handleDelete}>
              {isBusy ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
