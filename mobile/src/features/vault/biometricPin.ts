import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_PIN_KEY = 'myfinances.vault.biometric-pin';
const BIOMETRIC_ENROLLED_KEY = `${BIOMETRIC_PIN_KEY}.enrolled`;
const ENROLLED = 'true';

const BIOMETRIC_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: true,
  authenticationPrompt: 'Unlock your vault',
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
};

export async function isBiometricUnlockAvailable(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled && SecureStore.canUseBiometricAuthentication();
}

export async function hasBiometricPin(): Promise<boolean> {
  const marker = await SecureStore.getItemAsync(BIOMETRIC_ENROLLED_KEY);
  return marker === ENROLLED;
}

export async function saveBiometricPin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_PIN_KEY, pin, BIOMETRIC_STORE_OPTIONS);
  await SecureStore.setItemAsync(BIOMETRIC_ENROLLED_KEY, ENROLLED);
}

export async function readBiometricPin(): Promise<string | null> {
  return SecureStore.getItemAsync(BIOMETRIC_PIN_KEY, BIOMETRIC_STORE_OPTIONS);
}

export async function clearBiometricPin(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_PIN_KEY, BIOMETRIC_STORE_OPTIONS);
  await SecureStore.deleteItemAsync(BIOMETRIC_ENROLLED_KEY);
}
