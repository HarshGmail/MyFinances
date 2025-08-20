import React, { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchMutualFundsQuery } from '@/api/query';
import { OwnedMutualFund } from '../types';
import { formatCurrency } from '../utils';

interface MutualFundsTabProps {
  ownedMutualFunds: OwnedMutualFund[];
  selectedMutualFunds: string[];
  onAddMutualFund: (fundName: string) => void;
  onRemoveMutualFund: (fundName: string) => void;
}

export const MutualFundsTab: React.FC<MutualFundsTabProps> = ({
  ownedMutualFunds,
  selectedMutualFunds,
  onAddMutualFund,
  onRemoveMutualFund,
}) => {
  const [mfSearchQuery, setMfSearchQuery] = useState('');
  const { data: mfSearchResults, isLoading: mfSearchLoading } =
    useSearchMutualFundsQuery(mfSearchQuery);

  return (
    <div className="space-y-4 mt-4">
      {/* Owned Mutual Funds */}
      <div>
        <h3 className="font-medium mb-3">Your Mutual Fund Holdings</h3>
        <div className="space-y-2">
          {ownedMutualFunds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mutual fund holdings found</p>
          ) : (
            ownedMutualFunds.map((fund) => (
              <div
                key={fund.fundName}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{fund.fundName}</p>
                    <p className="text-xs text-muted-foreground">
                      {fund.totalUnits.toFixed(3)} units
                    </p>
                  </div>
                  <Badge variant="secondary">{formatCurrency(fund.totalInvested)}</Badge>
                </div>
                <Button
                  size="sm"
                  variant={selectedMutualFunds.includes(fund.fundName) ? 'default' : 'outline'}
                  onClick={() => {
                    if (selectedMutualFunds.includes(fund.fundName)) {
                      onRemoveMutualFund(fund.fundName);
                    } else {
                      onAddMutualFund(fund.fundName);
                    }
                  }}
                >
                  {selectedMutualFunds.includes(fund.fundName) ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Search and Add Other Mutual Funds */}
      <div>
        <h3 className="font-medium mb-3">Search Other Mutual Funds</h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search for mutual funds..."
            value={mfSearchQuery}
            onChange={(e) => setMfSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {mfSearchLoading && mfSearchQuery && (
          <div className="mt-2">
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {mfSearchResults && mfSearchQuery && (
          <div className="mt-2 max-h-40 overflow-y-auto border rounded">
            {mfSearchResults.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">No results found</p>
            ) : (
              mfSearchResults.slice(0, 10).map((fund, index: number) => (
                <button
                  key={index}
                  onClick={() => onAddMutualFund(fund.schemeName as string)}
                  className="w-full flex items-center justify-between p-2 hover:bg-accent text-left"
                  disabled={selectedMutualFunds.includes(fund.schemeName as string)}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{fund.schemeName}</p>
                  </div>
                  {selectedMutualFunds.includes(fund.schemeName as string) ? (
                    <Badge variant="secondary">Added</Badge>
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
