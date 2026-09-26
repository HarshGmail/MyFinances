import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Share, Text, View } from 'react-native';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { fetchWalletDetail } from '@myfinances/core/api/mutations/wallets';
import { useWalletMembersQuery, useWalletsQuery } from '@myfinances/core/api/query/wallets';
import type {
  VaultItemContent,
  WalletDetailResponse,
  WalletItemRecord,
} from '@myfinances/core/types';
import type { WrappedKey } from '@myfinances/core/vault/crypto';
import {
  buildItemCopyText,
  buildSharedProjection,
  getItemSubtitle,
  getItemTitle,
  getShareableFields,
} from '@myfinances/core/vault/vaultTypes';
import { Button, Card, EmptyState, Label, LoadingState, Row, Screen } from '@/components/ui';
import { errorMessage } from '@/components/FormScreen';
import { useVaultSession } from '@/features/vault/VaultSession';
import { useWalletActions } from '@/features/vault/useWalletActions';
import { vaultCrypto } from '@/features/vault/vaultCrypto';

const INVITE_EXPIRY_DAYS = 7;
const INVITE_MAX_USES = 5;

interface DecryptedWalletItem {
  record: WalletItemRecord;
  content: VaultItemContent;
}

function decryptWallet(detail: WalletDetailResponse, key: Uint8Array | null) {
  if (!key) return { name: 'Wallet', entries: [] as DecryptedWalletItem[], locked: true };
  const name = detail.encryptedName
    ? vaultCrypto.decryptItem<{ name: string }>(key, detail.encryptedName).name
    : 'Wallet';
  const entries = detail.items
    .filter((record) => record.ciphertext)
    .flatMap((record) => {
      try {
        return [
          { record, content: vaultCrypto.decryptItem<VaultItemContent>(key, record.ciphertext!) },
        ];
      } catch {
        return [];
      }
    });
  return { name, entries, locked: false };
}

