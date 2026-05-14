import { create } from 'zustand';

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
};

export function countActiveOverlays(cfg: OverlayConfig): number {
  return Object.values(cfg).filter(Boolean).length;
}

export type StockIntervalLabel = '1D' | '1W' | '1M' | '3M' | '1Y';

interface StockDetailState {
  selectedIntervalLabel: StockIntervalLabel;
  setSelectedIntervalLabel: (label: StockIntervalLabel) => void;

  overlays: OverlayConfig;
  setOverlays: (overlays: OverlayConfig) => void;
  resetOverlays: () => void;
}

export const useStockDetailStore = create<StockDetailState>((set) => ({
  selectedIntervalLabel: '1D',
  setSelectedIntervalLabel: (selectedIntervalLabel) => set({ selectedIntervalLabel }),

  overlays: DEFAULT_OVERLAYS,
  setOverlays: (overlays) => set({ overlays }),
  resetOverlays: () => set({ overlays: DEFAULT_OVERLAYS }),
}));
