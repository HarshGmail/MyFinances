'use client';

import { useCallback, useState } from 'react';
import { VaultCategory, VaultItemContent, WalletSummary } from '@/api/dataInterface';
import {
  fetchUserPublicKey,
  fetchWalletDetail,
  useApproveWalletMemberMutation,
  useCreateWalletInviteMutation,
  useCreateWalletMutation,
  useDeleteWalletItemMutation,
  useDeleteWalletMutation,
  useRemoveWalletMemberMutation,
  useRotateWalletKeyMutation,
  useSaveWalletItemMutation,
} from '@/api/mutations';
import {
  decryptItem,
  encryptItem,
  exportWalletKeyRaw,
  encodeWalletKeyForLink,
  generateWalletKey,
  newItemId,
  wrapKeyForPublicKey,
} from '@/utils/vaultCrypto';

type WalletKeyResolver = (
  walletId: string,
  wrappedWalletKey: WalletSummary['wrappedWalletKey'],
  keyEpoch: number
) => Promise<CryptoKey | null>;

interface UseWalletActionsOptions {
  publicKeyJwk: JsonWebKey | null;
  resolveWalletKey: WalletKeyResolver;
  refetchWallets: () => Promise<unknown>;
}

export function useWalletActions({
  publicKeyJwk,
  resolveWalletKey,
  refetchWallets,
}: UseWalletActionsOptions) {
  const { mutateAsync: createWalletRequest } = useCreateWalletMutation();
  const { mutateAsync: deleteWalletRequest } = useDeleteWalletMutation();
  const { mutateAsync: saveWalletItemRequest } = useSaveWalletItemMutation();
  const { mutateAsync: deleteWalletItemRequest } = useDeleteWalletItemMutation();
  const { mutateAsync: createInviteRequest } = useCreateWalletInviteMutation();
  const { mutateAsync: approveMemberRequest } = useApproveWalletMemberMutation();
  const { mutateAsync: removeMemberRequest } = useRemoveWalletMemberMutation();
  const { mutateAsync: rotateKeyRequest } = useRotateWalletKeyMutation();

  const [isWalletBusy, setIsWalletBusy] = useState(false);

  const requireSharingKey = useCallback(() => {
    if (!publicKeyJwk) throw new Error('Your sharing keys are not available');
    return publicKeyJwk;
  }, [publicKeyJwk]);

  const createWallet = useCallback(
    async (name: string) => {
      setIsWalletBusy(true);
      try {
        const ownPublicKey = requireSharingKey();
        const walletKey = await generateWalletKey();
        const encryptedName = await encryptItem(walletKey, { name });
        const wrappedWalletKey = await wrapKeyForPublicKey(walletKey, ownPublicKey);
        await createWalletRequest({ encryptedName, wrappedWalletKey });
        await refetchWallets();
      } finally {
        setIsWalletBusy(false);
      }
    },
    [createWalletRequest, refetchWallets, requireSharingKey]
  );

  const deleteWallet = useCallback(
    async (walletId: string) => {
      setIsWalletBusy(true);
      try {
        await deleteWalletRequest(walletId);
        await refetchWallets();
      } finally {
        setIsWalletBusy(false);
      }
    },
    [deleteWalletRequest, refetchWallets]
  );

  const shareItemToWallet = useCallback(
    async (
      wallet: WalletSummary,
      category: VaultCategory,
      projection: VaultItemContent,
      sourceItemId: string
    ) => {
      setIsWalletBusy(true);
      try {
        const walletKey = await resolveWalletKey(
          wallet.id,
          wallet.wrappedWalletKey,
          wallet.memberKeyEpoch
        );
        if (!walletKey) throw new Error('This wallet could not be unlocked');
        const ciphertext = await encryptItem(walletKey, projection);
        await saveWalletItemRequest({
          walletId: wallet.id,
          itemId: newItemId(),
          category,
          ciphertext,
          sourceItemId,
        });
        await refetchWallets();
      } finally {
        setIsWalletBusy(false);
      }
    },
    [resolveWalletKey, saveWalletItemRequest, refetchWallets]
  );

  const removeWalletItem = useCallback(
    async (walletId: string, itemId: string) => {
      setIsWalletBusy(true);
      try {
        await deleteWalletItemRequest({ walletId, itemId });
      } finally {
        setIsWalletBusy(false);
      }
    },
    [deleteWalletItemRequest]
  );

  const createInviteLink = useCallback(
    async (wallet: WalletSummary, expiresInDays: number, maxUses: number) => {
      setIsWalletBusy(true);
      try {
        const walletKey = await resolveWalletKey(
          wallet.id,
          wallet.wrappedWalletKey,
          wallet.memberKeyEpoch
        );
        if (!walletKey) throw new Error('This wallet could not be unlocked');
        const invite = await createInviteRequest({
          walletId: wallet.id,
          expiresInDays,
          maxUses,
        });
        const rawKey = encodeWalletKeyForLink(await exportWalletKeyRaw(walletKey));
        return `${window.location.origin}/vault/join/${invite.token}#k=${rawKey}`;
      } finally {
        setIsWalletBusy(false);
      }
    },
    [createInviteRequest, resolveWalletKey]
  );

  const approveMember = useCallback(
    async (walletId: string, userId: string) => {
      setIsWalletBusy(true);
      try {
        await approveMemberRequest({ walletId, userId });
        await refetchWallets();
      } finally {
        setIsWalletBusy(false);
      }
    },
    [approveMemberRequest, refetchWallets]
  );

  const rejectMember = useCallback(
    async (walletId: string, userId: string) => {
      setIsWalletBusy(true);
      try {
        await removeMemberRequest({ walletId, userId });
        await refetchWallets();
      } finally {
        setIsWalletBusy(false);
      }
    },
    [removeMemberRequest, refetchWallets]
  );

  const removeMemberAndRotate = useCallback(
    async (wallet: WalletSummary, userId: string, remainingUserIds: string[]) => {
      setIsWalletBusy(true);
      try {
        const currentKey = await resolveWalletKey(
          wallet.id,
          wallet.wrappedWalletKey,
          wallet.memberKeyEpoch
        );
        if (!currentKey) throw new Error('This wallet could not be unlocked');

        const detail = await fetchWalletDetail(wallet.id);
        const nextKey = await generateWalletKey();

        const currentName = detail.encryptedName
          ? await decryptItem<{ name: string }>(currentKey, detail.encryptedName)
          : { name: '' };
        const encryptedName = await encryptItem(nextKey, currentName);

        const reencryptedItems = [];
        for (const item of detail.items) {
          if (!item.ciphertext) continue;
          const content = await decryptItem<VaultItemContent>(currentKey, item.ciphertext);
          reencryptedItems.push({
            id: item.id,
            category: item.category,
            ciphertext: await encryptItem(nextKey, content),
            sourceItemId: item.sourceItemId,
            createdAt: item.createdAt,
          });
        }

        const rewrappedMembers = [];
        for (const memberId of remainingUserIds) {
          const memberPublicKey = await fetchUserPublicKey(memberId);
          rewrappedMembers.push({
            userId: memberId,
            wrappedWalletKey: await wrapKeyForPublicKey(nextKey, memberPublicKey),
          });
        }

        await removeMemberRequest({ walletId: wallet.id, userId });

        await rotateKeyRequest({
          walletId: wallet.id,
          encryptedName,
          items: reencryptedItems,
          members: rewrappedMembers,
        });
        await refetchWallets();
      } finally {
        setIsWalletBusy(false);
      }
    },
    [resolveWalletKey, removeMemberRequest, rotateKeyRequest, refetchWallets]
  );

  return {
    isWalletBusy,
    createWallet,
    deleteWallet,
    shareItemToWallet,
    removeWalletItem,
    createInviteLink,
    approveMember,
    rejectMember,
    removeMemberAndRotate,
  };
}