export default function WalletScreen() {
  usePreventScreenCapture();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isUnlocked, resolveWalletKey, items: vaultItems, markActivity } = useVaultSession();
  const walletsQuery = useWalletsQuery(isUnlocked);
  const membersQuery = useWalletMembersQuery(id);
  const actions = useWalletActions(walletsQuery.refetch);
  const wallet = walletsQuery.data?.find((candidate) => candidate.id === id);
  const [entries, setEntries] = useState<DecryptedWalletItem[] | null>(null);
  const [name, setName] = useState('Wallet');
  const [message, setMessage] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);

  const [reloadCount, setReloadCount] = useState(0);
  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;
    fetchWalletDetail(wallet.id)
      .then((detail) => {
        if (cancelled) return;
        const decrypted = decryptWallet(
          detail,
          resolveWalletKey(
            wallet.id,
            wallet.wrappedWalletKey as WrappedKey | null,
            wallet.memberKeyEpoch
          )
        );
        setName(decrypted.name);
        setEntries(decrypted.entries);
        setMessage(decrypted.locked ? 'This wallet could not be unlocked with your keys.' : null);
      })
      .catch((error) => {
        if (!cancelled) setMessage(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [wallet, resolveWalletKey, reloadCount]);

  if (!isUnlocked) return <Redirect href="/more/vault" />;
  if (!wallet || entries === null) return <LoadingState />;

  const members = membersQuery.data ?? [];
  const pending = members.filter((member) => member.status === 'pending');
  const active = members.filter((member) => member.status === 'active');

  const shareInvite = async () => {
    markActivity();
    try {
      const { code } = await actions.createInvite(wallet, INVITE_EXPIRY_DAYS, INVITE_MAX_USES);
      await Share.share({ message: `Join my MyFinances wallet with this code:\n${code}` });
    } catch (error) {
      setMessage(errorMessage(error));
    }
  };

  const removeMember = (userId: string, memberName: string) =>
    Alert.alert(
      `Remove ${memberName}?`,
      'The wallet key is rotated so they cannot read new changes. Anything they already saw cannot be taken back, so change sensitive values like a CVV.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const remaining = active
                .filter((member) => member.userId !== userId)
                .map((member) => member.userId);
              await actions.removeMemberAndRotate(wallet, userId, remaining);
              await membersQuery.refetch();
              reload();
            } catch (error) {
              setMessage(errorMessage(error));
            }
          },
        },
      ]
    );

  const shareFromVault = async (itemId: string) => {
    const item = vaultItems.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const defaults = getShareableFields(item.category, item.content)
      .filter((field) => field.shareByDefault)
      .map((field) => field.name);
    try {
      await actions.shareItemsToWallets(
        [wallet],
        [
          {
            category: item.category,
            content: buildSharedProjection(item.category, item.content, defaults),
            sourceItemId: item.id,
          },
        ]
      );
      setShowShare(false);
      reload();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  };

  return (
    <Screen underHeader>
      <Stack.Screen options={{ title: name }} />
      {message ? <Text className="text-sm text-foreground">{message}</Text> : null}

      {entries.length ? (
        entries.map(({ record, content }) => (
          <Card key={record.id}>
            <Text className="text-base font-semibold text-foreground">
              {getItemTitle(record.category, content)}
            </Text>
            <Label>
              {getItemSubtitle(record.category, content)} · added by{' '}
              {record.isMine ? 'you' : record.addedByName}
            </Label>
            <View className="flex-row gap-4 pt-1">
              <Pressable
                onPress={() =>
                  Clipboard.setStringAsync(buildItemCopyText(record.category, content))
                }
              >
                <Text className="text-xs font-semibold text-foreground">Copy</Text>
              </Pressable>
              {record.isMine && (
                <Pressable
                  onPress={async () => {
                    await actions.removeWalletItem(wallet.id, record.id);
                    reload();
                  }}
                >
                  <Text className="text-xs text-loss">Remove</Text>
                </Pressable>
              )}
            </View>
          </Card>
        ))
      ) : (
        <EmptyState message="No shared entries yet." />
      )}

      <Button
        label="Share an entry from my vault"
        variant="secondary"
        onPress={() => setShowShare(!showShare)}
      />
      {showShare && (
        <Card>
          <Label>
            Only fields marked safe to share are included. Card numbers, CVVs and passwords stay
            private.
          </Label>
          {vaultItems.length ? (
            vaultItems.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => shareFromVault(item.id)}
                className="border-t border-border py-2"
              >
                <Text className="text-sm text-foreground">
                  {getItemTitle(item.category, item.content)}
                </Text>
              </Pressable>
            ))
          ) : (
            <EmptyState message="Your vault is empty." />
          )}
        </Card>
      )}

      {wallet.isOwner && (
        <Card>
          <Text className="text-base font-semibold text-foreground">Members</Text>
          {active.map((member) => (
            <Row
              key={member.userId}
              label={`${member.name}${member.isMe ? ' (you)' : ''}`}
              value={
                member.isMe ? (
                  member.role
                ) : (
                  <Pressable onPress={() => removeMember(member.userId, member.name)}>
                    <Text className="text-xs text-loss">Remove</Text>
                  </Pressable>
                )
              }
            />
          ))}
          {pending.map((member) => (
            <Row
              key={member.userId}
              label={`${member.name} wants to join`}
              value={
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={async () => {
                      await actions.approveMember(wallet.id, member.userId);
                      await membersQuery.refetch();
                    }}
                  >
                    <Text className="text-xs font-semibold text-gain">Approve</Text>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      await actions.rejectMember(wallet.id, member.userId);
                      await membersQuery.refetch();
                    }}
                  >
                    <Text className="text-xs text-loss">Decline</Text>
                  </Pressable>
                </View>
              }
            />
          ))}
          <Button label="Share invite code" onPress={shareInvite} loading={actions.isWalletBusy} />
        </Card>
      )}
    </Screen>
  );
}
