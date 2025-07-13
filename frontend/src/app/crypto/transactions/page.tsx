'use client';

import { useCryptoTransactionsQuery } from '@/api/query';
import { Button } from '@/components/ui/button';
import { TransactionsTable, Column, Row } from '@/components/custom/TransactionsTable';
import { useRouter } from 'next/navigation';
import { Bitcoin } from 'lucide-react';
import { useMemo } from 'react';

interface CryptoTransaction {
  _id?: string;
  coinName?: string;
  amount?: number;
  date?: string;
  quantity?: number;
  coinPrice?: number;
}

export default function CryptoTransactionsPage() {
  const { data: cryptoTransactions, isLoading, error } = useCryptoTransactionsQuery();
  const router = useRouter();

  // Define table columns
  const columns: Column[] = [
    { id: 'coinName', label: 'Coin Name', type: 'string', allowFilter: true },
    { id: 'date', label: 'Date', type: 'date', allowFilter: true },
    { id: 'quantity', label: 'Quantity', type: 'number' },
    { id: 'coinPrice', label: 'Coin Price', type: 'number', units: 'rupee' },
    { id: 'amount', label: 'Amount', type: 'number', showTotal: true, units: 'rupee' },
  ];

  // Transform data for table
  const rows: Row[] = useMemo(() => {
    if (!cryptoTransactions) return [];
    return cryptoTransactions.map((tx: CryptoTransaction) => ({
      coinName: tx.coinName || '-',
      date: tx.date || '-',
      quantity: tx.quantity ?? '-',
      coinPrice: tx.coinPrice ?? '-',
      amount: tx.amount || 0,
    }));
  }, [cryptoTransactions]);

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
      />
    </div>
  );
}
