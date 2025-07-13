'use client';

import React from 'react';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAddMutualFundTransactionMutation } from '@/api/mutations/mutual-funds';
import { OtpDateInput } from '@/components/ui/otp-date-input';

interface AddMfTransactionFormProps {
  fundName: string;
  platform?: string;
  sipAmount?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const transactionFormSchema = z.object({
  amount: z.number().min(1, 'Amount must be at least 1'),
  units: z.number().min(0.01, 'Units must be at least 0.01'),
  type: z.enum(['credit', 'debit'], { required_error: 'Transaction type is required' }),
  date: z
    .string()
    .length(8, 'Date must be 8 digits in DDMMYYYY format')
    .refine((val) => {
      // Validate DDMMYYYY
      if (!/^[0-9]{8}$/.test(val)) return false;
      const dd = parseInt(val.slice(0, 2), 10);
      const mm = parseInt(val.slice(2, 4), 10);
      const yyyy = parseInt(val.slice(4, 8), 10);
      if (dd < 1 || dd > 31) return false;
      if (mm < 1 || mm > 12) return false;
      if (yyyy <= 2002) return false;
      // Check for valid date
      const d = new Date(
        `${yyyy}-${mm.toString().padStart(2, '0')}-${dd.toString().padStart(2, '0')}`
      );
      if (d.getFullYear() !== yyyy || d.getMonth() + 1 !== mm || d.getDate() !== dd) return false;
      // Date must be less than today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d >= today) return false;
      return true;
    }, 'Enter a valid date in DDMMYYYY format (year > 2002 and less than today)'),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export function AddMfTransactionForm({
  fundName,
  platform,
  sipAmount,
  onSuccess,
  onCancel,
}: AddMfTransactionFormProps) {
  const { mutate: addTransaction, isPending } = useAddMutualFundTransactionMutation();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      amount: sipAmount || 0,
      units: 0,
      type: 'credit',
      date: '',
    },
  });

  function onSubmit(values: TransactionFormValues) {
    // Convert DDMMYYYY to ISO string
    const dd = values.date.slice(0, 2);
    const mm = values.date.slice(2, 4);
    const yyyy = values.date.slice(4, 8);
    const dateIso = `${yyyy}-${mm}-${dd}T00:00:00.000Z`;

    addTransaction(
      {
        type: values.type,
        date: dateIso,
        fundPrice: values.amount / values.units, // Calculate fund price
        numOfUnits: values.units,
        amount: values.amount,
        fundName: fundName,
        platform: platform,
      },
      {
        onSuccess: () => {
          toast.success('Transaction added successfully');
          onSuccess?.();
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
          toast.error('Transaction addition failed!', {
            description,
          });
        },
      }
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4 text-center">Add MF Transaction</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="Enter amount"
                    {...field}
                    value={field.value === 0 ? '' : field.value}
                    onFocus={() => {
                      if (field.value === 0) field.onChange('');
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

          <FormField
            control={form.control}
            name="units"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Units</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="Enter units"
                    {...field}
                    value={field.value === 0 ? '' : field.value}
                    onFocus={() => {
                      if (field.value === 0) field.onChange('');
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

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transaction Type</FormLabel>
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

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date (DDMMYYYY)</FormLabel>
                <FormControl>
                  <OtpDateInput value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" /> Adding...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
