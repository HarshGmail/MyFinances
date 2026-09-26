import { Alert, Pressable, Text, View } from 'react-native';
import { formatCurrency } from '@myfinances/core/calc/numbers';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function TransactionRow({
  title,
  subtitle,
  date,
  amount,
  isCredit,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  date: string;
  amount: number;
  isCredit: boolean;
  onEdit?: () => void;
  onDelete: () => Promise<unknown>;
}) {
  const confirmDelete = () =>
    Alert.alert('Delete transaction?', `${title} on ${formatDate(date)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDelete().catch((error: { message?: string }) =>
            Alert.alert('Could not delete', error?.message ?? 'Something went wrong')
          );
        },
      },
    ]);

  return (
    <Pressable
      onPress={onEdit}
      onLongPress={confirmDelete}
      className="flex-row items-center justify-between border-t border-border py-3"
      accessibilityHint={onEdit ? 'Tap to edit, long press to delete' : 'Long press to delete'}
    >
      <View className="flex-1 pr-3">
        <Text className="text-sm text-foreground" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-xs text-muted">
          {[subtitle, formatDate(date)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text className={`text-sm font-medium ${isCredit ? 'text-foreground' : 'text-loss'}`}>
        {isCredit ? '' : '−'}
        {formatCurrency(amount)}
      </Text>
    </Pressable>
  );
}
