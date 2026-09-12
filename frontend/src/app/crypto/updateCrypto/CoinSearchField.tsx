import { useMemo } from 'react';
import { Control, FieldValues, Path, UseFormSetValue } from 'react-hook-form';
import { debounce } from 'lodash';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useSearchCryptoQuery } from '@/api/query';

interface CoinSearchFieldProps<T extends FieldValues> {
  control: Control<T>;
  setValue: UseFormSetValue<T>;
  coinNameInput: string;
  setCoinNameInput: (val: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
}

export function CoinSearchField<T extends FieldValues>({
  control,
  setValue,
  coinNameInput,
  setCoinNameInput,
  showSuggestions,
  setShowSuggestions,
}: CoinSearchFieldProps<T>) {
  const { data: coinSuggestions } = useSearchCryptoQuery(coinNameInput);

  const debouncedSetInput = useMemo(
    () => debounce((val: string) => setCoinNameInput(val), 1000),
    [setCoinNameInput]
  );

  return (
    <>
      <FormLabel className="self-center">Coin Name</FormLabel>
      <FormField
        control={control}
        name={'coinName' as Path<T>}
        render={({ field }) => (
          <FormItem className="w-full">
            <FormControl>
              <div className="relative">
                <Input
                  placeholder="Search and select coin"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    debouncedSetInput(e.target.value);
                    setShowSuggestions(true);
                    setValue('coinSymbol' as Path<T>, '' as never);
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
                          debouncedSetInput(val);
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
                                    setValue('coinName' as Path<T>, coin.name as never);
                                    setValue('coinSymbol' as Path<T>, coin.symbol as never);
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
            <FormDescription>Search and select from available cryptocurrencies</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
