import { getRandomValues } from 'react-native-quick-crypto';

type GlobalWithCrypto = { crypto?: { getRandomValues?: typeof getRandomValues } };

const target = globalThis as GlobalWithCrypto;

if (typeof target.crypto?.getRandomValues !== 'function') {
  target.crypto = { ...target.crypto, getRandomValues };
}
