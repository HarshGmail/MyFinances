'use client';

import { useStockTransactionsQuery } from '@/api/query';
import { Button } from '@/components/ui/button';
import { TransactionsTable, Column, Row } from '@/components/custom/TransactionsTable';
import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';

interface StockTransaction {
  _id?: string;
  stockName?: string;
  amount?: number;
  date?: string;
  numOfShares?: number;
  marketPrice?: number;
  type?: 'credit' | 'debit';
}

export default function StocksTransactionsPage() {
  const { data: stockTransactions, isLoading, error } = useStockTransactionsQuery();
  const router = useRouter();

  // Table data state
  const [tableRows, setTableRows] = useState<Row[]>([]);

  // Define table columns
  const columns: Column[] = [
    { id: 'stockName', label: 'Stock Name', type: 'string', allowFilter: true },
    { id: 'date', label: 'Date', type: 'date', allowFilter: true },
    { id: 'type', label: 'Type', type: 'string', allowFilter: true, className: 'w-32' },
    { id: 'numOfShares', label: 'Shares', type: 'number' },
    { id: 'marketPrice', label: 'Market Price', type: 'number', units: 'rupee' },
    { id: 'amount', label: 'Amount', type: 'number', showTotal: true, units: 'rupee' },
  ];

  // Transform data for table
  const rawTableRows: Row[] = useMemo(() => {
    if (!stockTransactions) return [];

    return stockTransactions.map((tx: StockTransaction) => ({
      stockName: tx.stockName || '-',
      date: tx.date || '-',
      type: tx.type || '-',
      numOfShares: tx.numOfShares ?? '-',
      marketPrice: tx.marketPrice ?? '-',
      amount: tx.amount || 0,
    }));
  }, [stockTransactions]);

  // Update table rows when raw data changes
  useMemo(() => {
    setTableRows(rawTableRows);
  }, [rawTableRows]);

  return (
    <div className="h-full p-4">
      <TransactionsTable
        columns={columns}
        rows={tableRows}
        isLoading={isLoading}
        error={error?.message || null}
        title="Stock Transactions"
        titleIcon={<TrendingUp className="w-4 h-4" />}
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/stocks/updateStock')}
            style={{ cursor: 'pointer' }}
          >
            Add Transaction
          </Button>
        }
      />
    </div>
  );
}
