import { useState } from 'react';
import { Stack } from 'expo-router';
import { Alert, Text, Pressable } from 'react-native';
import { useUserProfileQuery } from '@myfinances/core/api/query/profile';
import { useUpdateUserProfileMutation } from '@myfinances/core/api/mutations/profile';
import { SalaryRecord } from '@myfinances/core/types';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import { errorMessage } from '@/components/FormScreen';
import { Screen, Card, Row, Label, Button, EmptyState, LoadingState, Field } from '@/components/ui';

export default function SalaryScreen() {
  const { data: profile, isLoading } = useUserProfileQuery();
  const mutation = useUpdateUserProfileMutation();
  const [newSalary, setNewSalary] = useState('');
  const [newEffectiveDate, setNewEffectiveDate] = useState('');
  const [salaryError, setSalaryError] = useState<string | null>(null);

  if (isLoading || !profile) {
    return <LoadingState />;
  }

  const sortedSalaryHistory = [...(profile.salaryHistory ?? [])].sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );

  const sortedPaymentHistory = [...(profile.paymentHistory ?? [])].sort(
    (a, b) => new Date(b.month).getTime() - new Date(a.month).getTime()
  );

  const handleDeleteSalaryRecord = (record: SalaryRecord) => {
    const dateStr = new Date(record.effectiveDate).toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    });
    Alert.alert('Delete salary record?', `Remove salary record from ${dateStr}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const remaining =
            profile.salaryHistory?.filter((r) => r.effectiveDate !== record.effectiveDate) ?? [];
          try {
            await mutation.mutateAsync({ data: { salaryHistory: remaining } });
          } catch (error) {
            setSalaryError(errorMessage(error));
          }
        },
      },
    ]);
  };

  const handleAddSalaryRecord = async () => {
    setSalaryError(null);

    const salary = parseFloat(newSalary.replace(/,/g, ''));
    if (!Number.isFinite(salary) || salary <= 0) {
      setSalaryError('Base salary must be greater than 0');
      return;
    }

    const date = new Date(newEffectiveDate);
    if (Number.isNaN(date.getTime())) {
      setSalaryError('Invalid date format (use YYYY-MM-DD)');
      return;
    }

    const newRecord: SalaryRecord = {
      baseSalary: salary,
      effectiveDate: date.toISOString(),
    };

    const updated = [...(profile.salaryHistory ?? []), newRecord].sort(
      (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    );

    try {
      await mutation.mutateAsync({ data: { salaryHistory: updated } });
      setNewSalary('');
      setNewEffectiveDate('');
    } catch {
      setSalaryError('Failed to add salary record');
    }
  };

  return (
    <Screen underHeader>
      <Stack.Screen options={{ title: 'Salary' }} />

      <Card>
        <Label>Salary history</Label>
        {sortedSalaryHistory.length === 0 ? (
          <EmptyState message="No salary records yet" />
        ) : (
          sortedSalaryHistory.map((record) => (
            <Pressable
              key={record.effectiveDate}
              onLongPress={() => handleDeleteSalaryRecord(record)}
              delayLongPress={500}
            >
              <Row
                label={new Date(record.effectiveDate).toLocaleDateString('en-IN', {
                  month: 'short',
                  year: 'numeric',
                })}
                value={formatCurrency(record.baseSalary)}
              />
            </Pressable>
          ))
        )}
      </Card>

      <Card>
        <Label>Add new salary record</Label>
        <Field
          label="New base salary (₹)"
          keyboardType="decimal-pad"
          value={newSalary}
          onChangeText={setNewSalary}
        />
        <Field
          label="Effective from (YYYY-MM-DD)"
          value={newEffectiveDate}
          onChangeText={setNewEffectiveDate}
          placeholder="2024-09-01"
        />
        {salaryError ? <Text className="text-xs text-loss">{salaryError}</Text> : null}
        <Button label="Add salary record" onPress={handleAddSalaryRecord} />
      </Card>

      <Card>
        <Label>Payments</Label>
        {sortedPaymentHistory.length === 0 ? (
          <EmptyState message="No payment history yet" />
        ) : (
          sortedPaymentHistory.map((payment) => (
            <Row
              key={payment.month}
              label={new Date(payment.month).toLocaleDateString('en-IN', {
                month: 'short',
                year: 'numeric',
              })}
              value={formatCurrency(payment.totalPaid)}
            />
          ))
        )}
        <Label>Add bonuses and arrears on the web.</Label>
      </Card>
    </Screen>
  );
}
