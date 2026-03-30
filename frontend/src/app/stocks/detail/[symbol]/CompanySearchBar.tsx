'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchStockByNameQuery } from '@/api/query/stocks';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface PortfolioStock {
  stockName: string;
}

interface Props {
  currentSymbol: string;
  portfolioStocks: PortfolioStock[];
  onSelect: (symbol: string) => void;
}

export default function CompanySearchBar({ currentSymbol, portfolioStocks, onSelect }: Props) {
  const [searchQuery, setSearchQuery] = useState(currentSymbol);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: searchResults } = useSearchStockByNameQuery(
    searchQuery.length > 3 ? searchQuery : ''
  );

  useEffect(() => {
    setSearchQuery(currentSymbol);
  }, [currentSymbol]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    if (searchQuery.length > 3 && searchResults) return searchResults;
    return portfolioStocks.map((s) => ({
      symbol: s.stockName,
      shortname: s.stockName,
      exchange: 'NSI',
    }));
  }, [searchQuery, searchResults, portfolioStocks]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search any company..."
          className="pl-9"
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {searchQuery.length <= 3 && (
            <div className="px-3 py-1.5 text-xs text-muted-foreground border-b">Your portfolio</div>
          )}
          {suggestions.slice(0, 8).map((s) => {
            const sym = 'symbol' in s ? s.symbol : '';
            const name = 'shortname' in s ? s.shortname : sym;
            return (
              <button
                key={sym}
                onMouseDown={() => {
                  setShowSuggestions(false);
                  onSelect(sym);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between"
              >
                <span className="font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">{sym}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
