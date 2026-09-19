'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Share2, Trash2, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { VaultItemContent, WalletSummary } from '@/api/dataInterface';
import { fetchWalletDetail } from '@/api/mutations';
import { useWalletMembersQuery, useWalletsQuery } from '@/api/query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { decryptItem, isVaultCryptoAvailable } from '@/utils/vaultCrypto';
import { OwnershipLegend } from '../../OwnershipLegend';
import { useVaultSession } from '../../useVaultSession';
import { VaultFilterBar } from '../../VaultFilterBar';
import { VaultItemCard } from '../../VaultItemCard';
import { VaultLocked } from '../../VaultLocked';
import { VaultUnsupported } from '../../VaultUnsupported';
import { EMPTY_VAULT_FILTERS, applyVaultFilters, buildFilterOptions } from '../../vaultFilters';
import {
  VAULT_FACE_GRID_CLASS,
  VaultDecryptedItem,
  getItemTitle,
  hasCardFace,
} from '../../vaultTypes';
import { ShareWalletDialog } from '../ShareWalletDialog';
import { WalletMembersDialog } from '../WalletMembersDialog';
import { useWalletActions } from '../useWalletActions';
import { useWalletNames } from '../useWalletNames';

interface WalletDetailPageProps {
  params: Promise<{ walletId: string }>;
}

const YOUR_ENTRIES_LABEL = 'Your entries';

