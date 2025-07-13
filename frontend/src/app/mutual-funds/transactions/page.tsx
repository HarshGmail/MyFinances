'use client';

import { useMutualFundTransactionsQuery } from '@/api/query';
import { Button } from '@/components/ui/button';
import { TransactionsTable, Column, Row } from '@/components/custom/TransactionsTable';
import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import { useState, useMemo } from 'react';

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
      fundName: tx.fundName || '-',
      date: tx.date || '-',
      numOfUnits: tx.numOfUnits ?? '-',
      amount: tx.amount || 0,
      type: tx.type || '-',
      platform: tx.platform || '-',
    }));
  }, [mutualFundTransactions]);

  // Update table rows when raw data changes
  useMemo(() => {
    setTableRows(rawTableRows);
  }, [rawTableRows]);

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
      />
    </div>
  );
}
