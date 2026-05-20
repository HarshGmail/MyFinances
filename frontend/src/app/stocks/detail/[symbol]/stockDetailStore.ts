'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUrlBatchUpdate, useUrlState } from '@/utils/useUrlState';

export interface OverlayConfig {
  sma20: boolean;
  sma50: boolean;
  ema9: boolean;
  ema21: boolean;
  ema50: boolean;
  bollinger: boolean;
  volSma: boolean;
  vwap: boolean;
  dayHL: boolean;
  srLines: boolean;
  transactions: boolean;
}

export const DEFAULT_OVERLAYS: OverlayConfig = {
  sma20: false,
  sma50: false,
  ema9: false,
  ema21: false,
  ema50: false,
  bollinger: false,
  volSma: false,
  vwap: false,
  dayHL: false,
  srLines: false,
  transactions: false,
};

const OVERLAY_KEYS = Object.keys(DEFAULT_OVERLAYS) as (keyof OverlayConfig)[];

export function countActiveOverlays(cfg: OverlayConfig): number {
  return Object.values(cfg).filter(Boolean).length;
}

export type StockIntervalLabel = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'Max';

const INTERVAL_LABELS = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'Max'] as const;

function overlaysToString(o: OverlayConfig): string {
  return OVERLAY_KEYS.filter((k) => o[k]).join(',');
}

function overlaysFromString(raw: string | null): OverlayConfig {
  const cfg = { ...DEFAULT_OVERLAYS };
  if (!raw) return cfg;
  const allowed = new Set<string>(OVERLAY_KEYS);
  for (const key of raw.split(',')) {
    if (allowed.has(key)) cfg[key as keyof OverlayConfig] = true;
  }
  return cfg;
}

export function useStockDetailInterval(): [
  StockIntervalLabel,
  (label: StockIntervalLabel) => void,
] {
  return useUrlState<StockIntervalLabel>('interval', '1D', INTERVAL_LABELS);
}

export function useStockDetailOverlays(): [OverlayConfig, (next: OverlayConfig) => void] {
  const searchParams = useSearchParams();
  const replace = useUrlBatchUpdate();
  const raw = searchParams.get('ov');
  const value = useMemo(() => overlaysFromString(raw), [raw]);
  const set = useCallback(
    (next: OverlayConfig) => {
      const str = overlaysToString(next);
      replace({ ov: str === '' ? null : str });
    },
    [replace]
  );
  return [value, set];
}
