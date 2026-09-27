import { useMemo, useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useCryptoTransactionsQuery,
  useSearchCryptoQuery,
} from '@myfinances/core/api/query/crypto';
import {
  useAddCryptoTransactionMutation,
  useUpdateCryptoTransactionMutation,
} from '@myfinances/core/api/mutations/crypto';
import {
  cryptoTransactionSchema,
  CryptoTransactionValues,
} from '@myfinances/core/schemas/transactions';
import { BUY_SELL_OPTIONS, DateField, NumberField, SegmentedField } from '@/components/form';
import { SearchPicker, useDebouncedValue } from '@/components/SearchPicker';
import { FormScreen, errorMessage } from '@/components/FormScreen';
import { LoadingState } from '@/components/ui';

export default function CryptoTransactionForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const transactionsQuery = useCryptoTransactionsQuery();
  const existing = id ? transactionsQuery.data?.find((tx) => tx._id === id) : undefined;

  if (id && !existing) return <LoadingState />;

  return <CryptoForm id={id} initial={existing} />;
}

function CryptoForm({
  id,
  initial,
}: {
  id?: string;
  initial?: {
    type: 'credit' | 'debit';
    date: string;
    coinPrice: number;
    quantity: number;
    amount: number;
    coinName: string;
    coinSymbol: string;
  };
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const addMutation = useAddCryptoTransactionMutation();
  const updateMutation = useUpdateCryptoTransactionMutation();
  const { control, handleSubmit, setValue, formState } = useForm<CryptoTransactionValues>({
    resolver: zodResolver(cryptoTransactionSchema),
    defaultValues: initial
      ? { ...initial, date: new Date(initial.date) }
      : { type: 'credit', date: new Date(), coinName: '', coinSymbol: '' },
  });

  const selectedName = useWatch({ control, name: 'coinName' });
  const [coinQuery, setCoinQuery] = useState(initial?.coinName ?? '');
  const debouncedQuery = useDebouncedValue(coinQuery);
  const coinSearch = useSearchCryptoQuery(debouncedQuery);
  const coinOptions = useMemo(
    () =>
      [...(coinSearch.data ?? [])]
        .sort((a, b) => a.rank - b.rank)
        .map((coin) => ({ key: coin.id, title: coin.name, subtitle: coin.symbol.toUpperCase() })),
    [coinSearch.data]
  );

  const pickCoin = (coinId: string) => {
    const coin = coinSearch.data?.find((candidate) => candidate.id === coinId);
    if (!coin) return;
    setValue('coinName', coin.name, { shouldValidate: true });
    setValue('coinSymbol', coin.symbol.toUpperCase(), { shouldValidate: true });
    setCoinQuery(coin.name);
  };

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const payload = {
      ...values,
      coinSymbol: values.coinSymbol.trim().toUpperCase(),
      coinName: values.coinName.trim(),
      date: values.date.toISOString(),
    };
    try {
      if (id) await updateMutation.mutateAsync({ id, ...payload });
      else await addMutation.mutateAsync(payload);
      router.back();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Edit crypto' : 'Add crypto' }} />
      <FormScreen
        submitLabel={id ? 'Save changes' : 'Add transaction'}
        onSubmit={submit}
        submitting={addMutation.isPending || updateMutation.isPending}
        error={serverError}
      >
        <SegmentedField control={control} name="type" label="Type" options={BUY_SELL_OPTIONS} />
        <SearchPicker
          label="Coin"
          placeholder="Search e.g. Bitcoin"
          query={coinQuery}
          onQueryChange={(next) => {
            setCoinQuery(next);
            if (next !== selectedName) {
              setValue('coinName', '');
              setValue('coinSymbol', '');
            }
          }}
          options={coinOptions}
          isSearching={coinSearch.isFetching}
          selectedTitle={selectedName}
          onSelect={pickCoin}
          error={formState.errors.coinName ? 'Pick a coin from the list' : undefined}
        />
        <DateField control={control} name="date" label="Date" />
        <NumberField control={control} name="quantity" label="Quantity" />
        <NumberField control={control} name="coinPrice" label="Price per coin (₹)" />
        <NumberField control={control} name="amount" label="Total amount (₹)" />
      </FormScreen>
    </>
  );
}
