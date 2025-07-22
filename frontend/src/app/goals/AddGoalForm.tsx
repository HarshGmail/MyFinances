'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAddGoalMutation } from '@/api/mutations';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useStockTransactionsQuery } from '@/api/query/stocks';
import { useMutualFundInfoFetchQuery } from '@/api/query/mutual-funds-info';
import { useCryptoTransactionsQuery } from '@/api/query/crypto';
import { Badge } from '@/components/ui/badge';
import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import { Check } from 'lucide-react';

const formSchema = z.object({
  goalName: z.string().min(1, 'Goal name is required'),
  stockSymbols: z.array(z.string()),
  mutualFundNames: z.array(z.string()),
  cryptoCoins: z.array(z.string()),
  goldAlloted: z.number().min(0, 'Gold alloted must be non-negative').optional(),
  description: z.string().optional(),
  targetAmount: z.number().min(1, 'Target amount must be positive').optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Types for asset options
interface AssetOption {
  type: 'stock' | 'mutualFund' | 'crypto' | 'allStocks' | 'allMutualFunds' | 'allCrypto';
  value: string;
  label: string;
}

export default function AddGoalForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goalName: '',
      stockSymbols: [],
      mutualFundNames: [],
      cryptoCoins: [],
      goldAlloted: undefined,
      description: '',
      targetAmount: undefined,
    },
  });
  const router = useRouter();
  const { mutate, isPending } = useAddGoalMutation();

  // Fetch options
  const { data: stockData } = useStockTransactionsQuery();
  const { data: mfData } = useMutualFundInfoFetchQuery();
  const { data: cryptoTxData } = useCryptoTransactionsQuery();

  // Extract unique stock names
  const stockOptions = useMemo<AssetOption[]>(
    () =>
      Array.from(new Set((stockData || []).map((s) => s.stockName)))
        .filter((name): name is string => Boolean(name))
        .sort()
        .map((name) => ({ type: 'stock', value: String(name), label: String(name) })),
    [stockData]
  );
  // Extract unique mutual fund names
  const mutualFundOptions = useMemo<AssetOption[]>(
    () =>
      (mfData || [])
        .filter((mf) => mf.fundName && mf._id)
        .map((mf) => ({
          type: 'mutualFund',
          value: String(mf._id), // Use _id as value
          label: String(mf.fundName),
          fundName: String(mf.fundName), // for display
        })),
    [mfData]
  );
  // Extract unique crypto coin names
  const cryptoOptions = useMemo<AssetOption[]>(() => {
    if (!cryptoTxData) return [];
    return Array.from(
      new Set(
        cryptoTxData.map(
          (tx: { coinName?: string; coinSymbol?: string }) => tx.coinName || tx.coinSymbol
        )
      )
    )
      .filter((name): name is string => Boolean(name))
      .sort()
      .map((name) => ({ type: 'crypto', value: String(name), label: String(name) }));
  }, [cryptoTxData]);

  // State for selected assets
  const [selectedAssets, setSelectedAssets] = useState<AssetOption[]>([]);

  // Handle selection logic
  function handleAssetSelectCustom(option: AssetOption) {
    setSelectedAssets((prev) => {
      // Handle All Stocks
      if (option.value === '__ALL_STOCKS__') {
        const hasAll = prev.some((a) => a.value === '__ALL_STOCKS__');
        if (hasAll) {
          // Remove all stocks and the all option
          return prev.filter((a) => a.type !== 'stock' && a.value !== '__ALL_STOCKS__');
        } else {
          // Add all stocks and the all option
          return [
            ...prev.filter((a) => a.type !== 'stock' && a.value !== '__ALL_STOCKS__'),
            ...stockOptions,
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
            ...mutualFundOptions,
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
            ...cryptoOptions,
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

  // Prepare form values for mutation
  function onSubmit(values: FormValues) {
    // Split selectedAssets into arrays for each type
    const stockSymbols = selectedAssets.filter((a) => a.type === 'stock').map((a) => a.value);
    const mutualFundIds = selectedAssets.filter((a) => a.type === 'mutualFund').map((a) => a.value); // value is now the _id
    const cryptoCurrency = selectedAssets.filter((a) => a.type === 'crypto').map((a) => a.value);
    mutate(
      {
        ...values,
        stockSymbols,
        mutualFundIds,
        cryptoCurrency,
        goldAlloted:
          values.goldAlloted === undefined || values.goldAlloted === null
            ? undefined
            : Number(values.goldAlloted),
        ...(values.targetAmount !== undefined && values.targetAmount !== null
          ? { targetAmount: Number(values.targetAmount) }
          : {}),
      },
      {
        onSuccess: () => {
          toast.success('Goal added successfully');
          router.push('/goals');
        },
        onError: (error: unknown) => {
          let description = 'An error occurred';
          if (
            error &&
            typeof error === 'object' &&
            'message' in error &&
            typeof (error as Error).message === 'string'
          ) {
            description = (error as Error).message;
          }
          toast.error('Goal addition failed!', {
            description,
          });
        },
      }
    );
  }

  return (
    <div className="w-full max-w-xl p-10 rounded-lg shadow-lg bg-card">
      <h2 className="text-2xl font-bold mb-6 text-center">Add New Goal</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Goal Name */}
          <FormField
            control={form.control}
            name="goalName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Goal Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter goal name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Asset Multi-Select Dropdown */}
          <FormItem>
            <FormLabel>Assets</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedAssets.length > 0
                    ? `${selectedAssets.length} selected`
                    : 'Select assets'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0 max-h-[300px] overflow-y-auto">
                <Command>
                  <CommandGroup heading="Quick Select">
                    {(
                      [
                        { type: 'allStocks', value: '__ALL_STOCKS__', label: 'All Stocks' },
                        {
                          type: 'allMutualFunds',
                          value: '__ALL_MF__',
                          label: 'All Mutual Funds',
                        },
                        {
                          type: 'allCrypto',
                          value: '__ALL_CRYPTO__',
                          label: 'All Crypto Currency',
                        },
                      ] as AssetOption[]
                    ).map((o) => (
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
                    {stockOptions.map((o) => (
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
                    {mutualFundOptions.map((o) => (
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
                    {cryptoOptions.map((o) => (
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
              {selectedAssets.some((a) => a.value === '__ALL_STOCKS__') && (
                <Badge>All Stocks</Badge>
              )}
              {selectedAssets.some((a) => a.value === '__ALL_MF__') && (
                <Badge>All Mutual Funds</Badge>
              )}
              {selectedAssets.some((a) => a.value === '__ALL_CRYPTO__') && (
                <Badge>All Crypto Currency</Badge>
              )}
              {/* Show individual badges for other selections, but only if the 'All' badge for that type is not selected */}
              {selectedAssets
                .filter(
                  (a) =>
                    (a.type === 'stock' &&
                      !selectedAssets.some((x) => x.value === '__ALL_STOCKS__')) ||
                    (a.type === 'mutualFund' &&
                      !selectedAssets.some((x) => x.value === '__ALL_MF__')) ||
                    (a.type === 'crypto' &&
                      !selectedAssets.some((x) => x.value === '__ALL_CRYPTO__'))
                )
                .map((a, idx) => (
                  <Badge key={a.value + a.type + idx}>{a.label}</Badge>
                ))}
            </div>
          </FormItem>

          {/* Gold Alloted */}
          <FormField
            control={form.control}
            name="goldAlloted"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gold Alloted (grams)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Enter gold alloted in grams"
                    {...field}
                    value={field.value === undefined ? '' : field.value}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Target Amount */}
          <FormField
            control={form.control}
            name="targetAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="Enter target amount"
                    {...field}
                    value={field.value === undefined ? '' : field.value}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Enter description (optional)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Adding Goal...' : 'Add Goal'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
