import { useState } from 'react';
import { Platform, Pressable, Text, TextInputProps, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { Field, Label } from './ui';

interface BaseProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

function parseNumber(text: string): number | undefined {
  const normalised = text.replace(/,/g, '').trim();
  if (normalised === '') return undefined;
  const value = Number(normalised);
  return Number.isFinite(value) ? value : undefined;
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: BaseProps<T> & Omit<TextInputProps, 'value' | 'onChangeText'>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          label={label}
          value={field.value ?? ''}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          {...inputProps}
        />
      )}
    />
  );
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
}: BaseProps<T> & { placeholder?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <NumberInput
          label={label}
          placeholder={placeholder}
          value={field.value as number | undefined}
          onChange={field.onChange}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

function NumberInput({
  label,
  placeholder,
  value,
  onChange,
  error,
}: {
  label: string;
  placeholder?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  error?: string;
}) {
  const [text, setText] = useState(value === undefined || value === 0 ? '' : String(value));
  return (
    <Field
      label={label}
      placeholder={placeholder}
      keyboardType="decimal-pad"
      value={text}
      onChangeText={(next) => {
        setText(next);
        onChange(parseNumber(next));
      }}
      error={error}
    />
  );
}

function formatDateLabel(date: Date | undefined): string {
  return date
    ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Pick a date';
}

export function DateField<T extends FieldValues>({
  control,
  name,
  label,
  maximumDate = new Date(),
}: BaseProps<T> & { maximumDate?: Date }) {
  const [open, setOpen] = useState(false);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const value = field.value as Date | undefined;
        return (
          <View className="gap-1.5">
            <Label>{label}</Label>
            <Pressable
              onPress={() => setOpen(true)}
              className="h-12 justify-center rounded-lg border border-border bg-card px-3"
              accessibilityRole="button"
            >
              <Text className={value ? 'text-base text-foreground' : 'text-base text-muted'}>
                {formatDateLabel(value)}
              </Text>
            </Pressable>
            {open && (
              <DateTimePicker
                value={value ?? new Date()}
                mode="date"
                maximumDate={maximumDate}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                themeVariant="dark"
                onChange={(event, selected) => {
                  if (Platform.OS !== 'ios') setOpen(false);
                  if (event.type === 'set' && selected) field.onChange(selected);
                  if (event.type === 'dismissed') setOpen(false);
                }}
              />
            )}
            {open && Platform.OS === 'ios' && (
              <Pressable onPress={() => setOpen(false)} className="items-end py-1">
                <Text className="text-sm font-semibold text-foreground">Done</Text>
              </Pressable>
            )}
            {fieldState.error ? (
              <Text className="text-xs text-loss">{fieldState.error.message}</Text>
            ) : null}
          </View>
        );
      }}
    />
  );
}

export function SegmentedField<T extends FieldValues, V extends string>({
  control,
  name,
  label,
  options,
}: BaseProps<T> & { options: { value: V; label: string }[] }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <View className="gap-1.5">
          <Label>{label}</Label>
          <View className="flex-row gap-2">
            {options.map((option) => {
              const selected = field.value === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => field.onChange(option.value)}
                  className={`h-11 flex-1 items-center justify-center rounded-lg border ${selected ? 'border-foreground bg-foreground' : 'border-border bg-card'}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text className={selected ? 'font-semibold text-background' : 'text-foreground'}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    />
  );
}

export const BUY_SELL_OPTIONS: { value: 'credit' | 'debit'; label: string }[] = [
  { value: 'credit', label: 'Buy' },
  { value: 'debit', label: 'Sell' },
];
