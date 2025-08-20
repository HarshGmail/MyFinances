import React from 'react';
import { Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoldPortfolioData, PiPPreferences } from '../types';
import { formatCurrency } from '../utils';

interface GoldTabProps {
  goldPortfolioData: GoldPortfolioData | null;
  preferences: PiPPreferences;
  onPreferencesChange: (preferences: PiPPreferences) => void;
}

export const GoldTab: React.FC<GoldTabProps> = ({
  goldPortfolioData,
  preferences,
  onPreferencesChange,
}) => {
  if (!goldPortfolioData || goldPortfolioData.totalGold <= 0) {
    return (
      <div className="text-center py-8 text-muted-foreground mt-4">
        <Coins className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No gold holdings found</p>
        <p className="text-sm">Add gold transactions to see them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <Coins className="w-4 h-4" />
          Your Gold Holdings
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Gold</p>
            <p className="font-medium">{goldPortfolioData.totalGold.toFixed(4)} grams</p>
          </div>
          <div>
            <p className="text-muted-foreground">Current Rate</p>
            <p className="font-medium">
              ₹{goldPortfolioData.currentGoldRate.toLocaleString()}/gram
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Invested</p>
            <p className="font-medium">{formatCurrency(goldPortfolioData.totalInvested)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Current Value</p>
            <p className="font-medium">{formatCurrency(goldPortfolioData.currentValue)}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <p className="font-medium">Show Gold Metrics</p>
          <p className="text-sm text-muted-foreground">Display detailed gold performance</p>
        </div>
        <Button
          variant={preferences.showGoldMetrics ? 'default' : 'outline'}
          size="sm"
          onClick={() =>
            onPreferencesChange({
              ...preferences,
              showGoldMetrics: !preferences.showGoldMetrics,
            })
          }
        >
          {preferences.showGoldMetrics ? 'Enabled' : 'Disabled'}
        </Button>
      </div>
    </div>
  );
};
