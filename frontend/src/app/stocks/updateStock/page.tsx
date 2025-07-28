'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Calendar as CalendarIcon,
  Loader2,
  TrendingUp,
  IndianRupee,
  Hash,
  Search,
  ChevronDown,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAddStockTransactionMutation } from '@/api/mutations';
import { useSearchStockByNameQuery } from '@/api/query';
import { debounce } from 'lodash';

const formSchema = z.object({
  type: z.enum(['credit', 'debit'], { required_error: 'Type is required' }),
  date: z
    .date({ required_error: 'Date is required' })
    .max(new Date(), { message: 'Date cannot be in the future' }),
  marketPrice: z.number().min(0, 'Stock price must be at least 0'),
  numOfShares: z.number().min(0, 'Quantity must be at least 0'),
  stockName: z.string().min(1, 'Stock name is required'),
});

type FormValues = z.infer<typeof formSchema>;

const CACHE_KEY = 'stockTransactionFormCache';

export default function StocksUpdateStockPage() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'credit',
      date: undefined,
      marketPrice: 0,
      numOfShares: 0,
      stockName: '',
    },
  });

  const [dateOpen, setDateOpen] = useState(false);
  const [stockNameInput, setStockNameInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{ longname: string; symbol: string } | null>(
    null
  );
  const router = useRouter();
  const { mutate, isPending } = useAddStockTransactionMutation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search stock query with debounced input
  const { data: stockSuggestions, error: stockSearchError } =
    useSearchStockByNameQuery(stockNameInput);

  // Handle search errors
  useEffect(() => {
    if (stockSearchError) {
      console.error('Stock search error:', stockSearchError);
    }
  }, [stockSearchError]);

  // Debounced handler for stock search
  const debouncedSetStockNameInput = debounce((val: string) => {
    setStockNameInput(val);
  }, 1000);

  // Load cached values if present
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        Object.entries(parsed).forEach(([key, value]) => {
          if (key in form.getValues()) {
            let v = value;
            if (key === 'date' && typeof value === 'string') {
              v = new Date(value);
            } else if (['marketPrice', 'numOfShares'].includes(key) && typeof value === 'string') {
              v = Number(value);
            }
            form.setValue(key as keyof FormValues, v as FormValues[keyof FormValues]);
          }
        });
        // Also restore selected stock if present
        if (parsed.selectedStock) {
          setSelectedStock(parsed.selectedStock);
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save form values to cache on change
  useEffect(() => {
    const subscription = form.watch((values) => {
      const cacheData = { ...values, selectedStock };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    });
    return () => subscription.unsubscribe();
  }, [form, selectedStock]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [showLoader, setShowLoader] = useState(false);
  function onSubmit(values: FormValues) {
    const amount = values.numOfShares * values.marketPrice;
    // Use the symbol from selectedStock if available, otherwise use the form value
    const stockNameToSubmit = selectedStock?.symbol || values.stockName;

    mutate(
      {
        ...values,
        stockName: stockNameToSubmit,
        date: values.date.toISOString(),
        amount,
      },
      {
        onSuccess: () => {
          setShowLoader(true);
          toast.success('Stock transaction added successfully');
          router.push('/stocks/transactions');
          localStorage.removeItem(CACHE_KEY);
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
          toast.error('Transaction Addition failed!', {
            description,
          });
        },
      }
    );
  }

  const watchedValues = form.watch();
  const totalAmount = (watchedValues.marketPrice || 0) * (watchedValues.numOfShares || 0);

  return (
    <div className="h-full bg-background overflow-hidden flex items-center justify-center px-4 py-9">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3">
            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Stock Transaction
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add a new transaction to update your portfolio
          </p>
        </div>

        {/* Form Card */}
        {isPending || showLoader ? (
          <Loader2 className="animate-spin mr-2 h-5 w-5" />
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow">
            <div className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* Transaction Type */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Transaction Type
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <select
                              {...field}
                              className="w-full appearance-none bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            >
                              <option value="credit">Buy (Credit)</option>
                              <option value="debit">Sell (Debit)</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date and Stock Name Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Transaction Date
                          </FormLabel>
                          <Popover open={dateOpen} onOpenChange={setDateOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full justify-start text-left font-normal h-10 bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600',
                                    !field.value && 'text-gray-500 dark:text-gray-400'
                                  )}
                                >
                                  <CalendarIcon className="mr-3 h-5 w-5 text-gray-400" />
                                  {field.value ? format(field.value, 'PPP') : 'Select date'}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-0 shadow-lg" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date: Date | undefined) => {
                                  field.onChange(date);
                                  setDateOpen(false);
                                }}
                                disabled={(date: Date) => date > new Date()}
                                captionLayout="dropdown"
                                className="rounded-lg"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Stock Name with Search */}
                    <FormField
                      control={form.control}
                      name="stockName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            Stock Name
                          </FormLabel>
                          <FormControl>
                            <div className="relative" ref={dropdownRef}>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                  placeholder="Search for stocks..."
                                  {...field}
                                  className="pl-10 h-10 bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    debouncedSetStockNameInput(e.target.value);
                                    setShowSuggestions(true);
                                    setSelectedStock(null);
                                  }}
                                  onFocus={() => setShowSuggestions(true)}
                                  autoComplete="off"
                                />
                              </div>

                              {/* Suggestions Dropdown */}
                              {showSuggestions && stockNameInput.length >= 3 && (
                                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl max-h-64 overflow-hidden">
                                  <div className="p-3 border-b border-gray-100 dark:border-slate-700">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                      Search Results
                                    </p>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto">
                                    {stockSuggestions && stockSuggestions.length > 0 ? (
                                      stockSuggestions.map((stock, index) => (
                                        <div
                                          key={`${stock.symbol}-${index}`}
                                          onClick={() => {
                                            const displayName = stock.longname || stock.symbol;
                                            form.setValue('stockName', displayName);
                                            setSelectedStock({
                                              longname: displayName,
                                              symbol: stock.symbol.split('.')[0],
                                            });
                                            setShowSuggestions(false);
                                          }}
                                          className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-50 dark:border-slate-700 last:border-b-0 transition-colors"
                                        >
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                              <p className="font-semibold text-gray-900 dark:text-white truncate">
                                                {stock.longname || stock.symbol}
                                              </p>
                                              <div className="flex items-center gap-2 mt-1">
                                                <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                                  {stock.symbol}
                                                </span>
                                                {stock.typeDisp && (
                                                  <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                                    {stock.typeDisp}
                                                  </span>
                                                )}
                                                {stock.exchDisp && (
                                                  <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                                                    {stock.exchDisp}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    ) : stockNameInput.length >= 3 ? (
                                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                        {stockSearchError
                                          ? 'Error searching stocks'
                                          : 'No stocks found'}
                                      </div>
                                    ) : (
                                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                        Type at least 3 characters to search
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs text-gray-500 dark:text-gray-400">
                            Start typing to search for stocks (minimum 3 characters)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Price and Shares Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="marketPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            Stock Price
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="0.00"
                                {...field}
                                className="pl-10 h-10 bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={field.value?.toString() === '0' ? '' : field.value}
                                onFocus={() => {
                                  if (field.value?.toString() === '0') field.onChange('');
                                }}
                                onBlur={() => {
                                  if (field.value === undefined) field.onChange(0);
                                }}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '') {
                                    field.onChange('');
                                  } else {
                                    field.onChange(Number(val));
                                  }
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="numOfShares"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            Number of Shares
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="0"
                                {...field}
                                className="pl-10 h-10 bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={field.value?.toString() === '0' ? '' : field.value}
                                onFocus={() => {
                                  if (field.value?.toString() === '0') field.onChange('');
                                }}
                                onBlur={() => {
                                  if (field.value === undefined) field.onChange(0);
                                }}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '') {
                                    field.onChange('');
                                  } else {
                                    field.onChange(Number(val));
                                  }
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Total Amount Display */}
                  {totalAmount > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Total Transaction Amount:
                        </span>
                        <span className="text-xl font-bold text-blue-900 dark:text-blue-100">
                          ₹
                          {totalAmount.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-10 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                        Processing Transaction...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="mr-2 h-5 w-5" />
                        Add Transaction
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
