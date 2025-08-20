'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

import { PiPPreferences, CoinDetails, StockDetails } from './types';
import { usePipData } from './usePipData';
import { savePreferencesToStorage, loadPreferencesFromStorage } from './utils';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { WidgetPreview } from './components/WidgetPreview';
import { PreviewPiPButton } from './components/PreviewPiPButton';

const PiPCustomizationPage = () => {
  const [preferences, setPreferences] = useState<PiPPreferences>({
    selectedCoins: [],
    selectedMutualFunds: [],
    selectedStocks: [],
    showPortfolioSummary: true,
    includeGold: false,
    showGoldMetrics: true,
    showMfMetrics: true,
  });

  const {
    ownedCoins,
    ownedStocks,
    stockPrices,
    ownedMutualFunds,
    goldPortfolioData,
    mfPortfolioData,
    coinPrices,
    cryptoPortfolioMetrics,
    mfPortfolioMetrics,
    isLoading,
    isPricesLoading,
  } = usePipData(preferences.selectedCoins, preferences.selectedStocks);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = loadPreferencesFromStorage();
    if (savedPreferences) {
      setPreferences({
        ...savedPreferences,
        selectedStocks: savedPreferences.selectedStocks ?? [],
      });
    } else {
      // Default to showing owned assets
      setPreferences({
        selectedCoins: ownedCoins.map((coin) => coin.symbol),
        selectedMutualFunds: ownedMutualFunds.map((fund) => fund.fundName),
        selectedStocks: [],
        showPortfolioSummary: true,
        includeGold: goldPortfolioData ? goldPortfolioData.totalGold > 0 : false,
        showGoldMetrics: true,
        showMfMetrics: true,
      });
    }
  }, [ownedCoins, goldPortfolioData, ownedMutualFunds]);

  // Save preferences to localStorage
  const savePreferences = () => {
    savePreferencesToStorage(preferences);
    toast.success('Preferences saved successfully!');
  };

  // Reset to default
  const resetToDefault = () => {
    setPreferences({
      selectedCoins: ownedCoins.map((coin) => coin.symbol),
      selectedMutualFunds: ownedMutualFunds.map((fund) => fund.fundName),
      selectedStocks: [],
      showPortfolioSummary: true,
      includeGold: goldPortfolioData ? goldPortfolioData.totalGold > 0 : false,
      showGoldMetrics: true,
      showMfMetrics: true,
    });
    toast.info('Reset to default preferences');
  };

  // Get selected coin details
  const selectedCoinDetails: CoinDetails[] = useMemo(() => {
    return preferences.selectedCoins.map((symbol) => {
      const ownedCoin = ownedCoins.find((coin) => coin.symbol === symbol);
      const currentPrice = coinPrices?.data?.[symbol] || 0;

      if (ownedCoin) {
        const currentValue = ownedCoin.units * currentPrice;
        const profitLoss = currentValue - ownedCoin.invested;
        const profitLossPercentage =
          ownedCoin.invested > 0 ? (profitLoss / ownedCoin.invested) * 100 : 0;

        return {
          symbol,
          name: ownedCoin.name,
          isOwned: true,
          units: ownedCoin.units,
          invested: ownedCoin.invested,
          currentPrice,
          currentValue,
          profitLoss,
          profitLossPercentage,
        };
      } else {
        return {
          symbol,
          name: symbol,
          isOwned: false,
          currentPrice,
        };
      }
    });
  }, [preferences.selectedCoins, ownedCoins, coinPrices]);

  const selectedStockDetails: StockDetails[] = useMemo(() => {
    return (preferences.selectedStocks || []).map((symbol) => {
      const base = symbol.toUpperCase();
      const owned = (ownedStocks || []).find((s) => s.symbol === base);
      const currentPrice = stockPrices && base in stockPrices ? stockPrices[base] : null;

      if (owned) {
        const currentValue = currentPrice != null ? owned.shares * currentPrice : null;
        return {
          symbol: base,
          isOwned: true,
          shares: owned.shares,
          currentPrice,
          currentValue,
        };
      }
      return {
        symbol: base,
        isOwned: false,
        currentPrice,
      };
    });
  }, [preferences.selectedStocks, ownedStocks, stockPrices]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            PiP Widget Customization
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure what you want to see in your portfolio widget
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefault}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={savePreferences}>
            <Save className="w-4 h-4 mr-2" />
            Save Preferences
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Configure Assets to Display</CardTitle>
          </CardHeader>
          <CardContent>
            <ConfigurationPanel
              preferences={preferences}
              ownedCoins={ownedCoins}
              ownedMutualFunds={ownedMutualFunds}
              goldPortfolioData={goldPortfolioData}
              onPreferencesChange={setPreferences}
            />
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Widget Preview</CardTitle>
            <PreviewPiPButton label="Pop out" width={380} height={620}>
              <div className="p-3 bg-background text-foreground min-w-[320px]">
                <WidgetPreview
                  preferences={preferences}
                  cryptoPortfolioMetrics={cryptoPortfolioMetrics}
                  mfPortfolioMetrics={mfPortfolioMetrics}
                  goldPortfolioData={goldPortfolioData}
                  selectedCoinDetails={selectedCoinDetails}
                  mfPortfolioData={mfPortfolioData}
                  selectedStockDetails={selectedStockDetails}
                  isPricesLoading={isPricesLoading}
                />
              </div>
            </PreviewPiPButton>
          </CardHeader>
          <CardContent>
            <WidgetPreview
              preferences={preferences}
              cryptoPortfolioMetrics={cryptoPortfolioMetrics}
              mfPortfolioMetrics={mfPortfolioMetrics}
              goldPortfolioData={goldPortfolioData}
              selectedCoinDetails={selectedCoinDetails}
              mfPortfolioData={mfPortfolioData}
              selectedStockDetails={selectedStockDetails}
              isPricesLoading={isPricesLoading}
              compact
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PiPCustomizationPage;
