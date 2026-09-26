import { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { Redirect, Stack, router } from 'expo-router';
import { Button, Card, Field, Label, Screen } from '@/components/ui';
import { PIN_LENGTH, PinPad } from '@/features/vault/PinPad';
import { useVaultSession } from '@/features/vault/VaultSession';
import {
  clearBiometricPin,
  hasBiometricPin,
  isBiometricUnlockAvailable,
  saveBiometricPin,
} from '@/features/vault/biometricPin';
import { errorMessage } from '@/components/FormScreen';

const DESTROY_CONFIRMATION = 'DELETE';

type PinStep = 'idle' | 'verify-for-biometrics' | 'new' | 'confirm';

export default function VaultSettingsScreen() {
  const { isUnlocked, changePin, destroy, verifyPinOnly, isBusy } = useVaultSession();
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [step, setStep] = useState<PinStep>('idle');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    isBiometricUnlockAvailable().then(setBiometricsAvailable);
    hasBiometricPin().then(setBiometricsEnabled);
  }, []);

  if (!isUnlocked) return <Redirect href="/more/vault" />;

  const resetPinFlow = () => {
    setStep('idle');
    setPin('');
    setNewPin('');
  };

  const onPinChange = async (next: string) => {
    setPin(next);
    setMessage(null);
    if (next.length < PIN_LENGTH) return;
    try {
      if (step === 'verify-for-biometrics') {
        await verifyPinOnly(next);
        await saveBiometricPin(next);
        setBiometricsEnabled(true);
        setMessage('Face ID / fingerprint unlock is on');
        resetPinFlow();
      } else if (step === 'new') {
        setNewPin(next);
        setPin('');
        setStep('confirm');
      } else if (step === 'confirm') {
        if (next !== newPin) {
          setMessage('PINs did not match');
          resetPinFlow();
          return;
        }
        await changePin(next);
        setBiometricsEnabled(false);
        setMessage('PIN changed. Turn on Face ID again if you use it.');
        resetPinFlow();
      }
    } catch (error) {
      setMessage(errorMessage(error));
      resetPinFlow();
    }
  };

  const toggleBiometrics = async (enabled: boolean) => {
    if (enabled) {
      setStep('verify-for-biometrics');
      return;
    }
    await clearBiometricPin();
    setBiometricsEnabled(false);
  };

  const confirmDestroy = () =>
    Alert.alert('Destroy the vault?', 'Every entry is deleted for good. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Destroy',
        style: 'destructive',
        onPress: async () => {
          await destroy();
          router.replace('/more/vault');
        },
      },
    ]);

  if (step !== 'idle') {
    const prompt = {
      'verify-for-biometrics': 'Enter your current PIN',
      new: 'Choose a new PIN',
      confirm: 'Confirm the new PIN',
    }[step];
    return (
      <View className="flex-1 items-center justify-center gap-6 bg-background px-6">
        <Stack.Screen options={{ title: 'Vault settings' }} />
        <Text className="text-xl font-bold text-foreground">{prompt}</Text>
        <PinPad value={pin} onChange={onPinChange} disabled={isBusy} />
        <Button label="Cancel" variant="secondary" onPress={resetPinFlow} />
      </View>
    );
  }

  return (
    <Screen underHeader>
      <Stack.Screen options={{ title: 'Vault settings' }} />
      {message ? <Text className="text-sm text-foreground">{message}</Text> : null}
      {biometricsAvailable && (
        <Card>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base text-foreground">Face ID / fingerprint</Text>
              <Label>Your PIN is kept in this device&apos;s secure storage only.</Label>
            </View>
            <Switch value={biometricsEnabled} onValueChange={toggleBiometrics} />
          </View>
        </Card>
      )}
      <Button label="Change PIN" variant="secondary" onPress={() => setStep('new')} />
      <Card>
        <Text className="text-base font-semibold text-loss">Destroy vault</Text>
        <Label>Type {DESTROY_CONFIRMATION} to enable.</Label>
        <Field
          label="Confirmation"
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
        />
        <Button
          label="Destroy vault"
          variant="danger"
          disabled={confirmText !== DESTROY_CONFIRMATION}
          onPress={confirmDestroy}
          loading={isBusy}
        />
      </Card>
    </Screen>
  );
}
