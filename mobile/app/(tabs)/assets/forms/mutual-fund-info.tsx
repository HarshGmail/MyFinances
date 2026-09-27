import { useMemo, useState } from 'react';
import { Stack, router } from 'expo-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchMutualFundsQuery } from '@myfinances/core/api/query/mutual-funds-info';
import { useAddMutualFundInfoMutation } from '@myfinances/core/api/mutations/mutual-funds-info';
import { mutualFundInfoSchema, MutualFundInfoValues } from '@myfinances/core/schemas/transactions';
import { DateField, NumberField, TextField } from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';
import { SearchPicker, useDebouncedValue } from '@/components/SearchPicker';

export default function AddMutualFundScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const search = useSearchMutualFundsQuery(debouncedQuery);
  const addMutation = useAddMutualFundInfoMutation();
  const { control, handleSubmit, setValue, formState } = useForm<MutualFundInfoValues>({
    resolver: zodResolver(mutualFundInfoSchema),
    defaultValues: { fundName: '', date: new Date(), platform: '', goal: '' },
  });
  const selectedName = useWatch({ control, name: 'fundName' });

  const options = useMemo(
    () =>
      (search.data ?? [])
        .filter((scheme) => scheme.schemeName)
        .map((scheme) => ({
          key: String(scheme.schemeCode),
          title: scheme.schemeName!,
          subtitle: `Scheme ${scheme.schemeCode}`,
        })),
    [search.data]
  );

  const pickScheme = (schemeCode: string) => {
    const scheme = search.data?.find((candidate) => String(candidate.schemeCode) === schemeCode);
    if (!scheme?.schemeName) return;
    setValue('fundName', scheme.schemeName, { shouldValidate: true });
    setValue('schemeNumber', scheme.schemeCode, { shouldValidate: true });
    setQuery(scheme.schemeName);
  };

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await addMutation.mutateAsync({
        fundName: values.fundName,
        schemeNumber: values.schemeNumber,
        sipAmount: values.sipAmount,
        goal: values.goal || undefined,
        platform: values.platform || undefined,
        date: values.date.toISOString(),
      });
      router.back();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Add fund' }} />
      <FormScreen
        submitLabel="Add fund"
        onSubmit={submit}
        submitting={addMutation.isPending}
        error={serverError}
      >
        <SearchPicker
          label="Fund"
          placeholder="Search e.g. Parag Parikh Flexi Cap"
          query={query}
          onQueryChange={(next) => {
            setQuery(next);
            if (next !== selectedName) setValue('fundName', '');
          }}
          options={options}
          isSearching={search.isFetching}
          selectedTitle={selectedName}
          onSelect={pickScheme}
          error={formState.errors.fundName?.message ?? formState.errors.schemeNumber?.message}
        />
        <NumberField control={control} name="sipAmount" label="SIP amount (₹)" />
        <DateField control={control} name="date" label="Started on" />
        <TextField
          control={control}
          name="platform"
          label="Platform (optional)"
          placeholder="e.g. Groww"
        />
        <TextField control={control} name="goal" label="Goal (optional)" />
      </FormScreen>
    </>
  );
}
