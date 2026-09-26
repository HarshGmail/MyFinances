import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useVaultMetaQuery } from '@myfinances/core/api/query/vault';
import { VaultWrongPinError } from '@myfinances/core/vault/crypto';
import {
  VAULT_CATEGORIES,
  buildItemCopyText,
  getItemSubtitle,
  getItemTitle,
  getPopulatedFields,
  maskValue,
} from '@myfinances/core/vault/vaultTypes';
import type { VaultDecryptedItem } from '@myfinances/core/vault/vaultTypes';
import type { VaultCategory } from '@myfinances/core/types';
import { AddButton, Button, Card, EmptyState, Label, LoadingState } from '@/components/ui';
import { PIN_LENGTH, PinPad } from '@/features/vault/PinPad';
import { useVaultSession } from '@/features/vault/VaultSession';
import {
  hasBiometricPin,
  isBiometricUnlockAvailable,
  readBiometricPin,
} from '@/features/vault/biometricPin';

const MS_PER_SECOND = 1000;

function errorText(error: unknown): string {
  if (error instanceof VaultWrongPinError) return 'Incorrect PIN';
  const apiError = error as { status?: number; message?: string };
  if (apiError?.status === 429) return 'Too many attempts. Try again later.';
  return apiError?.message ?? 'Something went wrong';
}

function useCountdown(until: string | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  const endsAt = until ? new Date(until).getTime() : 0;
  useEffect(() => {
    if (endsAt <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), MS_PER_SECOND);
    return () => clearInterval(timer);
  }, [endsAt]);
  return Math.max(0, Math.ceil((endsAt - now) / MS_PER_SECOND));
}

function SetupView() {
  const { createVault, isBusy } = useVaultSession();
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onChange = async (next: string) => {
    setPin(next);
    setError(null);
    if (next.length < PIN_LENGTH) return;
    if (!firstPin) {
      setFirstPin(next);
      setPin('');
      return;
    }
    if (next !== firstPin) {
      setError('PINs did not match. Start again.');
      setFirstPin(null);
      setPin('');
      return;
    }
    try {
      await createVault(next);
    } catch (caught) {
      setError(errorText(caught));
      setFirstPin(null);
      setPin('');
    }
  };

  return (
    <View className="flex-1 items-center justify-center gap-6 px-6">
      <Text className="text-2xl font-bold text-foreground">
        {firstPin ? 'Confirm your PIN' : 'Choose a vault PIN'}
      </Text>
      <Text className="text-center text-sm text-muted">
        Your PIN encrypts everything on this device before it is saved. Nobody, including us, can
        recover it if you forget it.
      </Text>
      <PinPad value={pin} onChange={onChange} disabled={isBusy} />
      {error ? <Text className="text-sm text-loss">{error}</Text> : null}
    </View>
  );
}