export default function WalletDetailPage({ params }: WalletDetailPageProps) {
  const { walletId } = use(params);
  const session = useVaultSession();
  const isUnlocked = session.status === 'unlocked';

  const { data: wallets, refetch: refetchWallets } = useWalletsQuery(isUnlocked);
  const wallet = useMemo(
    () => wallets?.find((entry) => entry.id === walletId),
    [wallets, walletId]
  );
  const names = useWalletNames(wallets, session.resolveWalletKey);

  const [items, setItems] = useState<VaultDecryptedItem[]>([]);
  const [contributors, setContributors] = useState<
    Record<string, { name: string; isMine: boolean }>
  >({});
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<VaultDecryptedItem | null>(null);
  const [filters, setFilters] = useState(EMPTY_VAULT_FILTERS);

  const { data: members, isLoading: isLoadingMembers } = useWalletMembersQuery(
    isMembersOpen ? walletId : null
  );

  const actions = useWalletActions({
    publicKeyJwk: session.publicKeyJwk,
    resolveWalletKey: session.resolveWalletKey,
    refetchWallets,
  });

  const { resolveWalletKey } = session;

  const loadItems = useCallback(
    async (target: WalletSummary) => {
      setIsLoadingItems(true);
      try {
        const key = await resolveWalletKey(
          target.id,
          target.wrappedWalletKey,
          target.memberKeyEpoch
        );
        if (!key) {
          setItems([]);
          return;
        }
        const detail = await fetchWalletDetail(target.id);
        const decrypted: VaultDecryptedItem[] = [];
        const owners: Record<string, { name: string; isMine: boolean }> = {};
        for (const item of detail.items) {
          if (!item.ciphertext) continue;
          try {
            const content = await decryptItem<VaultItemContent>(key, item.ciphertext);
            decrypted.push({
              id: item.id,
              category: item.category,
              content,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            });
            owners[item.id] = { name: item.addedByName, isMine: item.isMine };
          } catch {
            continue;
          }
        }
        setItems(decrypted);
        setContributors(owners);
      } finally {
        setIsLoadingItems(false);
      }
    },
    [resolveWalletKey]
  );

  useEffect(() => {
    if (!wallet || !isUnlocked) return;
    loadItems(wallet);
  }, [wallet, isUnlocked, loadItems]);

  const ownerLabelOf = useCallback(
    (item: VaultDecryptedItem) => {
      const contributor = contributors[item.id];
      if (!contributor) return '';
      return contributor.isMine ? YOUR_ENTRIES_LABEL : contributor.name;
    },
    [contributors]
  );

  const filterOptions = useMemo(
    () => buildFilterOptions(items, ownerLabelOf),
    [items, ownerLabelOf]
  );

  const visibleItems = useMemo(
    () => applyVaultFilters(items, filters, ownerLabelOf),
    [items, filters, ownerLabelOf]
  );

  const isGridLayout =
    visibleItems.length > 0 && visibleItems.every((item) => hasCardFace(item.category));
  const hasOthersEntries = Object.values(contributors).some((contributor) => !contributor.isMine);

  const handleDelete = async () => {
    if (!pendingDeletion || !wallet) return;
    try {
      await actions.removeWalletItem(wallet.id, pendingDeletion.id);
      setPendingDeletion(null);
      toast.success('Entry removed from the wallet');
      await loadItems(wallet);
    } catch (error) {
      toast.error('Could not remove the entry', { description: (error as Error)?.message });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!wallet || !members) return;
    const remaining = members
      .filter((member) => member.status === 'active' && member.userId !== userId)
      .map((member) => member.userId);
    await actions.removeMemberAndRotate(wallet, userId, remaining);
    await loadItems(wallet);
  };

  if (session.status === 'unsupported' || !isVaultCryptoAvailable()) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <VaultUnsupported />
      </div>
    );
  }

  if (session.status === 'locked' || session.status === 'setup') {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <VaultLocked
          onUnlock={session.unlock}
          onBiometricUnlock={session.unlockWithBiometrics}
          isBiometricEnrolled={session.isBiometricEnrolled}
          isBusy={session.isBusy}
          lockedUntil={session.lockedUntil}
          attemptsRemaining={session.attemptsRemaining}
        />
      </div>
    );
  }

  const walletName = names[walletId] ?? '…';

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <Link
        href="/vault?tab=wallets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All wallets
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{walletName}</h1>
            <p className="text-sm text-muted-foreground">
              {wallet?.isOwner ? 'You own this wallet' : `Shared by ${wallet?.ownerName ?? '—'}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setIsMembersOpen(true)}
          >
            <Users className="h-4 w-4" />
            Members
          </Button>
          {wallet?.isOwner && (
            <Button size="sm" className="gap-1.5" onClick={() => setIsShareOpen(true)}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          )}
        </div>
      </div>

      {isLoadingItems ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 font-medium">Nothing shared yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Open an entry in your vault and use &ldquo;Share to wallet&rdquo; to add it here,
              choosing exactly which fields the others can see.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <VaultFilterBar
              filters={filters}
              onChange={setFilters}
              bankLabel="Bank"
              banks={filterOptions.banks}
              networks={filterOptions.networks}
              owners={filterOptions.owners}
              matchCount={visibleItems.length}
              totalCount={items.length}
            />
            <OwnershipLegend
              mineLabel={YOUR_ENTRIES_LABEL}
              othersLabel="Shared by others"
              hasOthers={hasOthersEntries}
            />
          </div>

          {visibleItems.length === 0 ? (
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
          ) : (
            <div className={isGridLayout ? VAULT_FACE_GRID_CLASS : 'space-y-4'}>
              {visibleItems.map((item) => {
                const contributor = contributors[item.id];
                const canRemove = wallet?.isOwner || contributor?.isMine;
                return (
                  <VaultItemCard
                    key={item.id}
                    item={item}
                    ownershipMark={{
                      isMine: Boolean(contributor?.isMine),
                      label: contributor?.isMine
                        ? YOUR_ENTRIES_LABEL
                        : `Shared by ${contributor?.name || 'someone'}`,
                    }}
                    onEdit={() => toast.info('Edit this entry in your own vault, then re-share it')}
                    onDelete={
                      canRemove
                        ? setPendingDeletion
                        : () => toast.error('Only the person who shared this can remove it')
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {wallet && (
        <ShareWalletDialog
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
          walletName={walletName}
          onCreateLink={(days, uses) => actions.createInviteLink(wallet, days, uses)}
          isPending={actions.isWalletBusy}
        />
      )}

      <WalletMembersDialog
        open={isMembersOpen}
        onOpenChange={setIsMembersOpen}
        members={members ?? []}
        isLoading={isLoadingMembers}
        isOwner={Boolean(wallet?.isOwner)}
        isPending={actions.isWalletBusy}
        sharedItemCount={items.length}
        onApprove={(userId) => actions.approveMember(walletId, userId)}
        onReject={(userId) => actions.rejectMember(walletId, userId)}
        onRemove={handleRemoveMember}
      />

      <Dialog open={Boolean(pendingDeletion)} onOpenChange={() => setPendingDeletion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from this wallet?</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">
            {pendingDeletion && getItemTitle(pendingDeletion.category, pendingDeletion.content)}{' '}
            will no longer be visible to the other members. Your own copy in the vault is untouched.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeletion(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={actions.isWalletBusy} onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              {actions.isWalletBusy ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
