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
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  useAddCryptoTransactionMutation,
  useUpdateCryptoTransactionMutation,
} from '@/api/mutations';
import { useSearchCryptoQuery, useCryptoTransactionsQuery } from '@/api/query';
import { debounce } from 'lodash';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const formSchema = z.object({
  type: z.enum(['credit', 'debit'], { required_error: 'Type is required' }),
  date: z
    .date({ required_error: 'Date is required' })
    .max(new Date(), { message: 'Date cannot be in the future' }),
  coinPrice: z.number().min(0, 'Coin price must be at least 0'),
  quantity: z.number().min(0, 'Quantity must be at least 0'),
  amount: z.number().min(0, 'Amount must be at least 0'),
  coinName: z.string().min(1, 'Coin name is required'),
  coinSymbol: z.string().min(1, 'Coin symbol is required'),
});

type FormValues = z.infer<typeof formSchema>;

const CACHE_KEY = 'cryptoTransactionFormCache';

export default function CryptoUpdateCryptoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
      <CryptoUpdateCryptoPageInner />
    </Suspense>
  );
}

function CryptoUpdateCryptoPageInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEditing = Boolean(editId);

  const { data: cryptoTransactions } = useCryptoTransactionsQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'credit',
      date: undefined,
      coinPrice: 0,
      quantity: 0,
      amount: 0,
      coinName: '',
      coinSymbol: '',
    },
  });

  // Keep a copy of the original tx values for Reset (edit mode)
  const [originalTx, setOriginalTx] = useState<FormValues | null>(null);

  // Prefill from transaction when editing (takes priority over localStorage)
  useEffect(() => {
    if (!isEditing || !cryptoTransactions) return;
    const tx = cryptoTransactions.find((t) => t._id === editId);
    if (tx) {
      const values: FormValues = {
        type: tx.type,
        date: new Date(tx.date),
        coinPrice: tx.coinPrice,
        quantity: tx.quantity,
        amount: tx.amount,
        coinName: tx.coinName,
        coinSymbol: tx.coinSymbol,
      };
      form.reset(values);
      setOriginalTx(values);
      // Also set the coin search input to current coin so suggestions line up
      setCoinNameInput(values.coinName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editId, cryptoTransactions]);

  const [dateOpen, setDateOpen] = useState(false);
  const [coinNameInput, setCoinNameInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();
  const { mutate: addTx, isPending: adding } = useAddCryptoTransactionMutation();
  const { mutate: updateTx, isPending: updating } = useUpdateCryptoTransactionMutation();
  const isPending = adding || updating;

  // Search crypto query with debounced input (this keeps coinSymbol in sync when user changes coin)
  const { data: coinSuggestions } = useSearchCryptoQuery(coinNameInput);
  const debouncedSetCoinNameInput = useMemo(
    () => debounce((val: string) => setCoinNameInput(val), 1000),
    []
  );

  // Load cached values only when NOT editing (searchParams must win)
  useEffect(() => {
    if (isEditing) return; // <-- prefer searchParams/tx prefill over cache
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached);
      Object.entries(parsed).forEach(([key, value]) => {
        if (key in form.getValues()) {
          let v = value;
          if (key === 'date' && typeof value === 'string') v = new Date(value);
          else if (['coinPrice', 'quantity', 'amount'].includes(key) && typeof value === 'string')
            v = Number(value);
          form.setValue(key as keyof FormValues, v as FormValues[keyof FormValues]);
        }
      });
      // Also set search box to cached coin name so suggestions make sense
      const cachedCoinName = (parsed as Partial<FormValues>).coinName;
      if (cachedCoinName) setCoinNameInput(cachedCoinName);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // Save form values to cache on change (both modes; harmless in edit mode)
  useEffect(() => {
    const subscription = form.watch((values) => {
      localStorage.setItem(CACHE_KEY, JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Number input helpers (unchanged)
  const handleNumberInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldOnChange: (value: unknown) => void
  ) => {
    const val = e.target.value;
    if (val === '') {
      fieldOnChange('');
      return;
    }
    const decimalPattern = /^\d*\.?\d*$/;
    if (decimalPattern.test(val)) {
      const numVal = parseFloat(val);
      if (!isNaN(numVal)) fieldOnChange(numVal);
      else if (val.endsWith('.') || val === '0.') fieldOnChange(val);
    }
  };

  const getNumberDisplayValue = (value: unknown): string => {
    if (value === '' || value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    if (value === 0) return '';
    return value.toString();
  };

  function onSubmit(values: FormValues) {
    if (isEditing) {
      updateTx(
        { id: editId as string, ...values, date: values.date.toISOString() },
        {
          onSuccess: () => {
            toast.success('Transaction updated successfully');
            router.push('/crypto/transactions');
            localStorage.removeItem(CACHE_KEY);
          },
          onError: (error) => {
            toast.error('Transaction update failed', { description: (error as Error).message });
          },
        }
      );
    } else {
      addTx(
        { ...values, date: values.date.toISOString() },
        {
          onSuccess: () => {
            toast.success('Transaction added successfully');
            router.push('/crypto/transactions');
            localStorage.removeItem(CACHE_KEY);
          },
          onError: (error) => {
            toast.error('Transaction addition failed', { description: (error as Error).message });
          },
        }
      );
    }
  }

  // Reset handler
  const onReset = () => {
    if (isEditing && originalTx) {
      form.reset(originalTx);
      setCoinNameInput(originalTx.coinName || '');
      localStorage.setItem(CACHE_KEY, JSON.stringify(originalTx));
    } else {
      const defaults: FormValues = {
        type: 'credit',
        date: undefined as unknown as Date,
        coinPrice: 0,
        quantity: 0,
        amount: 0,
        coinName: '',
        coinSymbol: '',
      };
      form.reset(defaults);
      setCoinNameInput('');
      localStorage.removeItem(CACHE_KEY);
    }
  };

  return (
    <div className="flex mt-[5%] items-center justify-center bg-background overflow-hidden">
      <div className="w-full max-w-xl p-10 rounded-lg shadow-lg bg-card">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isEditing ? 'Update Crypto Transaction' : 'Add Crypto Transaction / Update Portfolio'}
        </h2>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6"
          >
            {/* Type of Transaction */}
            <FormLabel className="self-center">Type of Transaction</FormLabel>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <select
                      {...field}
                      className="w-full border rounded-md px-3 py-2 bg-background text-foreground"
                    >
                      <option value="credit">Credit</option>
                      <option value="debit">Debit</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormLabel className="self-center">Date</FormLabel>
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="w-full">
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date: Date | undefined) => {
                          field.onChange(date);
                          setDateOpen(false);
                        }}
                        disabled={(d: Date) => d > new Date()}
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coin Price */}
            <FormLabel className="self-center">Coin Price</FormLabel>
            <FormField
              control={form.control}
              name="coinPrice"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input
                      type="number"
                      step="0.00000001"
                      min="0"
                      placeholder="Enter coin price (e.g., 50000.25)"
                      value={getNumberDisplayValue(field.value)}
                      onFocus={() => {
                        if (field.value === 0) field.onChange('');
                      }}
                      onBlur={() => {
                        if (field.value === undefined) field.onChange(0);
                        else if (typeof field.value === 'string') {
                          const numVal = parseFloat(field.value);
                          field.onChange(isNaN(numVal) ? 0 : numVal);
                        }
                      }}
                      onChange={(e) => handleNumberInputChange(e, field.onChange)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity */}
            <FormLabel className="self-center">Quantity</FormLabel>
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input
                      type="number"
                      step="0.00000001"
                      min="0"
                      placeholder="Enter quantity (e.g., 1.5678)"
                      value={getNumberDisplayValue(field.value)}
                      onFocus={() => {
                        if (field.value === 0) field.onChange('');
                      }}
                      onBlur={() => {
                        if (field.value === undefined) field.onChange(0);
                        else if (typeof field.value === 'string') {
                          const numVal = parseFloat(field.value);
                          field.onChange(isNaN(numVal) ? 0 : numVal);
                        }
                      }}
                      onChange={(e) => handleNumberInputChange(e, field.onChange)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormLabel className="self-center">Amount</FormLabel>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter amount (e.g., 1250.75)"
                      value={getNumberDisplayValue(field.value)}
                      onFocus={() => {
                        if (field.value === 0) field.onChange('');
                      }}
                      onBlur={() => {
                        if (field.value === undefined) field.onChange(0);
                        else if (typeof field.value === 'string') {
                          const numVal = parseFloat(field.value);
                          field.onChange(isNaN(numVal) ? 0 : numVal);
                        }
                      }}
                      onChange={(e) => handleNumberInputChange(e, field.onChange)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coin Name + Suggestions (keeps coinSymbol synced) */}
            <FormLabel className="self-center">Coin Name</FormLabel>
            <FormField
              control={form.control}
              name="coinName"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Search and select coin"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          debouncedSetCoinNameInput(e.target.value);
                          setShowSuggestions(true);
                          // reset symbol until a suggestion is chosen
                          form.setValue('coinSymbol', '');
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        autoComplete="off"
                      />

                      {showSuggestions && coinNameInput.length >= 2 && (
                        <div className="absolute z-20 mt-1 w-full">
                          <Command className="border rounded-md bg-white dark:bg-neutral-900 shadow max-h-[250px] overflow-y-auto">
                            <CommandInput
                              value={coinNameInput}
                              onValueChange={(val) => {
                                setCoinNameInput(val);
                                debouncedSetCoinNameInput(val);
                              }}
                              placeholder="Search cryptocurrencies..."
                            />
                            <CommandList>
                              {coinSuggestions?.length ? (
                                <CommandGroup heading="Cryptocurrencies">
                                  {coinSuggestions
                                    .sort((a, b) => a.rank - b.rank)
                                    .map((coin) => (
                                      <CommandItem
                                        key={coin.id}
                                        value={coin.name.toLowerCase()}
                                        onSelect={() => {
                                          form.setValue('coinName', coin.name);
                                          form.setValue('coinSymbol', coin.symbol);
                                          setCoinNameInput(coin.name);
                                          setShowSuggestions(false);
                                        }}
                                        className="flex justify-between items-center"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground">
                                            #{coin.rank}
                                          </span>
                                          <span>{coin.name}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground uppercase">
                                          {coin.symbol}
                                        </span>
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              ) : (
                                <CommandEmpty>No cryptocurrencies found</CommandEmpty>
                              )}
                            </CommandList>
                          </Command>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Search and select from available cryptocurrencies
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hidden coinSymbol field */}
            <input type="hidden" {...form.register('coinSymbol')} />

            {/* Submit + Reset row */}
            <div className="md:col-span-2 col-span-1">
              {isEditing ? (
                <div className="flex gap-3">
                  <Button type="submit" className="w-full md:w-1/2" disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-4 w-4" /> Updating...
                      </>
                    ) : (
                      'Update'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full md:w-1/2"
                    onClick={onReset}
                    disabled={isPending}
                  >
                    Reset
                  </Button>
                </div>
              ) : (
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" /> Saving...
                    </>
                  ) : (
                    'Submit'
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
