import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Field } from './ui';
import { colors } from '@/lib/theme';

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 8;

export function useDebouncedValue<T>(value: T, delayMs = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export interface SearchOption {
  key: string;
  title: string;
  subtitle?: string;
}

export function SearchPicker({
  label,
  placeholder,
  query,
  onQueryChange,
  options,
  isSearching,
  selectedTitle,
  onSelect,
  error,
}: {
  label: string;
  placeholder?: string;
  query: string;
  onQueryChange: (next: string) => void;
  options: SearchOption[] | undefined;
  isSearching: boolean;
  selectedTitle?: string;
  onSelect: (key: string) => void;
  error?: string;
}) {
  const showResults = query.trim().length >= MIN_QUERY_LENGTH && query !== selectedTitle;
  return (
    <View className="gap-2">
      <Field
        label={label}
        placeholder={placeholder}
        value={query}
        onChangeText={onQueryChange}
        autoCorrect={false}
        error={error}
      />
      {showResults && (
        <View className="overflow-hidden rounded-lg border border-border">
          {isSearching ? (
            <View className="items-center py-3">
              <ActivityIndicator color={colors.muted} />
            </View>
          ) : options?.length ? (
            options.slice(0, MAX_RESULTS).map((option, index) => (
              <Pressable
                key={option.key}
                onPress={() => onSelect(option.key)}
                className={`bg-card px-3 py-3 active:bg-accent ${index > 0 ? 'border-t border-border' : ''}`}
                accessibilityRole="button"
              >
                <Text className="text-sm text-foreground" numberOfLines={2}>
                  {option.title}
                </Text>
                {option.subtitle ? (
                  <Text className="text-xs text-muted">{option.subtitle}</Text>
                ) : null}
              </Pressable>
            ))
          ) : (
            <Text className="bg-card px-3 py-3 text-sm text-muted">No matches</Text>
          )}
        </View>
      )}
    </View>
  );
}
