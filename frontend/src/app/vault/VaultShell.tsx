'use client';

import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { CheckSquare, KeyRound, Lock, Plus, ScanFace, Share2, Trash2, X } from 'lucide-react';
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
import { VaultFilterBar } from './VaultFilterBar';
import { VaultItemCard } from './VaultItemCard';
import { VaultItemDialog, VaultItemFormValues } from './VaultItemDialog';
import {
  EMPTY_FILTER_OPTIONS,
  EMPTY_VAULT_FILTERS,
  applyVaultFilters,
  buildFilterOptions,
  getBankFilterLabel,
  isFilterableCategory,
} from './vaultFilters';
import {
  VAULT_FACE_GRID_CLASS,
  VAULT_TAB_IDS,
  VaultDecryptedItem,
  VaultTabId,
  WALLETS_TAB_ID,
  applyDerivedFields,
  buildSharedProjection,
  emptyContentFor,
  getCategoryDef,
  getItemTitle,
  hasCardFace,
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
  const [sharingItems, setSharingItems] = useState<VaultDecryptedItem[]>([]);
  const [filters, setFilters] = useState(EMPTY_VAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
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

  const categoryItems = useMemo(
    () => items.filter((item) => item.category === category),
    [items, category]
  );

  const isFilterable = isFilterableCategory(category);

  const filterOptions = useMemo(
    () => (isFilterable ? buildFilterOptions(categoryItems) : EMPTY_FILTER_OPTIONS),
    [categoryItems, isFilterable]
  );

  const visibleItems = useMemo(
    () => (isFilterable ? applyVaultFilters(categoryItems, filters) : categoryItems),
    [categoryItems, filters, isFilterable]
  );

  useEffect(() => {
    setFilters(EMPTY_VAULT_FILTERS);
    setIsSelecting(false);
    setSelectedIds([]);
  }, [activeTab]);

  const visibleIds = useMemo(() => visibleItems.map((item) => item.id), [visibleItems]);

  const selectedItems = useMemo(
    () => visibleItems.filter((item) => selectedIds.includes(item.id)),
    [visibleItems, selectedIds]
  );

  const isGridCategory = hasCardFace(category);
  const areAllVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const walletOptions = useMemo(
    () =>
      (wallets ?? []).map((summary) => ({
        summary,
        name: walletNames[summary.id] ?? 'Wallet',
      })),
    [wallets, walletNames]
  );

  const exitSelection = () => {
    setIsSelecting(false);
    setSelectedIds([]);
  };

  const toggleSelected = (item: VaultDecryptedItem) => {
    setSelectedIds((current) =>
      current.includes(item.id)
        ? current.filter((entry) => entry !== item.id)
        : [...current, item.id]
    );
  };

  const handleShareToWallets = async (
    walletIds: string[],
    selectedFieldNamesByItemId: Record<string, string[]>
  ) => {
    const targets = (wallets ?? []).filter((entry) => walletIds.includes(entry.id));
    if (targets.length === 0) throw new Error('Those wallets are no longer available');
    const projections = sharingItems.map((item) => ({
      category: item.category,
      content: buildSharedProjection(
        item.category,
        item.content,
        selectedFieldNamesByItemId[item.id] ?? []
      ),
      sourceItemId: item.id,
    }));
    await walletActions.shareItemsToWallets(targets, projections);
    exitSelection();
  };

  const handleJoinWallet = async (token: string, key: string) => {
    const result = await walletActions.joinByInvite(token, key);
    toast.success(
      result.status === 'active' ? 'You already have access' : 'Request sent to the owner'
    );
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
    const targetCategory = editingItem?.category ?? category;
    const targetDefinition = getCategoryDef(targetCategory);
    const content = applyDerivedFields(targetCategory, trimContent(values));
    if (!content.fields[targetDefinition.titleField]) {
      const titleLabel = targetDefinition.fields.find(
        (field) => field.name === targetDefinition.titleField
      )?.label;
      toast.error(`${titleLabel} is required`);
      return;
    }
    try {
      await onSave(targetCategory, content, editingItem?.id);
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
              onJoin={handleJoinWallet}
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{definition.label}</h2>
                  <p className="text-sm text-muted-foreground">{definition.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasSharingKeys && categoryItems.length > 1 && !isSelecting && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setIsSelecting(true)}
                    >
                      <CheckSquare className="h-4 w-4" />
                      Select
                    </Button>
                  )}
                  <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>

              {isFilterable && categoryItems.length > 0 && (
                <VaultFilterBar
                  filters={filters}
                  onChange={setFilters}
                  bankLabel={getBankFilterLabel(category)}
                  banks={filterOptions.banks}
                  networks={filterOptions.networks}
                  matchCount={visibleItems.length}
                  totalCount={categoryItems.length}
                />
              )}

              {isSelecting && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-accent/30 p-2.5">
                  <span className="text-sm font-medium">{selectedItems.length} selected</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => setSelectedIds(areAllVisibleSelected ? [] : visibleIds)}
                  >
                    {areAllVisibleSelected ? 'Clear all' : `Select all ${visibleIds.length}`}
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-8 gap-1.5"
                      disabled={selectedItems.length === 0}
                      onClick={() => setSharingItems(selectedItems)}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5"
                      onClick={exitSelection}
                    >
                      <X className="h-3.5 w-3.5" />
                      Done
                    </Button>
                  </div>
                </div>
              )}

              {isFilterable && categoryItems.length > 0 && visibleItems.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <p className="font-medium">Nothing matches these filters</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => setFilters(EMPTY_VAULT_FILTERS)}
                    >
                      Clear filters
                    </Button>
                  </CardContent>
                </Card>
              ) : visibleItems.length === 0 ? (
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
                <div className={isGridCategory ? VAULT_FACE_GRID_CLASS : 'space-y-4'}>
                  {visibleItems.map((item) => (
                    <VaultItemCard
                      key={item.id}
                      item={item}
                      onEdit={openEditDialog}
                      onDelete={setPendingDeletion}
                      onShare={hasSharingKeys ? (target) => setSharingItems([target]) : undefined}
                      isSelectable={isSelecting}
                      isSelected={selectedIds.includes(item.id)}
                      onToggleSelect={toggleSelected}
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
        open={sharingItems.length > 0}
        onOpenChange={(next) => {
          if (!next) setSharingItems([]);
        }}
        items={sharingItems}
        wallets={walletOptions}
        onShare={handleShareToWallets}
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
