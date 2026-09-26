import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useWalletsQuery } from '@myfinances/core/api/query/wallets';
import { InviteKeyMissingError, parseWalletInvite } from '@myfinances/core/vault/inviteCode';
import type { WrappedKey } from '@myfinances/core/vault/crypto';
import { Button, Card, EmptyState, Field, Label, LoadingState, Screen } from '@/components/ui';
import { errorMessage } from '@/components/FormScreen';
import { useVaultSession } from '@/features/vault/VaultSession';
import { useWalletActions } from '@/features/vault/useWalletActions';
import { vaultCrypto } from '@/features/vault/vaultCrypto';

export default function WalletsScreen() {
  usePreventScreenCapture();
  const { isUnlocked, resolveWalletKey, markActivity } = useVaultSession();
  const walletsQuery = useWalletsQuery(isUnlocked);
  const actions = useWalletActions(walletsQuery.refetch);
  const [newName, setNewName] = useState('');
  const [inviteText, setInviteText] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const names = useMemo(() => {
    const decoded = new Map<string, string>();
    for (const wallet of walletsQuery.data ?? []) {
      const key = resolveWalletKey(
        wallet.id,
        wallet.wrappedWalletKey as WrappedKey | null,
        wallet.memberKeyEpoch
      );
      if (!key || !wallet.encryptedName) continue;
      try {
        decoded.set(
          wallet.id,
          vaultCrypto.decryptItem<{ name: string }>(key, wallet.encryptedName).name
        );
      } catch {
        decoded.set(wallet.id, 'Locked wallet');
      }
    }
    return decoded;
  }, [walletsQuery.data, resolveWalletKey]);

  if (!isUnlocked) return <Redirect href="/more/vault" />;
  if (walletsQuery.isLoading) return <LoadingState />;

  const create = async () => {
    markActivity();
    if (!newName.trim()) return;
    try {
      await actions.createWallet(newName.trim());
      setNewName('');
    } catch (error) {
      setMessage(errorMessage(error));
    }
  };

  const join = async () => {
    markActivity();
    setMessage(null);
    try {
      const { token, key } = parseWalletInvite(inviteText);
      const result = await actions.joinByInvite(token, key);
      setInviteText('');
      setMessage(
        result.status === 'active'
          ? 'Joined the wallet.'
          : 'Request sent. The owner needs to approve it.'
      );
    } catch (error) {
      setMessage(
        error instanceof InviteKeyMissingError
          ? 'That link lost its key on the way. Ask for the invite code instead.'
          : errorMessage(error)
      );
    }
  };

  return (
    <Screen underHeader refreshing={walletsQuery.isFetching} onRefresh={walletsQuery.refetch}>
      {message ? <Text className="text-sm text-foreground">{message}</Text> : null}

      {(walletsQuery.data ?? []).length ? (
        walletsQuery.data!.map((wallet) => (
          <Pressable
            key={wallet.id}
            onPress={() =>
              router.push({ pathname: '/more/vault/wallet', params: { id: wallet.id } })
            }
            onLongPress={() =>
              wallet.isOwner &&
              Alert.alert('Delete wallet?', 'Everyone loses access to its entries.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => actions.deleteWallet(wallet.id),
                },
              ])
            }
          >
            <Card>
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-foreground">
                  {names.get(wallet.id) ?? 'Wallet'}
                </Text>
                {wallet.pendingCount > 0 && (
                  <Text className="rounded-full bg-accent px-2 py-0.5 text-xs text-foreground">
                    {wallet.pendingCount} pending
                  </Text>
                )}
              </View>
              <Label>
                {wallet.isOwner ? 'Owner' : `Shared by ${wallet.ownerName}`} · {wallet.itemCount}{' '}
                entries · {wallet.memberCount} members
              </Label>
            </Card>
          </Pressable>
        ))
      ) : (
        <EmptyState message="No wallets yet." />
      )}

      <Card>
        <Text className="text-base font-semibold text-foreground">New wallet</Text>
        <Field label="Name" value={newName} onChangeText={setNewName} placeholder="e.g. Family" />
        <Button label="Create wallet" onPress={create} loading={actions.isWalletBusy} />
      </Card>

      <Card>
        <Text className="text-base font-semibold text-foreground">Join a wallet</Text>
        <Field
          label="Invite code or link"
          value={inviteText}
          onChangeText={setInviteText}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="MFW1…"
        />
        <Button
          label="Request to join"
          variant="secondary"
          onPress={join}
          loading={actions.isWalletBusy}
        />
      </Card>
    </Screen>
  );
}
