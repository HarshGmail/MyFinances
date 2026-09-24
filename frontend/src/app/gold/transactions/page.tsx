'use client';

import { useGoldTransactionsQuery } from '@/api/query';
import { Button } from '@/components/ui/button';
import { TransactionsTable, Column, Row } from '@/components/custom/TransactionsTable';
import { useRouter } from 'next/navigation';
import { Receipt, Edit3, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useDeleteGoldTransactionMutation } from '@/api/mutations/gold'; // adjust path if needed
import { GoldCategory } from '@/api/dataInterface';
import { GOLD_CATEGORY_LABELS, getGoldCategory } from '@/utils/goldCategories';

interface GoldTransaction {
  _id?: string;
  platform?: string;
  amount?: number;
  date?: string;
  quantity?: number;
  goldPrice?: number;
  type: 'credit' | 'debit';
  tax?: number;
  category?: GoldCategory;
  borrower?: string;
}

const PURCHASE_LABEL = GOLD_CATEGORY_LABELS.purchase;

function netGrams(rows: Row[]): number {
  return rows.reduce((sum, row) => {
    if (typeof row.quantity !== 'number') return sum;
    return sum + (row.type === 'credit' ? row.quantity : -row.quantity);
  }, 0);
}

export default function GoldTransactionsPage() {
  const { data: goldTransactions, isLoading, error } = useGoldTransactionsQuery();
  const router = useRouter();
  const { mutate: deleteGoldTx } = useDeleteGoldTransactionMutation();

  const [tableRows, setTableRows] = useState<Row[]>([]);

  const columns: Column[] = [
    { id: 'platform', label: 'Platform', type: 'string', allowFilter: true },
    { id: 'date', label: 'Date', type: 'date', allowFilter: true },
    {
      id: 'quantity',
      label: 'Net Qty',
      type: 'number',
      units: 'gms',
      showTotal: true,
      customTotal: (rows) => `${netGrams(rows).toFixed(4)} gms`,
    },
    {
      id: 'goldPrice',
      label: 'Purchase Cost/gm',
      type: 'number',
      units: 'rupee',
      showTotal: true,
      customTotal: (rows) => {
        const purchases = rows.filter((row) => row.category === PURCHASE_LABEL);
        const totalInvestment = purchases.reduce((sum, row) => sum + (row.amount ?? 0), 0);
        const totalQty = purchases.reduce((sum, row) => sum + (row.quantity ?? 0), 0);
        if (totalQty === 0) return '-';
        const avg = totalInvestment / totalQty;
        return `₹${avg.toFixed(2)}`;
      },
    },
    { id: 'category', label: 'Category', type: 'string', allowFilter: true },
    { id: 'borrower', label: 'Leased To', type: 'string', allowFilter: true },
    { id: 'type', label: 'Type', type: 'string', allowFilter: true, className: 'w-32' },
    { id: 'tax', label: 'Tax Paid Index', type: 'number' },
    { id: 'amount', label: 'Invest Amount', type: 'number', showTotal: true, units: 'rupee' },
  ];

  const rawTableRows: Row[] = useMemo(() => {
    if (!goldTransactions) return [];
    return goldTransactions.map((tx: GoldTransaction) => ({
      _id: tx._id, // keep _id for actions
      platform: tx.platform || '-',
      amount: tx.amount || 0,
      date: tx.date || '-',
      quantity: tx.quantity ?? '-',
      goldPrice: tx.goldPrice || '-',
      category: GOLD_CATEGORY_LABELS[getGoldCategory(tx)],
      borrower: tx.borrower || '-',
      type: tx.type,
      tax: tx.tax ?? '-',
    }));
  }, [goldTransactions]);

  useMemo(() => setTableRows(rawTableRows), [rawTableRows]);

  const handleDelete = (id?: string) => {
    if (!id) return;
    if (!confirm('Delete this transaction? This cannot be undone.')) return;
    deleteGoldTx(id, {
      onSuccess: () => toast.success('Gold transaction deleted'),
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
        actionsRenderer={(row) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit transaction"
              onClick={() => router.push(`/gold/updateGold?id=${row._id}`)}
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
