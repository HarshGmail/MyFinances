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
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAddCryptoTransactionMutation } from '@/api/mutations';
import { useSearchCryptoQuery } from '@/api/query';
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

  const [dateOpen, setDateOpen] = useState(false);
  const [coinNameInput, setCoinNameInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();
  const { mutate, isPending } = useAddCryptoTransactionMutation();

  // Search crypto query with debounced input
  const { data: coinSuggestions } = useSearchCryptoQuery(coinNameInput);

  // Debounced handler for coin search
  const debouncedSetCoinNameInput = debounce((val: string) => {
    setCoinNameInput(val);
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
            } else if (
              ['coinPrice', 'quantity', 'amount'].includes(key) &&
              typeof value === 'string'
            ) {
              v = Number(value);
            }
            form.setValue(key as keyof FormValues, v as FormValues[keyof FormValues]);
          }
        });
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save form values to cache on change
  useEffect(() => {
    const subscription = form.watch((values) => {
      localStorage.setItem(CACHE_KEY, JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  function onSubmit(values: FormValues) {
    mutate(
      {
        ...values,
        date: values.date.toISOString(),
      },
      {
        onSuccess: () => {
          toast.success('Transaction added successfully');
          router.push('/crypto/transactions');
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

  return (
    <div className="flex mt-[5%] items-center justify-center bg-background overflow-hidden">
      <div className="w-full max-w-xl p-10 rounded-lg shadow-lg bg-card">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Add Crypto Transaction/ Update Crypto Portfolio
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

            {/* Date Picker */}
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
                          variant={'outline'}
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
                        disabled={(date: Date) => date > new Date()}
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
                      step="any"
                      min="0"
                      placeholder="Enter coin price"
                      {...field}
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
                      step="any"
                      min="0"
                      placeholder="Enter quantity"
                      {...field}
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
                      step="any"
                      min="0"
                      placeholder="Enter amount"
                      {...field}
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coin Name (with search suggestions) */}
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
                          // Reset coin symbol when user types manually
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

            {/* Hidden field for coinSymbol */}
            <input type="hidden" {...form.register('coinSymbol')} />

            {/* Submit button, spans both columns */}
            <div className="md:col-span-2 col-span-1">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" /> Updating...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
