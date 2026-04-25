import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';

function getCacheKey(): string {
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      if (user?.id) return `myfinances-cache-${user.id}`;
      if (user?.email) return `myfinances-cache-${user.email}`;
    }
  } catch {}
  return 'myfinances-cache-anon';
}

export function createQueryPersister() {
  const key = getCacheKey();
  return createAsyncStoragePersister({
    storage: { getItem: (k) => get(k), setItem: (k, v) => set(k, v), removeItem: (k) => del(k) },
    key,
  });
}

export async function clearQueryCache(): Promise<void> {
  await del(getCacheKey());
}
