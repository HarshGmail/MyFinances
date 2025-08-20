import React, { useState } from 'react';
import { Bitcoin, Coins, PieChart, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CoinSearchResult } from '@/api/dataInterface';
import { PiPPreferences, OwnedCoin, OwnedMutualFund, GoldPortfolioData } from '../types';
import { CryptoTab } from './CryptoTab';
import { MutualFundsTab } from './MutualFundTab';
import { GoldTab } from './GoldTab';
import { StocksTab } from './StocksTab';

interface ConfigurationPanelProps {
  preferences: PiPPreferences;
  ownedCoins: OwnedCoin[];
  ownedMutualFunds: OwnedMutualFund[];
  goldPortfolioData: GoldPortfolioData | null;
  onPreferencesChange: (preferences: PiPPreferences) => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  preferences,
  ownedCoins,
  ownedMutualFunds,
  goldPortfolioData,
  onPreferencesChange,
}) => {
  const [activeTab, setActiveTab] = useState('crypto');

  // Add coin to selection
  const addCoin = (coin: CoinSearchResult | { symbol: string; name: string }) => {
    const symbol = coin.symbol.toUpperCase();
    if (!preferences.selectedCoins.includes(symbol)) {
      onPreferencesChange({
        ...preferences,
        selectedCoins: [...preferences.selectedCoins, symbol],
      });
    }
  };

  // Remove coin from selection
  const removeCoin = (symbol: string) => {
    onPreferencesChange({
      ...preferences,
      selectedCoins: preferences.selectedCoins.filter((s) => s !== symbol),
    });
  };

  // Add mutual fund to selection
  const addMutualFund = (fundName: string) => {
    if (!preferences.selectedMutualFunds.includes(fundName)) {
      onPreferencesChange({
        ...preferences,
        selectedMutualFunds: [...preferences.selectedMutualFunds, fundName],
      });
    }
  };

  // Remove mutual fund from selection
  const removeMutualFund = (fundName: string) => {
    onPreferencesChange({
      ...preferences,
      selectedMutualFunds: preferences.selectedMutualFunds.filter((f) => f !== fundName),
    });
  };

  const addStock = (symbol: string) => {
    if (!preferences.selectedStocks.includes(symbol)) {
      onPreferencesChange({
        ...preferences,
        selectedStocks: [...preferences.selectedStocks, symbol],
      });
    }
  };

  const removeStock = (symbol: string) => {
    onPreferencesChange({
      ...preferences,
      selectedStocks: preferences.selectedStocks.filter((s) => s !== symbol),
    });
  };

  return (
    <div className="space-y-4">
      {/* Portfolio Summary Toggle */}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <p className="font-medium">Portfolio Summary</p>
          <p className="text-sm text-muted-foreground">Show overall portfolio metrics</p>
        </div>
        <Button
          variant={preferences.showPortfolioSummary ? 'default' : 'outline'}
          size="sm"
          onClick={() =>
            onPreferencesChange({
              ...preferences,
              showPortfolioSummary: !preferences.showPortfolioSummary,
            })
          }
        >
          {preferences.showPortfolioSummary ? 'Enabled' : 'Disabled'}
        </Button>
      </div>

      {/* Gold Toggle */}
      {goldPortfolioData && goldPortfolioData.totalGold > 0 && (
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="font-medium">Include Gold</p>
            <p className="text-sm text-muted-foreground">
              {goldPortfolioData.totalGold.toFixed(4)} grams owned
            </p>
          </div>
          <Button
            variant={preferences.includeGold ? 'default' : 'outline'}
            size="sm"
            onClick={() =>
              onPreferencesChange({
                ...preferences,
                includeGold: !preferences.includeGold,
              })
            }
          >
            {preferences.includeGold ? 'Included' : 'Excluded'}
          </Button>
        </div>
      )}

      {/* Tabs for Crypto, Gold, and Mutual Funds */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="crypto" className="flex items-center gap-2">
            <Bitcoin className="w-4 h-4" />
            Crypto
          </TabsTrigger>
          <TabsTrigger value="gold" className="flex items-center gap-2">
            <Coins className="w-4 h-4" />
            Gold
          </TabsTrigger>
          <TabsTrigger value="mutual-funds" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Mutual Funds
          </TabsTrigger>
          <TabsTrigger value="stocks" className="flex items-center gap-2">
            {' '}
            {/* NEW */}
            <TrendingUp className="w-4 h-4" />
            Stocks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crypto">
          <CryptoTab
            ownedCoins={ownedCoins}
            selectedCoins={preferences.selectedCoins}
            onAddCoin={addCoin}
            onRemoveCoin={removeCoin}
          />
        </TabsContent>

        <TabsContent value="mutual-funds">
          <MutualFundsTab
            ownedMutualFunds={ownedMutualFunds}
            selectedMutualFunds={preferences.selectedMutualFunds}
            onAddMutualFund={addMutualFund}
            onRemoveMutualFund={removeMutualFund}
          />
        </TabsContent>

        <TabsContent value="gold">
          <GoldTab
            goldPortfolioData={goldPortfolioData}
            preferences={preferences}
            onPreferencesChange={onPreferencesChange}
          />
        </TabsContent>

        <TabsContent value="stocks">
          <StocksTab
            selectedStocks={preferences.selectedStocks}
            onAddStock={addStock}
            onRemoveStock={removeStock}
          />
        </TabsContent>
      </Tabs>

      {/* Selected Assets Summary */}
      {(preferences.selectedCoins.length > 0 ||
        preferences.selectedMutualFunds.length > 0 ||
        (preferences.selectedStocks?.length ?? 0) > 0 ||
        preferences.includeGold) && (
        <div>
          <h3 className="font-medium mb-3">Selected for PiP Widget</h3>
          <div className="flex flex-wrap gap-2">
            {preferences.selectedCoins.map((symbol) => (
              <Badge key={symbol} variant="default" className="flex items-center gap-1">
                <Bitcoin className="w-3 h-3" />
                {symbol}
                <button
                  onClick={() => removeCoin(symbol)}
                  className="ml-1 hover:bg-destructive/20 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {preferences.selectedMutualFunds.map((fundName) => (
              <Badge key={fundName} variant="default" className="flex items-center gap-1">
                <PieChart className="w-3 h-3" />
                <span className="max-w-[100px] truncate">{fundName}</span>
                <button
                  onClick={() => removeMutualFund(fundName)}
                  className="ml-1 hover:bg-destructive/20 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {preferences.includeGold && goldPortfolioData && (
              <Badge variant="default" className="flex items-center gap-1">
                <Coins className="w-3 h-3" />
                Gold
                <button
                  onClick={() =>
                    onPreferencesChange({
                      ...preferences,
                      includeGold: false,
                    })
                  }
                  className="ml-1 hover:bg-destructive/20 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {preferences.selectedStocks.map((symbol) => (
              <Badge key={`stock-${symbol}`} variant="default" className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {symbol}
                <button
                  onClick={() => removeStock(symbol)}
                  className="ml-1 hover:bg-destructive/20 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
