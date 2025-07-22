import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

export interface AssetOption {
  type: 'stock' | 'mutualFund' | 'crypto' | 'allStocks' | 'allMutualFunds' | 'allCrypto';
  value: string;
  label: string;
}

interface GoalAssetSelectorProps {
  assetOptions: {
    stocks: AssetOption[];
    mutualFunds: AssetOption[];
    crypto: AssetOption[];
  };
  initialSelected?: {
    stockSymbols?: string[];
    mutualFundIds?: string[];
    cryptoCurrency?: string[];
  };
  onChange: (selected: {
    stockSymbols: string[];
    mutualFundIds: string[];
    cryptoCurrency: string[];
  }) => void;
}

export default function GoalAssetSelector({
  assetOptions,
  initialSelected,
  onChange,
}: GoalAssetSelectorProps) {
  // Build initial selected assets from initialSelected
  const [selectedAssets, setSelectedAssets] = useState<AssetOption[]>(() => {
    const selected: AssetOption[] = [];
    if (initialSelected) {
      if (initialSelected.stockSymbols) {
        selected.push(
          ...assetOptions.stocks.filter((opt) => initialSelected.stockSymbols?.includes(opt.value))
        );
      }
      if (initialSelected.mutualFundIds) {
        selected.push(
          ...assetOptions.mutualFunds.filter((opt) =>
            initialSelected.mutualFundIds?.includes(opt.value)
          )
        );
      }
      if (initialSelected.cryptoCurrency) {
        selected.push(
          ...assetOptions.crypto.filter((opt) =>
            initialSelected.cryptoCurrency?.includes(opt.value)
          )
        );
      }
    }
    return selected;
  });

  // Sync with parent
  useEffect(() => {
    onChange({
      stockSymbols: selectedAssets.filter((a) => a.type === 'stock').map((a) => a.value),
      mutualFundIds: selectedAssets.filter((a) => a.type === 'mutualFund').map((a) => a.value),
      cryptoCurrency: selectedAssets.filter((a) => a.type === 'crypto').map((a) => a.value),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssets]);

  // Handle selection logic (with quick select)
  function handleAssetSelectCustom(option: AssetOption) {
    setSelectedAssets((prev) => {
      // Handle All Stocks
      if (option.value === '__ALL_STOCKS__') {
        const hasAll = prev.some((a) => a.value === '__ALL_STOCKS__');
        if (hasAll) {
          return prev.filter((a) => a.type !== 'stock' && a.value !== '__ALL_STOCKS__');
        } else {
          return [
            ...prev.filter((a) => a.type !== 'stock' && a.value !== '__ALL_STOCKS__'),
            ...assetOptions.stocks,
            option,
          ];
        }
      }
      // Handle All Mutual Funds
      if (option.value === '__ALL_MF__') {
        const hasAll = prev.some((a) => a.value === '__ALL_MF__');
        if (hasAll) {
          return prev.filter((a) => a.type !== 'mutualFund' && a.value !== '__ALL_MF__');
        } else {
          return [
            ...prev.filter((a) => a.type !== 'mutualFund' && a.value !== '__ALL_MF__'),
            ...assetOptions.mutualFunds,
            option,
          ];
        }
      }
      // Handle All Crypto
      if (option.value === '__ALL_CRYPTO__') {
        const hasAll = prev.some((a) => a.value === '__ALL_CRYPTO__');
        if (hasAll) {
          return prev.filter((a) => a.type !== 'crypto' && a.value !== '__ALL_CRYPTO__');
        } else {
          return [
            ...prev.filter((a) => a.type !== 'crypto' && a.value !== '__ALL_CRYPTO__'),
            ...assetOptions.crypto,
            option,
          ];
        }
      }
      // Toggle individual asset
      const exists = prev.some((a) => a.value === option.value);
      if (exists) {
        return prev.filter((a) => a.value !== option.value);
      } else {
        return [...prev, option];
      }
    });
  }

  const QUICK_SELECT_OPTIONS = [
    { type: 'allStocks' as const, value: '__ALL_STOCKS__', label: 'All Stocks' },
    { type: 'allMutualFunds' as const, value: '__ALL_MF__', label: 'All Mutual Funds' },
    { type: 'allCrypto' as const, value: '__ALL_CRYPTO__', label: 'All Crypto Currency' },
  ];

  return (
    <div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {selectedAssets.length > 0 ? `${selectedAssets.length} selected` : 'Select assets'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0 max-h-[300px] overflow-y-auto">
          <Command>
            <CommandGroup heading="Quick Select">
              {QUICK_SELECT_OPTIONS.map((o) => (
                <CommandItem key={o.value} onSelect={() => handleAssetSelectCustom(o)}>
                  <Check
                    className={
                      selectedAssets.some((a) => a.value === o.value)
                        ? 'mr-2 h-4 w-4 opacity-100'
                        : 'mr-2 h-4 w-4 opacity-0'
                    }
                  />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Stocks">
              {assetOptions.stocks.map((o) => (
                <CommandItem key={o.value} onSelect={() => handleAssetSelectCustom(o)}>
                  <Check
                    className={
                      selectedAssets.some((a) => a.value === o.value)
                        ? 'mr-2 h-4 w-4 opacity-100'
                        : 'mr-2 h-4 w-4 opacity-0'
                    }
                  />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Mutual Funds">
              {assetOptions.mutualFunds.map((o) => (
                <CommandItem key={o.value} onSelect={() => handleAssetSelectCustom(o)}>
                  <Check
                    className={
                      selectedAssets.some((a) => a.value === o.value)
                        ? 'mr-2 h-4 w-4 opacity-100'
                        : 'mr-2 h-4 w-4 opacity-0'
                    }
                  />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Crypto Coins">
              {assetOptions.crypto.map((o) => (
                <CommandItem key={o.value} onSelect={() => handleAssetSelectCustom(o)}>
                  <Check
                    className={
                      selectedAssets.some((a) => a.value === o.value)
                        ? 'mr-2 h-4 w-4 opacity-100'
                        : 'mr-2 h-4 w-4 opacity-0'
                    }
                  />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex flex-wrap gap-2 mt-2">
        {/* Show 'All Stocks' badge if all stocks are selected */}
        {selectedAssets.some((a) => a.value === '__ALL_STOCKS__') && <Badge>All Stocks</Badge>}
        {selectedAssets.some((a) => a.value === '__ALL_MF__') && <Badge>All Mutual Funds</Badge>}
        {selectedAssets.some((a) => a.value === '__ALL_CRYPTO__') && (
          <Badge>All Crypto Currency</Badge>
        )}
        {/* Show individual badges for other selections, but only if the 'All' badge for that type is not selected */}
        {selectedAssets
          .filter(
            (a) =>
              (a.type === 'stock' && !selectedAssets.some((x) => x.value === '__ALL_STOCKS__')) ||
              (a.type === 'mutualFund' && !selectedAssets.some((x) => x.value === '__ALL_MF__')) ||
              (a.type === 'crypto' && !selectedAssets.some((x) => x.value === '__ALL_CRYPTO__'))
          )
          .map((a, idx) => (
            <Badge key={a.value + a.type + idx}>{a.label}</Badge>
          ))}
      </div>
    </div>
  );
}
