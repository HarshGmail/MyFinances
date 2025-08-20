import React, { useMemo, useState, useEffect } from 'react';
import { Search, Plus, X, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import _ from 'lodash';

// Queries: mirror usage from your stocks pages
import { useStockTransactionsQuery } from '@/api/query/stocks';
import { useSearchStockByNameQuery } from '@/api/query';

type StockSuggestion = {
  symbol: string; // e.g. "TCS.NS" or "RELIANCE.NS"
  longname?: string; // e.g. "Tata Consultancy Services Limited"
  typeDisp?: string; // optional
  exchDisp?: string; // optional
};

interface StocksTabProps {
  selectedStocks: string[]; // store sanitized symbols (e.g. "TCS")
  onAddStock: (symbol: string) => void;
  onRemoveStock: (symbol: string) => void;
}

export const StocksTab: React.FC<StocksTabProps> = ({
  selectedStocks,
  onAddStock,
  onRemoveStock,
}) => {
  // 1) Owned stock holdings from transactions
  const { data: stockTransactions, isLoading: txLoading } = useStockTransactionsQuery();

  const ownedStocks = useMemo(() => {
    if (!stockTransactions) return [] as { stockName: string; numOfShares: number }[];
    const grouped = _.groupBy(stockTransactions, 'stockName'); // stockName should already be a symbol you saved
    return Object.entries(grouped)
      .map(([stockName, txs]) => {
        const totalShares = (txs as typeof stockTransactions).reduce(
          (sum, tx) => sum + (tx.numOfShares ?? 0),
          0
        );
        return { stockName, numOfShares: totalShares };
      })
      .filter((row) => row.numOfShares > 0)
      .sort((a, b) => a.stockName.localeCompare(b.stockName));
  }, [stockTransactions]);

  // 2) Search & add other stocks (like your updateStock page)
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 500);
    return () => clearTimeout(id);
  }, [query]);

  const { data: suggestions, isLoading: searchLoading } = useSearchStockByNameQuery(debounced);

  const addSymbol = (rawSymbol: string) => {
    // Normalize to base symbol (e.g. "TCS.NS" -> "TCS")
    const sanitized = rawSymbol.split('.')[0].toUpperCase();
    if (!selectedStocks.includes(sanitized)) {
      onAddStock(sanitized);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Owned Stocks */}
      <div>
        <h3 className="font-medium mb-3">Your Stock Holdings</h3>

        {txLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : ownedStocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stock holdings found</p>
        ) : (
          <div className="space-y-2">
            {ownedStocks.map((row) => {
              const symbol = (row.stockName || '').toUpperCase();
              const sanitized = symbol.split('.')[0]; // in case any were saved with suffix
              const isSelected = selectedStocks.includes(sanitized);
              return (
                <div key={symbol} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <div>
                      <p className="font-medium">{sanitized}</p>
                      <p className="text-sm text-muted-foreground">{symbol}</p>
                    </div>
                    <Badge variant="secondary">{row.numOfShares} shares</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => (isSelected ? onRemoveStock(sanitized) : addSymbol(symbol))}
                  >
                    {isSelected ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search & Add */}
      <div>
        <h3 className="font-medium mb-3">Search Other Stocks</h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search for stocks (min 3 chars)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {searchLoading && debounced && (
          <div className="mt-2">
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {Array.isArray(suggestions) && debounced && (
          <div className="mt-2 max-h-48 overflow-y-auto border rounded">
            {(suggestions as StockSuggestion[]).length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">No results found</p>
            ) : (
              (suggestions as StockSuggestion[]).slice(0, 10).map((sug) => {
                const base = sug.symbol?.split('.')[0]?.toUpperCase() || '';
                const already = selectedStocks.includes(base);
                return (
                  <button
                    key={`${sug.symbol}`}
                    onClick={() => addSymbol(sug.symbol)}
                    className="w-full flex items-center justify-between p-2 hover:bg-accent text-left"
                    disabled={already}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{base}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {sug.longname || sug.symbol}
                      </p>
                    </div>
                    {already ? (
                      <Badge variant="secondary">Added</Badge>
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
