'use client';

import React, { Dispatch, SetStateAction } from 'react';
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
import { toast } from 'sonner';
import { useAddMutualFundTransactionMutation } from '@/api/mutations/mutual-funds';
import { OtpDateInput } from '@/components/ui/otp-date-input';

interface AddMfTransactionFormProps {
  fundName: string;
  platform?: string;
  sipAmount?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  isPeriodic?: boolean;
  setIsPeriodic?: Dispatch<SetStateAction<boolean>>;
  setShowTransactionForm?: Dispatch<SetStateAction<boolean>>;
}

export function AddMfTransactionForm({
  fundName,
  platform,
  sipAmount,
  onSuccess,
  onCancel,
  isPeriodic,
  setIsPeriodic,
  setShowTransactionForm,
}: AddMfTransactionFormProps) {
  const { mutate: addTransaction } = useAddMutualFundTransactionMutation();

  const transactionFormSchema = z
    .object({
      amount: z.number().min(1, 'Amount must be at least 1'),
      units: z.number().min(0.01, 'Units must be at least 0.01'),
      type: z.enum(['credit', 'debit'], { required_error: 'Transaction type is required' }),
      startDate: z.string().length(8, 'Start date must be 8 digits in DDMMYYYY format'),
      endDate: z.string().length(8).optional(),
    })
    .refine(
      (data) => {
        if (!isPeriodic) return true;
        return !!data.endDate;
      },
      {
        message: 'End date is required in periodic mode',
        path: ['endDate'],
      }
    );

  type TransactionFormValues = z.infer<typeof transactionFormSchema>;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      amount: sipAmount || 0,
      units: 0,
      type: 'credit',
      startDate: '',
      endDate: '',
    },
  });

  function onSubmit(values: TransactionFormValues) {
    // Close form immediately
    setShowTransactionForm?.(false);

    const parseDate = (ddmmyyyy: string) => {
      const dd = ddmmyyyy.slice(0, 2);
      const mm = ddmmyyyy.slice(2, 4);
      const yyyy = ddmmyyyy.slice(4, 8);
      return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    };

    const start = parseDate(values.startDate);

    if (isPeriodic && values.endDate) {
      const end = parseDate(values.endDate);
      const months =
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
      const unitsPerMonth = values.units / months;

      toast.success(`Adding ${months} transactions...`);

      const mutationQueue = Array.from({ length: months }).map((_, i) => {
        const date = new Date(start);
        date.setMonth(date.getMonth() + i);
        date.setDate(1);
        const isoDate = date.toISOString();

        return new Promise<void>((resolve, reject) => {
          addTransaction(
            {
              type: values.type,
              date: isoDate,
              fundPrice: values.amount / unitsPerMonth,
              numOfUnits: unitsPerMonth,
              amount: values.amount,
              fundName,
              platform,
            },
            {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            }
          );
        });
      });

      Promise.allSettled(mutationQueue)
        .then((results) => {
          const failed = results.filter((r) => r.status === 'rejected');
          if (failed.length === 0) {
            toast.success('All transactions added successfully');
          } else {
            toast.error(`${failed.length} out of ${months} transactions failed`);
          }
          onSuccess?.();
        })
        .catch(() => {
          toast.error('Unexpected error during SIP creation');
        });
    } else {
      const isoDate = start.toISOString();
      toast.success('Adding transaction...');

      addTransaction(
        {
          type: values.type,
          date: isoDate,
          fundPrice: values.amount / values.units,
          numOfUnits: values.units,
          amount: values.amount,
          fundName,
          platform,
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
            toast.error('Transaction addition failed!', { description });
          },
        }
      );
    }
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
                <FormLabel>{isPeriodic ? 'SIP per month' : 'Amount'}</FormLabel>
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
                <FormLabel>{isPeriodic ? 'Total Units' : 'Units'}</FormLabel>
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
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isPeriodic ? 'Start Date (DDMMYYYY)' : 'Date (DDMMYYYY)'}</FormLabel>
                <FormControl>
                  <OtpDateInput value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isPeriodic && (
            <p
              className="text-sm text-blue-500 underline cursor-pointer"
              onClick={() => setIsPeriodic?.(true)}
            >
              Add periodic data
            </p>
          )}

          {isPeriodic && (
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date (DDMMYYYY)</FormLabel>
                  <FormControl>
                    <OtpDateInput value={field.value ?? ''} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Submit
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
