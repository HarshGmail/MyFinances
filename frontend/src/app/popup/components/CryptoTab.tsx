import React, { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchCryptoQuery } from '@/api/query';
import { CoinSearchResult } from '@/api/dataInterface';
import { OwnedCoin } from '../types';

interface CryptoTabProps {
  ownedCoins: OwnedCoin[];
  selectedCoins: string[];
  onAddCoin: (coin: CoinSearchResult | { symbol: string; name: string }) => void;
  onRemoveCoin: (symbol: string) => void;
}

export const CryptoTab: React.FC<CryptoTabProps> = ({
  ownedCoins,
  selectedCoins,
  onAddCoin,
  onRemoveCoin,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults, isLoading: searchLoading } = useSearchCryptoQuery(searchQuery);

  return (
    <div className="space-y-4 mt-4">
      {/* Owned Crypto Coins */}
      <div>
        <h3 className="font-medium mb-3">Your Crypto Holdings</h3>
        <div className="space-y-2">
          {ownedCoins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No crypto holdings found</p>
          ) : (
            ownedCoins.map((coin) => (
              <div
                key={coin.symbol}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-medium">{coin.symbol}</p>
                    <p className="text-sm text-muted-foreground">{coin.name}</p>
                  </div>
                  <Badge variant="secondary">{coin.units.toFixed(4)} units</Badge>
                </div>
                <Button
                  size="sm"
                  variant={selectedCoins.includes(coin.symbol) ? 'default' : 'outline'}
                  onClick={() => {
                    if (selectedCoins.includes(coin.symbol)) {
                      onRemoveCoin(coin.symbol);
                    } else {
                      onAddCoin({ symbol: coin.symbol, name: coin.name });
                    }
                  }}
                >
                  {selectedCoins.includes(coin.symbol) ? (
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

      {/* Search and Add Other Coins */}
      <div>
        <h3 className="font-medium mb-3">Search Other Coins</h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search for crypto coins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {searchLoading && searchQuery && (
          <div className="mt-2">
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {searchResults && searchQuery && (
          <div className="mt-2 max-h-40 overflow-y-auto border rounded">
            {searchResults.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">No results found</p>
            ) : (
              searchResults.slice(0, 10).map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => onAddCoin(coin)}
                  className="w-full flex items-center justify-between p-2 hover:bg-accent text-left"
                  disabled={selectedCoins.includes(coin.symbol.toUpperCase())}
                >
                  <div>
                    <p className="font-medium">{coin.symbol.toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">{coin.name}</p>
                  </div>
                  {selectedCoins.includes(coin.symbol.toUpperCase()) ? (
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
