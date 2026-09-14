import { get, set, del } from 'idb-keyval';
import { decryptItem, deriveKeyFromPrfOutput, encryptItem } from './vaultCrypto';

const STORAGE_KEY = 'myfinances-vault-biometric-v1';
const RP_NAME = 'MyFinance Vault';
const CREDENTIAL_USER_NAME = 'Vault';
const PRF_SALT: Uint8Array = new TextEncoder().encode('myfinances-vault-pin-unlock-v1');
const CHALLENGE_BYTES = 32;
const USER_HANDLE_BYTES = 16;
const CREDENTIAL_TIMEOUT_MS = 60_000;

interface StoredBiometricUnlock {
  credentialId: string;
  wrappedPin: string;
}

interface PrfExtensionResults {
  prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } };
}

export class BiometricUnavailableError extends Error {
  constructor(message = 'Face ID unlock is not available on this device') {
    super(message);
    this.name = 'BiometricUnavailableError';
  }
}

export class BiometricPrfUnsupportedError extends Error {
  constructor() {
    super('This device can create a passkey but cannot derive a key from it');
    this.name = 'BiometricPrfUnsupportedError';
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBytes(length: number): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(length));
}

export function isBiometricApiAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof window.PublicKeyCredential === 'function' &&
    typeof navigator.credentials?.create === 'function'
  );
}

export async function isBiometricSupported(): Promise<boolean> {
  if (!isBiometricApiAvailable()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

async function readStoredUnlock(): Promise<StoredBiometricUnlock | undefined> {
  try {
    return await get<StoredBiometricUnlock>(STORAGE_KEY);
  } catch {
    return undefined;
  }
}

export async function hasBiometricUnlock(): Promise<boolean> {
  return Boolean(await readStoredUnlock());
}

export async function clearBiometricUnlock(): Promise<void> {
  try {
    await del(STORAGE_KEY);
  } catch {
    // Nothing to clear, or storage is unavailable — either way the vault still opens by PIN.
  }
}

function readPrfOutput(credential: PublicKeyCredential): ArrayBuffer {
  const results = credential.getClientExtensionResults() as PrfExtensionResults;
  const first = results.prf?.results?.first;
  if (!first) throw new BiometricPrfUnsupportedError();
  return first;
}

export async function enrollBiometricUnlock(pin: string, userLabel: string): Promise<void> {
  if (!isBiometricApiAvailable()) throw new BiometricUnavailableError();

  const created = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(CHALLENGE_BYTES),
      rp: { name: RP_NAME, id: window.location.hostname },
      user: {
        id: randomBytes(USER_HANDLE_BYTES),
        name: userLabel || CREDENTIAL_USER_NAME,
        displayName: userLabel || CREDENTIAL_USER_NAME,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
      timeout: CREDENTIAL_TIMEOUT_MS,
      extensions: { prf: { eval: { first: PRF_SALT } } },
    },
  })) as PublicKeyCredential | null;

  if (!created) throw new BiometricUnavailableError();

  const extensions = created.getClientExtensionResults() as PrfExtensionResults;
  if (!extensions.prf?.enabled) throw new BiometricPrfUnsupportedError();

  const credentialId = bytesToBase64(new Uint8Array(created.rawId));
  const prfOutput = extensions.prf.results?.first ?? (await evaluatePrf(credentialId));
  const wrappingKey = await deriveKeyFromPrfOutput(prfOutput);

  await set(STORAGE_KEY, {
    credentialId,
    wrappedPin: await encryptItem(wrappingKey, pin),
  } satisfies StoredBiometricUnlock);
}

async function evaluatePrf(credentialId: string): Promise<ArrayBuffer> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(CHALLENGE_BYTES),
      rpId: window.location.hostname,
      allowCredentials: [{ type: 'public-key', id: base64ToBytes(credentialId) }],
      userVerification: 'required',
      timeout: CREDENTIAL_TIMEOUT_MS,
      extensions: { prf: { eval: { first: PRF_SALT } } },
    },
  })) as PublicKeyCredential | null;

  if (!assertion) throw new BiometricUnavailableError();
  return readPrfOutput(assertion);
}

export async function unlockPinWithBiometrics(): Promise<string> {
  if (!isBiometricApiAvailable()) throw new BiometricUnavailableError();

  const stored = await readStoredUnlock();
  if (!stored) throw new BiometricUnavailableError('Face ID unlock has not been set up');

  const wrappingKey = await deriveKeyFromPrfOutput(await evaluatePrf(stored.credentialId));
  return decryptItem<string>(wrappingKey, stored.wrappedPin);
}
