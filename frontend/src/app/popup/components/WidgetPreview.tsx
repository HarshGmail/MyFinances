import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bitcoin, PieChart, Coins, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PiPPreferences,
  PortfolioMetrics,
  GoldPortfolioData,
  MutualFundPortfolioData,
  CoinDetails,
  StockDetails,
} from '../types';
import { formatCurrency } from '../utils';
import { PortfolioSummary } from './PortfolioSummary';

interface WidgetPreviewProps {
  preferences: PiPPreferences;
  cryptoPortfolioMetrics: PortfolioMetrics | null;
  mfPortfolioMetrics: PortfolioMetrics | null;
  goldPortfolioData: GoldPortfolioData | null;
  selectedCoinDetails: CoinDetails[];
  mfPortfolioData: MutualFundPortfolioData[];
  selectedStockDetails: StockDetails[];
  isPricesLoading: boolean;
  compact?: boolean;
}

export const WidgetPreview: React.FC<WidgetPreviewProps> = ({
  preferences,
  cryptoPortfolioMetrics,
  mfPortfolioMetrics,
  goldPortfolioData,
  selectedCoinDetails,
  selectedStockDetails,
  mfPortfolioData,
  isPricesLoading,
  compact = false,
}) => {
  const selectedMfDetails = useMemo(() => {
    return preferences.selectedMutualFunds
      .map((fundName) => {
        return mfPortfolioData.find((fund) => fund.fundName === fundName);
      })
      .filter(Boolean);
  }, [preferences.selectedMutualFunds, mfPortfolioData]);

  const assetsWrapRef = useRef<HTMLDivElement | null>(null);
  const [useGridLayout, setUseGridLayout] = useState(false);

  useEffect(() => {
    const el = assetsWrapRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // Heuristic: if it's wide relative to height, use grid. Tune thresholds if needed.
      const ratio = width / Math.max(height, 1);
      const wideEnough = width >= 560; // avoid grid on very narrow views
      const shortish = ratio >= 1.1; // more width than height
      setUseGridLayout(wideEnough && shortish);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (isPricesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const hasSelectedAssets = Boolean(
    (preferences.selectedCoins?.length ?? 0) > 0 ||
      (preferences.selectedMutualFunds?.length ?? 0) > 0 ||
      (preferences.selectedStocks?.length ?? 0) > 0 ||
      preferences.includeGold
  );

  return (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      {preferences.showPortfolioSummary && (
        <PortfolioSummary
          cryptoPortfolioMetrics={cryptoPortfolioMetrics}
          mfPortfolioMetrics={mfPortfolioMetrics}
          goldPortfolioData={goldPortfolioData}
          includeGold={preferences.includeGold}
          compact
        />
      )}

      {/* Selected Assets */}
      {!hasSelectedAssets ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No assets selected</p>
          <p className="text-sm">
            Add stocks, crypto, mutual funds, or gold to see them in the widget
          </p>
        </div>
      ) : (
        <div
          ref={assetsWrapRef}
          className={
            useGridLayout
              ? 'grid [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))] gap-2'
              : 'flex flex-col gap-2'
          }
        >
          {compact && <h4 className="font-medium">Selected Assets</h4>}

          {/* Gold Preview */}
          {preferences.includeGold && goldPortfolioData && (
            <div className="p-3 border rounded-lg bg-yellow-50/50 dark:bg-yellow-950/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  <p className="font-medium">Gold</p>
                  <Badge variant="secondary">Owned</Badge>
                </div>
                <p className="text-sm font-medium">
                  ₹{goldPortfolioData.currentGoldRate.toLocaleString()}/gram
                </p>
              </div>
              {preferences.showGoldMetrics && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Holdings</p>
                    <p>{goldPortfolioData.totalGold.toFixed(4)} grams</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Value</p>
                    <p>{formatCurrency(goldPortfolioData.currentValue)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mutual Funds Preview */}
          {selectedMfDetails.map(
            (fund) =>
              fund && (
                <div
                  key={fund.fundName}
                  className="p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-4 h-4" />
                      <p className="font-medium text-sm">{fund.fundName}</p>
                      <Badge variant="secondary">Owned</Badge>
                    </div>
                    {fund.currentNav && (
                      <p className="text-sm font-medium">₹{fund.currentNav.toFixed(2)}</p>
                    )}
                  </div>
                  {preferences.showMfMetrics && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Holdings</p>
                        <p>{fund.totalUnits.toFixed(3)} units</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Value</p>
                        <p>{fund.currentValue ? formatCurrency(fund.currentValue) : 'N/A'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
          )}
          {/*Stocks Preview */}
          {preferences.selectedStocks?.length
            ? selectedStockDetails.map((stk) => (
                <div key={stk.symbol} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      <p className="font-medium">{stk.symbol}</p>
                      {stk.isOwned && <Badge variant="secondary">Owned</Badge>}
                    </div>
                    <p className="text-sm font-medium">
                      {typeof stk.currentPrice === 'number'
                        ? `₹${stk.currentPrice.toLocaleString()}`
                        : 'N/A'}
                    </p>
                  </div>
                  {stk.isOwned && typeof stk.currentPrice === 'number' && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Holdings</p>
                        <p>{stk.shares?.toFixed(2)} shares</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Value</p>
                        <p>{formatCurrency(stk.currentValue ?? 0)}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            : null}

          {/* Crypto Coins Preview */}
          {selectedCoinDetails.map((coin) => (
            <div key={coin.symbol} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bitcoin className="w-4 h-4" />
                  <p className="font-medium">{coin.symbol}</p>
                  {coin.isOwned && <Badge variant="secondary">Owned</Badge>}
                </div>
                <p className="text-sm font-medium">₹{coin.currentPrice.toLocaleString()}</p>
              </div>
              {coin.isOwned && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Holdings</p>
                    <p>{coin.units?.toFixed(4)} units</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Value</p>
                    <p>{formatCurrency(coin.currentValue || 0)}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