function LockedView({
  lockedUntil,
  attemptsRemaining,
}: {
  lockedUntil?: string | null;
  attemptsRemaining?: number;
}) {
  const { unlock, isBusy } = useVaultSession();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);
  const secondsLeft = useCountdown(lockedUntil);

  useEffect(() => {
    Promise.all([isBiometricUnlockAvailable(), hasBiometricPin()]).then(([available, enrolled]) =>
      setCanUseBiometrics(available && enrolled)
    );
  }, []);

  const attempt = async (candidate: string) => {
    try {
      await unlock(candidate);
    } catch (caught) {
      setError(errorText(caught));
      setPin('');
    }
  };

  const onChange = (next: string) => {
    setPin(next);
    setError(null);
    if (next.length === PIN_LENGTH) attempt(next);
  };

  const unlockWithBiometrics = async () => {
    try {
      const stored = await readBiometricPin();
      if (stored) await attempt(stored);
    } catch {
      setError('Face ID was cancelled');
    }
  };

  return (
    <View className="flex-1 items-center justify-center gap-6 px-6">
      <Text className="text-2xl font-bold text-foreground">Vault locked</Text>
      {secondsLeft > 0 ? (
        <Text className="text-sm text-loss">Too many attempts. Try again in {secondsLeft}s.</Text>
      ) : (
        <>
          <PinPad value={pin} onChange={onChange} disabled={isBusy} />
          {error ? <Text className="text-sm text-loss">{error}</Text> : null}
          {attemptsRemaining !== undefined && attemptsRemaining <= 2 && (
            <Text className="text-xs text-muted">
              {attemptsRemaining} attempts before a lockout
            </Text>
          )}
          {canUseBiometrics && (
            <Pressable onPress={unlockWithBiometrics} accessibilityRole="button">
              <Text className="text-sm font-semibold text-foreground">
                Use Face ID / fingerprint
              </Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

function VaultItemCard({ item }: { item: VaultDecryptedItem }) {
  const { removeItem, markActivity } = useVaultSession();
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const fields = getPopulatedFields(item.category, item.content);

  const copy = (value: string) => {
    markActivity();
    Clipboard.setStringAsync(value);
  };

  const confirmDelete = () =>
    Alert.alert('Delete entry?', getItemTitle(item.category, item.content), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeItem(item.id) },
    ]);

  return (
    <Card>
      <Pressable
        onPress={() => {
          markActivity();
          setExpanded(!expanded);
        }}
        onLongPress={confirmDelete}
      >
        <Text className="text-base font-semibold text-foreground">
          {getItemTitle(item.category, item.content)}
        </Text>
        <Text className="text-xs text-muted">{getItemSubtitle(item.category, item.content)}</Text>
      </Pressable>
      {expanded && (
        <View className="gap-2 pt-2">
          {fields.map((field) => {
            const isHidden = field.secret && !revealed.has(field.name);
            return (
              <View key={field.name} className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Label>{field.label}</Label>
                  <Pressable
                    onPress={() => {
                      if (!field.secret) return;
                      const next = new Set(revealed);
                      if (next.has(field.name)) next.delete(field.name);
                      else next.add(field.name);
                      setRevealed(next);
                    }}
                  >
                    <Text className="text-sm text-foreground" selectable={!isHidden}>
                      {isHidden ? maskValue(field.displayValue) : field.displayValue}
                    </Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => copy(field.value)} accessibilityRole="button">
                  <Text className="text-xs text-muted">Copy</Text>
                </Pressable>
              </View>
            );
          })}
          <View className="flex-row gap-4 pt-2">
            <Pressable onPress={() => copy(buildItemCopyText(item.category, item.content))}>
              <Text className="text-xs font-semibold text-foreground">Copy all</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/more/vault/item', params: { id: item.id } })}
            >
              <Text className="text-xs font-semibold text-foreground">Edit</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Card>
  );
}

function UnlockedView() {
  const { items, damagedIds, lock, markActivity } = useVaultSession();
  const [category, setCategory] = useState<VaultCategory>('bank');
  const visible = items.filter((item) => item.category === category);

  return (
    <ScrollView contentContainerClassName="gap-4 px-4 pb-10 pt-2" onScrollBeginDrag={markActivity}>
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-foreground">Vault</Text>
        <Pressable onPress={lock} accessibilityRole="button">
          <Text className="text-sm font-semibold text-foreground">Lock</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {VAULT_CATEGORIES.map((definition) => {
            const selected = definition.id === category;
            const count = items.filter((item) => item.category === definition.id).length;
            return (
              <Pressable
                key={definition.id}
                onPress={() => {
                  markActivity();
                  setCategory(definition.id);
                }}
                className={`h-9 justify-center rounded-full border px-3 ${selected ? 'border-foreground bg-foreground' : 'border-border'}`}
              >
                <Text
                  className={
                    selected ? 'text-sm font-semibold text-background' : 'text-sm text-foreground'
                  }
                >
                  {definition.label} {count > 0 ? `(${count})` : ''}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => router.push('/more/vault/wallets')}
            className="h-9 justify-center rounded-full border border-border px-3"
          >
            <Text className="text-sm text-foreground">Wallets</Text>
          </Pressable>
        </View>
      </ScrollView>
      <AddButton
        label="Add entry"
        onPress={() => router.push({ pathname: '/more/vault/item', params: { category } })}
      />
      {damagedIds.length > 0 && (
        <Text className="text-xs text-loss">
          {damagedIds.length} entries could not be decrypted and are hidden.
        </Text>
      )}
      {visible.length ? (
        visible.map((item) => <VaultItemCard key={item.id} item={item} />)
      ) : (
        <EmptyState message="Nothing here yet." />
      )}
      <Button
        label="Vault settings"
        variant="secondary"
        onPress={() => router.push('/more/vault/settings')}
      />
    </ScrollView>
  );
}

export default function VaultScreen() {
  usePreventScreenCapture();
  const { isUnlocked } = useVaultSession();
  const metaQuery = useVaultMetaQuery();

  if (metaQuery.isLoading) return <LoadingState />;
  const meta = metaQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={[]}>
      {isUnlocked ? (
        <UnlockedView />
      ) : meta?.exists ? (
        <LockedView lockedUntil={meta.lockedUntil} attemptsRemaining={meta.attemptsRemaining} />
      ) : (
        <SetupView />
      )}
    </SafeAreaView>
  );
}
