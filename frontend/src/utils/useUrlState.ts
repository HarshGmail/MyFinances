'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type ParamUpdate = Record<string, string | null>;

function applyUpdates(params: URLSearchParams, updates: ParamUpdate): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
  }
  return next;
}

function useReplaceParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (updates: ParamUpdate) => {
      const next = applyUpdates(searchParams, updates);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );
}

export function useUrlBatchUpdate() {
  return useReplaceParams();
}

export function useUrlState<T extends string>(
  key: string,
  defaultValue: T,
  allowed?: readonly T[]
): [T, (next: T) => void] {
  const searchParams = useSearchParams();
  const replace = useReplaceParams();

  const raw = searchParams.get(key);
  const value: T =
    raw != null && (!allowed || (allowed as readonly string[]).includes(raw))
      ? (raw as T)
      : defaultValue;

  const set = useCallback(
    (next: T) => {
      replace({ [key]: next === defaultValue ? null : next });
    },
    [replace, key, defaultValue]
  );

  return [value, set];
}

export function useUrlNullableState(key: string): [string | null, (next: string | null) => void] {
  const searchParams = useSearchParams();
  const replace = useReplaceParams();

  const value = searchParams.get(key);

  const set = useCallback(
    (next: string | null) => {
      replace({ [key]: next });
    },
    [replace, key]
  );

  return [value, set];
}

export function useUrlBoolean(
  key: string,
  defaultValue: boolean
): [boolean, (next: boolean) => void] {
  const searchParams = useSearchParams();
  const replace = useReplaceParams();

  const raw = searchParams.get(key);
  const value = raw === null ? defaultValue : raw === '1';

  const set = useCallback(
    (next: boolean) => {
      replace({ [key]: next === defaultValue ? null : next ? '1' : '0' });
    },
    [replace, key, defaultValue]
  );

  return [value, set];
}

export function useUrlArrayState(
  key: string,
  defaultValue: readonly string[] = []
): [string[], (next: string[]) => void] {
  const searchParams = useSearchParams();
  const replace = useReplaceParams();

  const raw = searchParams.get(key);
  const defaultJoined = defaultValue.join(',');

  const value = useMemo(
    () => (raw === null ? [...defaultValue] : raw.split(',').filter(Boolean)),
    [raw, defaultValue]
  );

  const set = useCallback(
    (next: string[]) => {
      const joined = next.join(',');
      replace({ [key]: joined === '' || joined === defaultJoined ? null : joined });
    },
    [replace, key, defaultJoined]
  );

  return [value, set];
}

export interface UrlFiltersResult {
  filters: Record<string, string[]>;
  setFilters: (next: Record<string, string[]>) => void;
  clearFilters: () => void;
}

/**
 * Reads/writes a fixed set of comma-separated array params as a single
 * filters object. Used by TransactionsTable to persist filter state in URL.
 */
export function useUrlFilters(keys: readonly string[]): UrlFiltersResult {
  const searchParams = useSearchParams();
  const replace = useReplaceParams();

  const keysKey = useMemo(() => keys.slice().sort().join('|'), [keys]);

  const filters = useMemo(() => {
    const keyList = keysKey ? keysKey.split('|') : [];
    const result: Record<string, string[]> = {};
    for (const key of keyList) {
      const raw = searchParams.get(key);
      if (raw) {
        const arr = raw.split(',').filter(Boolean);
        if (arr.length) result[key] = arr;
      }
    }
    return result;
  }, [searchParams, keysKey]);

  const setFilters = useCallback(
    (next: Record<string, string[]>) => {
      const keyList = keysKey ? keysKey.split('|') : [];
      const updates: ParamUpdate = {};
      for (const key of keyList) {
        const arr = next[key];
        updates[key] = arr && arr.length > 0 ? arr.join(',') : null;
      }
      replace(updates);
    },
    [replace, keysKey]
  );

  const clearFilters = useCallback(() => {
    const keyList = keysKey ? keysKey.split('|') : [];
    const updates: ParamUpdate = {};
    for (const key of keyList) updates[key] = null;
    replace(updates);
  }, [replace, keysKey]);

  return { filters, setFilters, clearFilters };
}
