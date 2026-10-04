'use client';

import { useMemo } from 'react';
import { Receipt } from 'lucide-react';
import { cardTransactionKindLabel } from '@myfinances/core/schemas/creditCards';
import type { CreditCard, CreditCardTransaction } from '@myfinances/core/types';
import { Card, CardContent } from '@/components/ui/card';
import { TransactionsTable, type Column, type Row } from '@/components/custom/TransactionsTable';
import { cardDisplayName } from './cardDisplay';

const NO_EMI = '—';

const COLUMNS: Column[] = [
  { id: 'description', label: 'Description', type: 'string' },
  { id: 'cardDate', label: 'Date', type: 'date', allowFilter: true },
  { id: 'cardName', label: 'Card', type: 'string', allowFilter: true },
  { id: 'cardKind', label: 'Type', type: 'string', allowFilter: true },
  { id: 'cardCategory', label: 'Category', type: 'string', allowFilter: true },
  {
    id: 'cardAmount',
    label: 'Amount (credits −)',
    type: 'number',
    units: 'rupee',
    showTotal: true,
    className: 'text-right',
  },
  { id: 'cardEmi', label: 'EMI', type: 'string' },
];

function signedAmount(tx: CreditCardTransaction): number {
  return tx.direction === 'credit' ? -tx.amount : tx.amount;
}

function emiLabel(tx: CreditCardTransaction): string {
  if (!tx.emiInstallment) return NO_EMI;
  return `${tx.emiInstallment.number}/${tx.emiInstallment.of}`;
}

export function CardTransactionsTable({
  cards,
  transactions,
  isLoading,
}: {
  cards: CreditCard[];
  transactions: CreditCardTransaction[];
  isLoading: boolean;
}) {
  const rows = useMemo<Row[]>(() => {
    const cardNameById = new Map(cards.map((card) => [card._id, cardDisplayName(card)]));
    return transactions.map((tx) => ({
      _id: tx._id,
      description: tx.description,
      cardDate: tx.date,
      cardName: cardNameById.get(tx.cardId) ?? 'Unknown card',
      cardKind: cardTransactionKindLabel(tx.kind),
      cardCategory: tx.category,
      cardAmount: signedAmount(tx),
      cardEmi: emiLabel(tx),
    }));
  }, [cards, transactions]);

  return (
    <Card>
      <CardContent className="pt-6">
        <TransactionsTable
          title="Card Transactions"
          titleIcon={<Receipt className="h-5 w-5" />}
          columns={COLUMNS}
          rows={rows}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
