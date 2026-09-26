import groupBy from 'lodash/groupBy';
import { CryptoTransaction } from '../types';

export interface CryptoHolding {
  invested: number;
  units: number;
  coinName: string;
}

export function groupCryptoHoldings(
  transactions: CryptoTransaction[]
): Record<string, CryptoHolding> {
  const grouped = groupBy(
    transactions,
    (tx) => tx.coinSymbol?.toUpperCase() || tx.coinName?.toUpperCase()
  );
  const holdings: Record<string, CryptoHolding> = {};
  Object.entries(grouped).forEach(([symbol, txs]) => {
    let invested = 0,
      units = 0,
      coinName = '';
    txs.forEach((tx) => {
      if (tx.type === 'credit') {
        invested += tx.amount;
        units += tx.quantity ?? 0;
      } else if (tx.type === 'debit') {
        invested -= tx.amount;
        units -= tx.quantity ?? 0;
      }
      coinName = tx.coinName;
    });
    holdings[symbol] = { invested, units, coinName };
  });
  return holdings;
}

export function heldCoinSymbols(holdings: Record<string, CryptoHolding>): string[] {
  return Object.entries(holdings)
    .filter(([, holding]) => holding.units > 0)
    .map(([symbol]) => symbol);
}
