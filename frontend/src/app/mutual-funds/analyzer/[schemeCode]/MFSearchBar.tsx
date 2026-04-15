'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchMutualFundsQuery } from '@/api/query/mutual-funds-info';
import { MutualFundInfo, MutualFundSearchResponse } from '@/api/dataInterface';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search } from 'lucide-react';

interface MFSearchBarProps {
  currentSchemeCode?: number;
  portfolioFunds?: MutualFundInfo[];
  onSelect?: (schemeCode: number) => void;
}

export default function MFSearchBar({
  currentSchemeCode,
  portfolioFunds = [],
  onSelect,
}: MFSearchBarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { data: searchResults } = useSearchMutualFundsQuery(query);

  const results = useMemo<
    Array<MutualFundSearchResponse & { type: 'search' | 'portfolio' }>
  >(() => {
    if (query.length < 3) {
      // Show portfolio funds as quick-picks
      return portfolioFunds
        .filter((f) => f.schemeNumber !== currentSchemeCode)
        .map((f) => ({
          schemeCode: f.schemeNumber,
          schemeName: f.fundName || `Scheme ${f.schemeNumber}`,
          isinGrowth: null,
          isinDivReinvestment: null,
          type: 'portfolio' as const,
        }));
    }

    // Show search results, filter out duplicates and current fund
    const searchMap = new Map<number, MutualFundSearchResponse>();
    (searchResults || [])
      .filter((r) => r.schemeCode !== currentSchemeCode)
      .forEach((r) => {
        if (!searchMap.has(r.schemeCode)) {
          searchMap.set(r.schemeCode, r);
        }
      });

    return Array.from(searchMap.values()).map((r) => ({ ...r, type: 'search' as const }));
  }, [query, searchResults, currentSchemeCode, portfolioFunds]);

  const handleSelect = (schemeCode: number) => {
    setOpen(false);
    setQuery('');
    if (onSelect) {
      onSelect(schemeCode);
    } else {
      router.push(`/mutual-funds/detail/${schemeCode}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search mutual funds..."
            className="pl-10"
            onFocus={() => setOpen(true)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </PopoverTrigger>

      {(open || query) && (
        <PopoverContent className="w-[350px] p-0" align="start">
          <Command>
            <CommandList>
              {results.length === 0 && query.length >= 3 ? (
                <CommandEmpty>No funds found</CommandEmpty>
              ) : null}

              {query.length < 3 && portfolioFunds.length > 0 && (
                <CommandGroup heading="Your Portfolio">
                  {portfolioFunds
                    .filter((f) => f.schemeNumber !== currentSchemeCode)
                    .map((fund) => (
                      <CommandItem
                        key={fund.schemeNumber}
                        value={String(fund.schemeNumber)}
                        onSelect={() => handleSelect(fund.schemeNumber)}
                      >
                        <div>
                          <p className="text-sm font-medium">{fund.fundName}</p>
                          <p className="text-xs text-muted-foreground">
                            Scheme #{fund.schemeNumber}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}

              {results.length > 0 && (
                <CommandGroup heading={query.length < 3 ? 'Search Results' : undefined}>
                  {results.slice(0, 10).map((result) => (
                    <CommandItem
                      key={result.schemeCode}
                      value={String(result.schemeCode)}
                      onSelect={() => handleSelect(result.schemeCode)}
                    >
                      <div>
                        <p className="text-sm font-medium">{result.schemeName}</p>
                        <p className="text-xs text-muted-foreground">Scheme #{result.schemeCode}</p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
}
