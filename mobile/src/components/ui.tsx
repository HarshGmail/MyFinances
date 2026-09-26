import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

export function Screen({
  title,
  children,
  refreshing = false,
  onRefresh,
  right,
  underHeader = false,
}: {
  title?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  right?: ReactNode;
  underHeader?: boolean;
}) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={underHeader ? [] : ['top']}>
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-10 pt-2"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.muted}
            />
          ) : undefined
        }
      >
        {title && (
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-foreground">{title}</Text>
            {right}
          </View>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`gap-2 rounded-xl border border-border bg-card p-4 ${className}`}>
      {children}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text className="text-xs font-medium text-muted">{children}</Text>;
}

export function Button({
  label,
  onPress,
  loading = false,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const variantClass = {
    primary: 'bg-foreground',
    secondary: 'bg-accent border border-border',
    danger: 'bg-loss',
  }[variant];
  const textClass = variant === 'primary' ? 'text-background' : 'text-foreground';
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`h-12 items-center justify-center rounded-lg ${variantClass} ${isDisabled ? 'opacity-50' : ''}`}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.background : colors.foreground} />
      ) : (
        <Text className={`text-base font-semibold ${textClass}`}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...inputProps
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View className="gap-1.5">
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={colors.muted}
        className="h-12 rounded-lg border border-border bg-card px-3 text-base text-foreground"
        {...inputProps}
      />
      {error ? <Text className="text-xs text-loss">{error}</Text> : null}
    </View>
  );
}

export function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center bg-background py-20">
      <ActivityIndicator color={colors.muted} />
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <Text className="py-6 text-center text-sm text-muted">{message}</Text>;
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-sm text-muted">{label}</Text>
      {typeof value === 'string' ? (
        <Text className="text-sm font-medium text-foreground">{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}
