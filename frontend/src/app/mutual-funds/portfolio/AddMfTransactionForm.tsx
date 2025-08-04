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

  // Fixed schema - endDate only required when isPeriodic is true
  const transactionFormSchema = z
    .object({
      amount: z.number().min(1, 'Amount must be at least 1'),
      units: z.number().min(0.01, 'Units must be at least 0.01'),
      type: z.enum(['credit', 'debit'], { required_error: 'Transaction type is required' }),
      startDate: z.string().length(8, 'Start date must be 8 digits in DDMMYYYY format'),
      endDate: z.string().optional(),
    })
    .refine(
      (data) => {
        // Only require endDate when isPeriodic is true
        if (!isPeriodic) return true;
        return data.endDate && data.endDate.length === 8;
      },
      {
        message: 'End date is required and must be 8 digits in DDMMYYYY format',
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
              fundPrice: values.units > 0 ? values.amount / unitsPerMonth : 0,
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
          fundPrice: values.units > 0 ? values.amount / values.units : 0,
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
    <div className="p-8 w-full mx-auto bg-white dark:bg-black rounded-xl shadow-2xl border border-gray-200 dark:border-gray-900">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Add MF Transaction
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {fundName} {platform && `• ${platform}`}
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Transaction Mode
          </span>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsPeriodic?.(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                !isPeriodic
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => setIsPeriodic?.(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                isPeriodic
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Periodic (SIP)
            </button>
          </div>
        </div>
        {isPeriodic && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            💡 This will create multiple transactions between start and end dates
          </p>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Amount Field */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {isPeriodic ? '💰 SIP per month' : '💰 Amount'}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      ₹
                    </span>
                    <Input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="Enter amount"
                      className="pl-8 h-11 border-2 focus:border-blue-500 dark:focus:border-blue-400 rounded-lg"
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
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Units Field */}
          <FormField
            control={form.control}
            name="units"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {isPeriodic ? '📊 Total Units' : '📊 Units'}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="Enter units"
                    className="h-11 border-2 focus:border-blue-500 dark:focus:border-blue-400 rounded-lg"
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

          {/* Transaction Type */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  🔄 Transaction Type
                </FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full h-11 border-2 rounded-lg px-3 bg-background text-foreground focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="credit">💸 Credit (Buy/Investment)</option>
                    <option value="debit">💰 Debit (Sell/Redemption)</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Start Date */}
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {isPeriodic ? '📅 Start Date (DDMMYYYY)' : '📅 Date (DDMMYYYY)'}
                </FormLabel>
                <FormControl>
                  <OtpDateInput value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* End Date - Only shown when isPeriodic is true */}
          {isPeriodic && (
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    🏁 End Date (DDMMYYYY)
                  </FormLabel>
                  <FormControl>
                    <OtpDateInput value={field.value ?? ''} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1 h-11 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg"
            >
              {isPeriodic ? '🚀 Create SIP' : '✅ Add Transaction'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
