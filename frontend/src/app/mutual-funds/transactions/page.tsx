'use client';

import { useMutualFundTransactionsQuery } from '@/api/query';
import { useDeleteMutualFundTransactionMutation } from '@/api/mutations/mutual-funds';
import { Button } from '@/components/ui/button';
import { TransactionsTable, Column, Row } from '@/components/custom/TransactionsTable';
import { useRouter } from 'next/navigation';
import { TrendingUp, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

interface MutualFundTransaction {
  _id?: string;
  fundName?: string;
  amount?: number;
  date?: string;
  numOfUnits?: number;
  fundPrice?: number;
  type?: 'credit' | 'debit';
  platform?: string;
}

export default function MutualFundsTransactionsPage() {
  const { data: mutualFundTransactions, isLoading, error } = useMutualFundTransactionsQuery();
  const router = useRouter();
  const { mutate: deleteMfTx } = useDeleteMutualFundTransactionMutation();

  // Table data state
  const [tableRows, setTableRows] = useState<Row[]>([]);

  // Define table columns
  const columns: Column[] = [
    { id: 'fundName', label: 'Fund Name', type: 'string', allowFilter: true },
    { id: 'date', label: 'Date', type: 'date', allowFilter: true },
    { id: 'numOfUnits', label: 'Units', type: 'string' },
    { id: 'amount', label: 'Amount', type: 'number', showTotal: true },
    { id: 'type', label: 'Type', type: 'string', allowFilter: true },
    { id: 'platform', label: 'Platform', type: 'string', allowFilter: true },
  ];

  // Transform data for table
  const rawTableRows: Row[] = useMemo(() => {
    if (!mutualFundTransactions) return [];

    return mutualFundTransactions.map((tx: MutualFundTransaction) => ({
      _id: tx._id,
      fundName: tx.fundName || '-',
      date: tx.date || '-',
      numOfUnits: tx.numOfUnits ?? '-',
      amount: tx.amount || 0,
      type: tx.type || '-',
      platform: tx.platform || '-',
    }));
  }, [mutualFundTransactions]);

  useMemo(() => setTableRows(rawTableRows), [rawTableRows]);

  const handleDelete = (id?: string) => {
    if (!id) return;
    if (!confirm('Delete this transaction? This cannot be undone.')) return;
    deleteMfTx(id, {
      onSuccess: () => toast.success('MF transaction deleted'),
      onError: (e: unknown) =>
        toast.error('Delete failed', { description: (e as Error)?.message || 'Unknown error' }),
    });
  };

  return (
    <div className="p-4 h-full">
      <TransactionsTable
        columns={columns}
        rows={tableRows}
        isLoading={isLoading}
        error={error?.message || null}
        title="Mutual Fund Transactions"
        titleIcon={<TrendingUp className="w-4 h-4" />}
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/mutual-funds/portfolio')}
            style={{ cursor: 'pointer' }}
          >
            Add Transaction
          </Button>
        }
        actionsRenderer={(row) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete transaction"
            onClick={() => handleDelete(row._id)}
            className="hover:bg-accent"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      />
    </div>
  );
}
