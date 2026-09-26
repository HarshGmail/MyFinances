import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { formatCurrency, formatSignedPercent } from '@myfinances/core/calc/numbers';
import { Card } from './ui';
import { changeClass } from '@/lib/theme';

export interface HoldingMetric {
  label: string;
  value: ReactNode;
}

export function HoldingCard({
  title,
  currentValue,
  profitLoss,
  profitLossPercentage,
  metrics,
}: {
  title: string;
  currentValue: number | null;
  profitLoss: number | null;
  profitLossPercentage: number | null;
  metrics: HoldingMetric[];
}) {
  return (
    <Card>
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-sm font-semibold text-foreground" numberOfLines={2}>
          {title}
        </Text>
        <View className="items-end">
          <Text className="text-sm font-semibold text-foreground">
            {currentValue === null ? '—' : formatCurrency(currentValue)}
          </Text>
          {profitLossPercentage !== null && profitLoss !== null && (
            <Text className={`text-xs ${changeClass(profitLoss)}`}>
              {formatSignedPercent(profitLossPercentage)}
            </Text>
          )}
        </View>
      </View>
      <View className="flex-row flex-wrap gap-y-2">
        {metrics.map((metric) => (
          <View key={metric.label} className="w-1/3 gap-0.5">
            <Text className="text-[11px] text-muted">{metric.label}</Text>
            {typeof metric.value === 'string' ? (
              <Text className="text-xs font-medium text-foreground">{metric.value}</Text>
            ) : (
              metric.value
            )}
          </View>
        ))}
      </View>
    </Card>
  );
}

export function SignedText({ value, children }: { value: number; children: ReactNode }) {
  return <Text className={`text-xs font-medium ${changeClass(value)}`}>{children}</Text>;
}

export function SummaryCard({
  label,
  value,
  profitLoss,
  profitLossPercentage,
  children,
}: {
  label: string;
  value: number;
  profitLoss: number;
  profitLossPercentage: number;
  children?: ReactNode;
}) {
  return (
    <Card>
      <Text className="text-xs font-medium text-muted">{label}</Text>
      <Text className="text-3xl font-bold text-foreground">{formatCurrency(value)}</Text>
      <Text className={`text-sm ${changeClass(profitLoss)}`}>
        {formatCurrency(profitLoss)} ({formatSignedPercent(profitLossPercentage)})
      </Text>
      {children}
    </Card>
  );
}
