'use client';

import { useStockTransactionsQuery } from '@/api/query';
import { Button } from '@/components/ui/button';
import { TransactionsTable, Column, Row } from '@/components/custom/TransactionsTable';
import { useRouter } from 'next/navigation';
import { TrendingUp, Edit3, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { useDeleteStockTransactionMutation } from '@/api/mutations';

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
  const { mutate: deleteStockTx } = useDeleteStockTransactionMutation();

  const columns: Column[] = [
    { id: 'stockName', label: 'Stock Name', type: 'string', allowFilter: true },
    { id: 'date', label: 'Date', type: 'date', allowFilter: true },
    { id: 'type', label: 'Type', type: 'string', allowFilter: true, className: 'w-32' },
    { id: 'numOfShares', label: 'Shares', type: 'number' },
    { id: 'marketPrice', label: 'Market Price', type: 'number', units: 'rupee' },
    { id: 'amount', label: 'Amount', type: 'number', showTotal: true, units: 'rupee' },
  ];

  const rows: Row[] = useMemo(() => {
    if (!stockTransactions) return [];
    return stockTransactions.map((tx: StockTransaction) => ({
      _id: tx._id, // keep id for actions
      stockName: tx.stockName || '-',
      date: tx.date || '-',
      type: tx.type || '-',
      numOfShares: tx.numOfShares ?? '-',
      marketPrice: tx.marketPrice ?? '-',
      amount: tx.amount || 0,
    }));
  }, [stockTransactions]);

  const handleDelete = (id?: string) => {
    if (!id) return;
    if (!confirm('Delete this transaction? This cannot be undone.')) return;
    deleteStockTx(id, {
      onSuccess: () => toast.success('Stock transaction deleted'),
      onError: (e: unknown) =>
        toast.error('Delete failed', { description: (e as Error)?.message || 'Unknown error' }),
    });
  };

  return (
    <div className="h-full p-4">
      <TransactionsTable
        columns={columns}
        rows={rows}
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
        actionsRenderer={(row) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit transaction"
              onClick={() => router.push(`/stocks/updateStock?id=${row._id}`)}
              className="hover:bg-accent"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete transaction"
              onClick={() => handleDelete(row._id)}
              className="hover:bg-accent"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />
    </div>
  );
}
