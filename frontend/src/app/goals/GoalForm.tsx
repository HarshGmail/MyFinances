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
import { useState, useEffect } from 'react';
import GoalAssetSelector, { AssetOption } from './GoalAssetSelector';

const formSchema = z.object({
  goalName: z.string().min(1, 'Goal name is required'),
  stockSymbols: z.array(z.string()),
  mutualFundIds: z.array(z.string()),
  cryptoCurrency: z.array(z.string()),
  goldAlloted: z.number().min(0, 'Gold alloted must be non-negative').optional(),
  description: z.string().optional(),
  targetAmount: z.number().min(1, 'Target amount must be positive').optional(),
});

export type FormValues = z.infer<typeof formSchema>;

interface GoalFormProps {
  initialValues?: Partial<FormValues>;
  onSubmit: (values: FormValues) => void;
  submitLabel: string;
  isPending?: boolean;
  onCancel?: () => void;
  assetOptions: {
    stocks: AssetOption[];
    mutualFunds: AssetOption[];
    crypto: AssetOption[];
  };
}

export default function GoalForm({
  initialValues,
  onSubmit,
  submitLabel,
  isPending,
  onCancel,
  assetOptions,
}: GoalFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goalName: initialValues?.goalName || '',
      stockSymbols: initialValues?.stockSymbols || [],
      mutualFundIds: initialValues?.mutualFundIds || [],
      cryptoCurrency: initialValues?.cryptoCurrency || [],
      goldAlloted: initialValues?.goldAlloted,
      description: initialValues?.description || '',
      targetAmount: initialValues?.targetAmount,
    },
  });

  // State for asset arrays
  const [assetState, setAssetState] = useState({
    stockSymbols: initialValues?.stockSymbols || [],
    mutualFundIds: initialValues?.mutualFundIds || [],
    cryptoCurrency: initialValues?.cryptoCurrency || [],
  });

  useEffect(() => {
    form.setValue('stockSymbols', assetState.stockSymbols);
    form.setValue('mutualFundIds', assetState.mutualFundIds);
    form.setValue('cryptoCurrency', assetState.cryptoCurrency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetState]);

  function handleSubmit(values: FormValues) {
    onSubmit({ ...values, ...assetState });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 p-10 w-full max-w-2xl mx-auto"
      >
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
          <GoalAssetSelector
            assetOptions={assetOptions}
            initialSelected={assetState}
            onChange={setAssetState}
          />
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

        <div className="flex gap-4">
          <Button type="submit" className="w-fit" disabled={isPending}>
            {submitLabel}
          </Button>
          <Button type="button" variant="outline" className="w-fit" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
