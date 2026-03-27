'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  useAddCryptoTransactionMutation,
  useUpdateCryptoTransactionMutation,
} from '@/api/mutations';
import { useCryptoTransactionsQuery } from '@/api/query';
import { NumericFormField } from './NumericFormField';
import { CoinSearchField } from './CoinSearchField';

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

  const [originalTx, setOriginalTx] = useState<FormValues | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [coinNameInput, setCoinNameInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();
  const { mutate: addTx, isPending: adding } = useAddCryptoTransactionMutation();
  const { mutate: updateTx, isPending: updating } = useUpdateCryptoTransactionMutation();
  const isPending = adding || updating;

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
      setCoinNameInput(values.coinName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editId, cryptoTransactions]);

  useEffect(() => {
    if (isEditing) return;
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
      const cachedCoinName = (parsed as Partial<FormValues>).coinName;
      if (cachedCoinName) setCoinNameInput(cachedCoinName);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      localStorage.setItem(CACHE_KEY, JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

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
            {/* Type */}
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

            <NumericFormField
              control={form.control}
              name="coinPrice"
              label="Coin Price"
              placeholder="Enter coin price (e.g., 50000.25)"
              step="0.00000001"
            />
            <NumericFormField
              control={form.control}
              name="quantity"
              label="Quantity"
              placeholder="Enter quantity (e.g., 1.5678)"
              step="0.00000001"
            />
            <NumericFormField
              control={form.control}
              name="amount"
              label="Amount"
              placeholder="Enter amount (e.g., 1250.75)"
            />

            <CoinSearchField
              control={form.control}
              setValue={form.setValue}
              coinNameInput={coinNameInput}
              setCoinNameInput={setCoinNameInput}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
            />

            <input type="hidden" {...form.register('coinSymbol')} />

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
