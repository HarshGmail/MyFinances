'use client';

import { useMemo } from 'react';
import { Receipt } from 'lucide-react';
import { cardTransactionKindLabel } from '@myfinances/core/schemas/creditCards';
import { liveAlerts } from '@myfinances/core/calc/creditCards';
import type {
  CardTransactionAlert,
  CreditCard,
  CreditCardTransaction,
} from '@myfinances/core/types';
import { Card, CardContent } from '@/components/ui/card';
import { TransactionsTable, type Column, type Row } from '@/components/custom/TransactionsTable';
import { cardDisplayName } from './cardDisplay';

const NO_EMI = '—';
const STATUS_POSTED = 'Posted';
const STATUS_PENDING = 'Pending';
const PENDING_KIND_LABEL = 'Live alert';

const COLUMNS: Column[] = [
  { id: 'description', label: 'Description', type: 'string' },
  { id: 'cardDate', label: 'Date', type: 'date', allowFilter: true },
  { id: 'cardName', label: 'Card', type: 'string', allowFilter: true },
  { id: 'cardStatus', label: 'Status', type: 'string', allowFilter: true },
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

function signedAlertAmount(alert: CardTransactionAlert): number {
  return alert.direction === 'credit' ? -alert.amount : alert.amount;
}

function emiLabel(tx: CreditCardTransaction): string {
  if (!tx.emiInstallment) return NO_EMI;
  return `${tx.emiInstallment.number}/${tx.emiInstallment.of}`;
}

export function CardTransactionsTable({
  cards,
  transactions,
  alerts,
  isLoading,
}: {
  cards: CreditCard[];
  transactions: CreditCardTransaction[];
  alerts: CardTransactionAlert[];
  isLoading: boolean;
}) {
  const rows = useMemo<Row[]>(() => {
    const cardNameById = new Map(cards.map((card) => [card._id, cardDisplayName(card)]));
    const postedRows = transactions.map((tx) => ({
      _id: tx._id,
      description: tx.description,
      cardDate: tx.date,
      cardName: cardNameById.get(tx.cardId) ?? 'Unknown card',
      cardStatus: STATUS_POSTED,
      cardKind: cardTransactionKindLabel(tx.kind),
      cardCategory: tx.category,
      cardAmount: signedAmount(tx),
      cardEmi: emiLabel(tx),
    }));
    const pendingRows = liveAlerts(alerts).map((alert) => ({
      _id: alert._id,
      description: alert.description,
      cardDate: alert.date,
      cardName: cardNameById.get(alert.cardId) ?? 'Unknown card',
      cardStatus: STATUS_PENDING,
      cardKind: PENDING_KIND_LABEL,
      cardCategory: alert.category,
      cardAmount: signedAlertAmount(alert),
      cardEmi: NO_EMI,
    }));
    return [...pendingRows, ...postedRows];
  }, [cards, transactions, alerts]);

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
