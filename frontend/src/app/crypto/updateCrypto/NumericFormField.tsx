import { Control, FieldValues, Path } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface NumericFormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder: string;
  step?: string;
}

export function NumericFormField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  step = '0.01',
}: NumericFormFieldProps<T>) {
  return (
    <>
      <FormLabel className="self-center">{label}</FormLabel>
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem className="w-full">
            <FormControl>
              <Input
                type="text"
                step={step}
                min="0"
                placeholder={placeholder}
                value={field.value === 0 ? '' : (field.value?.toString() ?? '')}
                onFocus={() => {
                  if (field.value === 0) field.onChange('');
                }}
                onBlur={() => {
                  if (field.value === undefined) field.onChange(0);
                  else if (typeof field.value === 'string') {
                    const numVal = parseFloat(field.value);
                    field.onChange(isNaN(numVal) ? 0 : numVal);
                  }
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*\.?\d*$/.test(value)) field.onChange(value);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
