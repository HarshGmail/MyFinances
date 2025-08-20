import React from 'react';
import { PortfolioMetrics, GoldPortfolioData } from '../types';
import { formatCurrency } from '../utils';

interface PortfolioSummaryProps {
  cryptoPortfolioMetrics: PortfolioMetrics | null;
  mfPortfolioMetrics: PortfolioMetrics | null;
  goldPortfolioData: GoldPortfolioData | null;
  includeGold: boolean;
  compact?: boolean; // NEW
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  cryptoPortfolioMetrics,
  mfPortfolioMetrics,
  goldPortfolioData,
  includeGold,
  compact = false, // NEW
}) => {
  const items: Array<{ key: string; label: string; invested: number; current: number }> = [];

  if (cryptoPortfolioMetrics) {
    items.push({
      key: 'crypto',
      label: 'Crypto',
      invested: cryptoPortfolioMetrics.totalInvested,
      current: cryptoPortfolioMetrics.totalCurrentValue,
    });
  }

  if (mfPortfolioMetrics) {
    items.push({
      key: 'mf',
      label: 'Mutual Funds',
      invested: mfPortfolioMetrics.totalInvested,
      current: mfPortfolioMetrics.totalCurrentValue,
    });
  }

  if (includeGold && goldPortfolioData) {
    items.push({
      key: 'gold',
      label: 'Gold',
      invested: goldPortfolioData.totalInvested,
      current: goldPortfolioData.currentValue,
    });
  }

  if (items.length === 0) return null;

  // COMPACT (PiP): single-line rows, tiny spacing, smaller font, uses width efficiently
  if (compact) {
    return (
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <h4 className="font-medium mb-1 text-sm">Portfolio Summary</h4>
        <div className="text-xs tabular-nums divide-y divide-border/40">
          {items.map((it) => (
            <div key={it.key} className="py-1.5 flex items-center justify-between gap-! flex-wrap">
              <span className="font-medium min-w-[84px]">{it.label}</span>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">inv</span>
                <span className="font-medium">{formatCurrency(it.invested)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">cur</span>
                <span className="font-medium">{formatCurrency(it.current)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // DEFAULT (in-page): your original look, with slightly tightened spacing
  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
      <h4 className="font-medium mb-2">Portfolio Summary</h4>

      {cryptoPortfolioMetrics && (
        <div className="mb-3">
          <p className="text-sm font-medium mb-1">Crypto</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Invested</p>
              <p className="font-medium">{formatCurrency(cryptoPortfolioMetrics.totalInvested)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Current</p>
              <p className="font-medium">
                {formatCurrency(cryptoPortfolioMetrics.totalCurrentValue)}
              </p>
            </div>
          </div>
        </div>
      )}

      {mfPortfolioMetrics && (
        <div className="mb-3">
          <p className="text-sm font-medium mb-1">Mutual Funds</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Invested</p>
              <p className="font-medium">{formatCurrency(mfPortfolioMetrics.totalInvested)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Current</p>
              <p className="font-medium">{formatCurrency(mfPortfolioMetrics.totalCurrentValue)}</p>
            </div>
          </div>
        </div>
      )}

      {includeGold && goldPortfolioData && (
        <div>
          <p className="text-sm font-medium mb-1">Gold</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Invested</p>
              <p className="font-medium">{formatCurrency(goldPortfolioData.totalInvested)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Current</p>
              <p className="font-medium">{formatCurrency(goldPortfolioData.currentValue)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
