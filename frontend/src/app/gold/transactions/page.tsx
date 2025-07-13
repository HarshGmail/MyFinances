'use client';

import { useGoldTransactionsQuery } from '@/api/query';
import { Button } from '@/components/ui/button';
import { TransactionsTable, Column, Row } from '@/components/custom/TransactionsTable';
import { useRouter } from 'next/navigation';
import { Receipt } from 'lucide-react';
import { useState, useMemo } from 'react';

interface GoldTransaction {
  _id?: string;
  platform?: string;
  amount?: number;
  date?: string;
  quantity?: number;
  goldPrice?: number;
  type: string;
  tax?: number;
}

export default function GoldTransactionsPage() {
  const { data: goldTransactions, isLoading, error } = useGoldTransactionsQuery();
  const router = useRouter();

  // Table data state
  const [tableRows, setTableRows] = useState<Row[]>([]);

  // Define table columns
  const columns: Column[] = [
    { id: 'platform', label: 'Platform', type: 'string', allowFilter: true },
    { id: 'date', label: 'Date', type: 'date', allowFilter: true },
    { id: 'quantity', label: 'Net Qty', type: 'number', units: 'gms', showTotal: true },
    {
      id: 'goldPrice',
      label: 'Purchase Cost/gm',
      type: 'number',
      units: 'rupee',
      showTotal: true,
      customTotal: (rows) => {
        const totalInvestment = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
        const totalQty = rows.reduce((sum, row) => sum + (row.quantity ?? 0), 0);
        if (totalQty === 0) return '-';
        const avg = totalInvestment / totalQty;
        return `₹${avg.toFixed(2)}`;
      },
    },
    { id: 'type', label: 'Type', type: 'string', allowFilter: true, className: 'w-32' },
    { id: 'tax', label: 'Tax Paid Index', type: 'number' },
    { id: 'amount', label: 'Invest Amount', type: 'number', showTotal: true, units: 'rupee' },
  ];

  // Transform data for table
  const rawTableRows: Row[] = useMemo(() => {
    if (!goldTransactions) return [];

    return goldTransactions.map((tx: GoldTransaction) => ({
      platform: tx.platform || '-',
      amount: tx.amount || 0,
      date: tx.date || '-',
      quantity: tx.quantity ?? '-',
      goldPrice: tx.goldPrice ?? '-',
      type: tx.type,
      tax: tx.tax ?? '-',
    }));
  }, [goldTransactions]);

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
        title="Gold Transactions"
        titleIcon={<Receipt className="w-4 h-4" />}
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/gold/updateGold')}
            style={{ cursor: 'pointer' }}
          >
            Add Transaction
          </Button>
        }
      />
    </div>
  );
}
