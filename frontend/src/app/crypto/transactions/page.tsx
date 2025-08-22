'use client';

import { useCryptoTransactionsQuery } from '@/api/query';
import { Button } from '@/components/ui/button';
import { TransactionsTable, Column, Row } from '@/components/custom/TransactionsTable';
import { useRouter } from 'next/navigation';
import { Bitcoin, Edit3, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { useDeleteCryptoTransactionMutation } from '@/api/mutations';

interface CryptoTransaction {
  _id?: string;
  coinName?: string;
  amount?: number;
  date?: string;
  quantity?: number;
  coinPrice?: number;
  type?: 'credit' | 'debit';
  coinSymbol?: string;
}

export default function CryptoTransactionsPage() {
  const { data: cryptoTransactions, isLoading, error } = useCryptoTransactionsQuery();
  const router = useRouter();
  const { mutate: deleteCryptoTx } = useDeleteCryptoTransactionMutation();

  const columns: Column[] = [
    { id: 'coinName', label: 'Coin Name', type: 'string', allowFilter: true },
    { id: 'date', label: 'Date', type: 'date', allowFilter: true },
    { id: 'quantity', label: 'Quantity', type: 'number' },
    { id: 'coinPrice', label: 'Coin Price', type: 'number', units: 'rupee' },
    { id: 'amount', label: 'Amount', type: 'number', showTotal: true, units: 'rupee' },
  ];

  const rows: Row[] = useMemo(() => {
    if (!cryptoTransactions) return [];
    return cryptoTransactions.map((tx: CryptoTransaction) => ({
      _id: tx._id,
      coinName: tx.coinName || '-',
      date: tx.date || '-',
      quantity: tx.quantity ?? '-',
      coinPrice: tx.coinPrice ?? '-',
      amount: tx.amount || 0,
      type: tx.type,
      coinSymbol: tx.coinSymbol,
    }));
  }, [cryptoTransactions]);

  const handleDelete = (id?: string) => {
    if (!id) return;
    if (!confirm('Delete this transaction? This cannot be undone.')) return;
    deleteCryptoTx(id, {
      onSuccess: () => toast.success('Crypto transaction deleted'),
      onError: (e: unknown) =>
        toast.error('Delete failed', { description: (e as Error)?.message || 'Unknown error' }),
    });
  };

  return (
    <div className="p-4 h-full">
      <TransactionsTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        error={error?.message || null}
        title="Crypto Transactions"
        titleIcon={<Bitcoin className="w-4 h-4" />}
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/crypto/updateCrypto')}
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
              onClick={() => router.push(`/crypto/updateCrypto?id=${row._id}`)}
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
