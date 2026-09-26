import { createMMKV } from 'react-native-mmkv';

export const appStorage = createMMKV({ id: 'myfinances-app' });

export const asyncAppStorage = {
  getItem: async (key: string) => appStorage.getString(key) ?? null,
  setItem: async (key: string, value: string) => appStorage.set(key, value),
  removeItem: async (key: string) => {
    appStorage.remove(key);
  },
};
