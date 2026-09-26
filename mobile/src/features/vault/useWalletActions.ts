import { useCallback, useState } from 'react';
import type { VaultCategory, VaultItemContent, WalletSummary } from '@myfinances/core/types';
import {
  fetchUserPublicKey,
  fetchWalletDetail,
  useApproveWalletMemberMutation,
  useCreateWalletInviteMutation,
  useCreateWalletMutation,
  useDeleteWalletItemMutation,
  useDeleteWalletMutation,
  useJoinWalletMutation,
  useRemoveWalletMemberMutation,
  useRotateWalletKeyMutation,
  useSaveWalletItemMutation,
} from '@myfinances/core/api/mutations/wallets';
import {
  EcJwk,
  WrappedKey,
  base64ToBase64Url,
  base64UrlToBase64,
} from '@myfinances/core/vault/crypto';
import { buildInviteCode, buildInviteLink } from '@myfinances/core/vault/inviteCode';
import { newItemId, vaultCrypto } from './vaultCrypto';
import { useVaultSession } from './VaultSession';

const WEB_APP_ORIGIN = 'https://www.my-finances.site';

export interface WalletShareProjection {
  category: VaultCategory;
  content: VaultItemContent;
  sourceItemId: string;
}

function asWrapped(wrapped: WalletSummary['wrappedWalletKey']): WrappedKey | null {
  return wrapped as WrappedKey | null;
}

function asApiWrapped(wrapped: WrappedKey): { epk: JsonWebKey; wrapped: string } {
  return wrapped as unknown as { epk: JsonWebKey; wrapped: string };
}

