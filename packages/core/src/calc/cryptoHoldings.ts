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

export interface CryptoPosition {
  coinName: string;
  currency: string;
  balance: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export function valueCryptoHoldings(
  holdings: Record<string, CryptoHolding>,
  prices: Record<string, number | null>
): CryptoPosition[] {
  return heldCoinSymbols(holdings).map((symbol) => {
    const { coinName, invested, units } = holdings[symbol];
    const currentPrice = prices[symbol] || 0;
    const currentValue = units * currentPrice;
    const profitLoss = currentValue - invested;
    return {
      coinName,
      currency: symbol,
      balance: units,
      currentPrice,
      investedAmount: invested,
      currentValue,
      profitLoss,
      profitLossPercentage: invested > 0 ? (profitLoss / invested) * 100 : 0,
    };
  });
}
