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
import { useState, useEffect, Suspense } from 'react';
import { cn } from '@/lib/utils';
import {
  useAddGoldTransactionMutation,
  useUpdateGoldTransactionMutation,
} from '@/api/mutations/gold';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useGoldTransactionsQuery } from '@/api/query';

const formSchema = z.object({
  type: z.enum(['credit', 'debit'], { required_error: 'Type is required' }),
  date: z
    .date({ required_error: 'Date is required' })
    .max(new Date(), { message: 'Date cannot be in the future' }),
  quantity: z.number().min(0, 'Quantity must be at least 0'),
  amount: z.number().min(0, 'Amount must be at least 0'),
  platform: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const platformSuggestions = ['Tanishq', 'SafeGold'];
const CACHE_KEY = 'goldTransactionFormCache';

export default function GoldUpdateGoldPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
      <GoldUpdateGoldPageInner />
    </Suspense>
  );
}

function GoldUpdateGoldPageInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEditing = Boolean(editId);

  const { data: goldTransactions } = useGoldTransactionsQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'credit',
      date: undefined,
      quantity: 0,
      amount: 0,
      platform: '',
    },
  });

  const [dateOpen, setDateOpen] = useState(false);
  const router = useRouter();
  const { mutate: addTx, isPending: adding } = useAddGoldTransactionMutation();
  const { mutate: updateTx, isPending: updating } = useUpdateGoldTransactionMutation();
  const isPending = adding || updating;

  const [originalTx, setOriginalTx] = useState<FormValues | null>(null);

  useEffect(() => {
    if (!isEditing || !goldTransactions) return;
    // @ts-expect-error id error
    const tx = goldTransactions.find((t) => t._id === editId);
    if (tx) {
      const values: FormValues = {
        type: tx.type as 'credit' | 'debit',
        date: new Date(tx.date as string),
        quantity: Number(tx.quantity ?? 0),
        amount: Number(tx.amount ?? 0),
        platform: tx.platform || '',
      };
      form.reset(values);
      setOriginalTx(values);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editId, goldTransactions]);

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
          else if (['quantity', 'amount'].includes(key) && typeof value === 'string')
            v = Number(value);
          form.setValue(key as keyof FormValues, v as FormValues[keyof FormValues]);
        }
      });
    } catch {
      // Ignore cache parsing errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      localStorage.setItem(CACHE_KEY, JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  function onSubmit(values: FormValues) {
    const quantity = Number(values.quantity);
    const amount = Number(values.amount);

    // Calculate gold price: amount / quantity
    const goldPrice = quantity > 0 ? amount / quantity : 0;

    // Calculate tax: 3% of amount
    const tax = amount * 0.03;

    const payload = {
      ...values,
      date: new Date(
        values.date instanceof Date
          ? values.date.toISOString()
          : new Date(values.date).toISOString()
      ),
      goldPrice: Number(goldPrice.toFixed(2)),
      quantity: quantity,
      amount: amount,
      tax: Number(tax.toFixed(2)),
      platform: values.platform || undefined,
    };

    if (isEditing) {
      updateTx(
        { id: editId as string, ...payload },
        {
          onSuccess: () => {
            toast.success('Transaction updated successfully');
            router.push('/gold/transactions');
            localStorage.removeItem(CACHE_KEY);
          },
          onError: (error) => {
            toast.error('Transaction update failed', { description: (error as Error).message });
          },
        }
      );
    } else {
      addTx(payload, {
        onSuccess: () => {
          toast.success('Transaction added successfully');
          router.push('/gold/transactions');
          localStorage.removeItem(CACHE_KEY);
        },
        onError: (error) => {
          toast.error('Transaction addition failed', { description: (error as Error).message });
        },
      });
    }
  }

  const onReset = () => {
    if (isEditing && originalTx) {
      form.reset(originalTx);
      localStorage.setItem(CACHE_KEY, JSON.stringify(originalTx));
    } else {
      const defaults: FormValues = {
        type: 'credit',
        date: undefined as unknown as Date,
        quantity: 0,
        amount: 0,
        platform: '',
      };
      form.reset(defaults);
      localStorage.removeItem(CACHE_KEY);
    }
  };

  return (
    <div className="flex mt-[5%] items-center justify-center bg-background overflow-hidden">
      <div className="w-full max-w-xl p-10 rounded-lg shadow-lg bg-card">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isEditing ? 'Update Gold Transaction' : 'Add Gold Transaction / Update Portfolio'}
        </h2>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of Transaction</FormLabel>
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
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
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
                        onSelect={(d: Date | undefined) => {
                          field.onChange(d);
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

            {/* Quantity */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity (grams)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Enter quantity in grams"
                      {...field}
                      value={field.value?.toString() === '0' ? '' : field.value}
                      onFocus={() => {
                        if (field.value?.toString() === '0') field.onChange('');
                      }}
                      onBlur={() => {
                        if (field.value === undefined) field.onChange(0);
                      }}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
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
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Platform */}
            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Platform</FormLabel>
                  <FormControl>
                    <input
                      type="text"
                      list="platform-suggestions"
                      placeholder="Enter platform"
                      className="w-full border rounded-md px-3 py-2 bg-background text-foreground"
                      {...field}
                    />
                  </FormControl>
                  <datalist id="platform-suggestions">
                    {platformSuggestions.map((option) => (
                      <option value={option} key={option} />
                    ))}
                  </datalist>
                  <FormDescription>Suggestions: Tanishq, SafeGold</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit + Reset */}
            <div className="md:col-span-2">
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