export function useWalletActions(refetchWallets: () => Promise<unknown>) {
  const { publicKey, resolveWalletKey } = useVaultSession();
  const { mutateAsync: createWalletRequest } = useCreateWalletMutation();
  const { mutateAsync: deleteWalletRequest } = useDeleteWalletMutation();
  const { mutateAsync: saveWalletItemRequest } = useSaveWalletItemMutation();
  const { mutateAsync: deleteWalletItemRequest } = useDeleteWalletItemMutation();
  const { mutateAsync: createInviteRequest } = useCreateWalletInviteMutation();
  const { mutateAsync: approveMemberRequest } = useApproveWalletMemberMutation();
  const { mutateAsync: removeMemberRequest } = useRemoveWalletMemberMutation();
  const { mutateAsync: rotateKeyRequest } = useRotateWalletKeyMutation();
  const { mutateAsync: joinWalletRequest } = useJoinWalletMutation();
  const [isWalletBusy, setIsWalletBusy] = useState(false);

  const busy = useCallback(async <T>(work: () => Promise<T>): Promise<T> => {
    setIsWalletBusy(true);
    try {
      return await work();
    } finally {
      setIsWalletBusy(false);
    }
  }, []);

  const requireSharingKey = useCallback((): EcJwk => {
    if (!publicKey) throw new Error('Your sharing keys are not available');
    return publicKey;
  }, [publicKey]);

  const walletKeyFor = useCallback(
    (wallet: WalletSummary) => {
      const key = resolveWalletKey(
        wallet.id,
        asWrapped(wallet.wrappedWalletKey),
        wallet.memberKeyEpoch
      );
      if (!key) throw new Error('This wallet could not be unlocked');
      return key;
    },
    [resolveWalletKey]
  );

  const createWallet = useCallback(
    (name: string) =>
      busy(async () => {
        const walletKey = vaultCrypto.generateWalletKey();
        await createWalletRequest({
          encryptedName: vaultCrypto.encryptItem(walletKey, { name }),
          wrappedWalletKey: asApiWrapped(
            vaultCrypto.wrapKeyForPublicKey(walletKey, requireSharingKey())
          ),
        });
        await refetchWallets();
      }),
    [busy, createWalletRequest, refetchWallets, requireSharingKey]
  );

  const deleteWallet = useCallback(
    (walletId: string) =>
      busy(async () => {
        await deleteWalletRequest(walletId);
        await refetchWallets();
      }),
    [busy, deleteWalletRequest, refetchWallets]
  );

  const shareItemsToWallets = useCallback(
    (targets: WalletSummary[], projections: WalletShareProjection[]) =>
      busy(async () => {
        const failures: string[] = [];
        for (const wallet of targets) {
          try {
            const walletKey = walletKeyFor(wallet);
            for (const projection of projections) {
              await saveWalletItemRequest({
                walletId: wallet.id,
                itemId: newItemId(),
                category: projection.category,
                ciphertext: vaultCrypto.encryptItem(walletKey, projection.content),
                sourceItemId: projection.sourceItemId,
              });
            }
          } catch (error) {
            failures.push((error as Error)?.message ?? 'failed');
          }
        }
        await refetchWallets();
        if (failures.length === targets.length) throw new Error(failures[0]);
        if (failures.length > 0) {
          throw new Error(`${failures.length} of ${targets.length} wallets could not be updated`);
        }
      }),
    [busy, walletKeyFor, saveWalletItemRequest, refetchWallets]
  );

  const removeWalletItem = useCallback(
    (walletId: string, itemId: string) => busy(() => deleteWalletItemRequest({ walletId, itemId })),
    [busy, deleteWalletItemRequest]
  );

  const createInvite = useCallback(
    (wallet: WalletSummary, expiresInDays: number, maxUses: number) =>
      busy(async () => {
        const walletKey = walletKeyFor(wallet);
        const invite = await createInviteRequest({ walletId: wallet.id, expiresInDays, maxUses });
        const parts = {
          token: invite.token,
          key: base64ToBase64Url(vaultCrypto.walletKeyToBase64(walletKey)),
        };
        return { code: buildInviteCode(parts), link: buildInviteLink(WEB_APP_ORIGIN, parts) };
      }),
    [busy, walletKeyFor, createInviteRequest]
  );

  const joinByInvite = useCallback(
    (token: string, key: string) =>
      busy(async () => {
        const walletKey = vaultCrypto.walletKeyFromBase64(base64UrlToBase64(key));
        const result = await joinWalletRequest({
          token,
          wrappedWalletKey: asApiWrapped(
            vaultCrypto.wrapKeyForPublicKey(walletKey, requireSharingKey())
          ),
        });
        await refetchWallets();
        return result;
      }),
    [busy, joinWalletRequest, refetchWallets, requireSharingKey]
  );

  const approveMember = useCallback(
    (walletId: string, userId: string) =>
      busy(async () => {
        await approveMemberRequest({ walletId, userId });
        await refetchWallets();
      }),
    [busy, approveMemberRequest, refetchWallets]
  );

  const rejectMember = useCallback(
    (walletId: string, userId: string) =>
      busy(async () => {
        await removeMemberRequest({ walletId, userId });
        await refetchWallets();
      }),
    [busy, removeMemberRequest, refetchWallets]
  );

  const removeMemberAndRotate = useCallback(
    (wallet: WalletSummary, userId: string, remainingUserIds: string[]) =>
      busy(async () => {
        const currentKey = walletKeyFor(wallet);
        const detail = await fetchWalletDetail(wallet.id);
        const nextKey = vaultCrypto.generateWalletKey();

        const currentName = detail.encryptedName
          ? vaultCrypto.decryptItem<{ name: string }>(currentKey, detail.encryptedName)
          : { name: '' };

        const reencryptedItems = detail.items
          .filter((item) => item.ciphertext)
          .map((item) => ({
            id: item.id,
            category: item.category,
            ciphertext: vaultCrypto.encryptItem(
              nextKey,
              vaultCrypto.decryptItem<VaultItemContent>(currentKey, item.ciphertext!)
            ),
            sourceItemId: item.sourceItemId,
            createdAt: item.createdAt,
          }));

        const rewrappedMembers = [];
        for (const memberId of remainingUserIds) {
          const memberPublicKey = (await fetchUserPublicKey(memberId)) as EcJwk;
          rewrappedMembers.push({
            userId: memberId,
            wrappedWalletKey: asApiWrapped(
              vaultCrypto.wrapKeyForPublicKey(nextKey, memberPublicKey)
            ),
          });
        }

        await removeMemberRequest({ walletId: wallet.id, userId });
        await rotateKeyRequest({
          walletId: wallet.id,
          encryptedName: vaultCrypto.encryptItem(nextKey, currentName),
          items: reencryptedItems,
          members: rewrappedMembers,
        });
        await refetchWallets();
      }),
    [busy, walletKeyFor, removeMemberRequest, rotateKeyRequest, refetchWallets]
  );

  return {
    isWalletBusy,
    createWallet,
    deleteWallet,
    shareItemsToWallets,
    removeWalletItem,
    createInvite,
    joinByInvite,
    approveMember,
    rejectMember,
    removeMemberAndRotate,
  };
}
