// Aggregate raw transaction lists into per-asset summary rows.
// Compresses N transactions into 1 row per symbol/fund/coin so Claude doesn't
// have to reaggregate buys/sells itself.

type TxType = 'credit' | 'debit';

const round = (n: number, dp = 2): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

const isCredit = (t: { type?: TxType }): boolean => t.type === 'credit';

export interface StockTx {
  type: TxType;
  stockName: string;
  date: string;
  marketPrice: number;
  numOfShares: number;
  amount: number;
}

export interface StockSummaryRow {
  symbol: string;
  units_held: number;
  total_bought: number;
  total_sold: number;
  total_invested: number;
  total_proceeds: number;
  net_invested: number;
  avg_buy_price: number;
  first_txn_date: string;
  last_txn_date: string;
  txn_count: number;
}

export function summarizeStockTransactions(txs: StockTx[]): StockSummaryRow[] {
  const groups = new Map<string, StockTx[]>();
  for (const tx of txs) {
    const key = tx.stockName;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }

  const rows: StockSummaryRow[] = [];
  for (const [symbol, group] of groups) {
    let bought = 0;
    let sold = 0;
    let invested = 0;
    let proceeds = 0;
    let firstDate = group[0].date;
    let lastDate = group[0].date;

    for (const tx of group) {
      if (isCredit(tx)) {
        bought += tx.numOfShares;
        invested += tx.amount;
      } else {
        sold += tx.numOfShares;
        proceeds += tx.amount;
      }
      if (tx.date < firstDate) firstDate = tx.date;
      if (tx.date > lastDate) lastDate = tx.date;
    }

    rows.push({
      symbol,
      units_held: round(bought - sold, 4),
      total_bought: round(bought, 4),
      total_sold: round(sold, 4),
      total_invested: round(invested),
      total_proceeds: round(proceeds),
      net_invested: round(invested - proceeds),
      avg_buy_price: bought > 0 ? round(invested / bought) : 0,
      first_txn_date: firstDate,
      last_txn_date: lastDate,
      txn_count: group.length,
    });
  }

  return rows.sort((a, b) => b.net_invested - a.net_invested);
}

export interface GoldTx {
  type: TxType;
  date: string;
  quantity: number;
  goldPrice: number;
  amount: number;
  tax?: number;
  platform?: string;
}

export interface GoldSummaryRow {
  platform: string;
  grams_held: number;
  total_bought_grams: number;
  total_sold_grams: number;
  total_invested: number;
  total_proceeds: number;
  net_invested: number;
  avg_buy_price_per_gram: number;
  total_tax_paid: number;
  first_txn_date: string;
  last_txn_date: string;
  txn_count: number;
}

export function summarizeGoldTransactions(txs: GoldTx[]): GoldSummaryRow[] {
  const groups = new Map<string, GoldTx[]>();
  for (const tx of txs) {
    const key = tx.platform ?? 'SafeGold';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }

  const rows: GoldSummaryRow[] = [];
  for (const [platform, group] of groups) {
    let bought = 0;
    let sold = 0;
    let invested = 0;
    let proceeds = 0;
    let tax = 0;
    let firstDate = group[0].date;
    let lastDate = group[0].date;

    for (const tx of group) {
      if (isCredit(tx)) {
        bought += tx.quantity;
        invested += tx.amount;
        tax += tx.tax ?? 0;
      } else {
        sold += tx.quantity;
        proceeds += tx.amount;
      }
      if (tx.date < firstDate) firstDate = tx.date;
      if (tx.date > lastDate) lastDate = tx.date;
    }

    rows.push({
      platform,
      grams_held: round(bought - sold, 4),
      total_bought_grams: round(bought, 4),
      total_sold_grams: round(sold, 4),
      total_invested: round(invested),
      total_proceeds: round(proceeds),
      net_invested: round(invested - proceeds),
      avg_buy_price_per_gram: bought > 0 ? round(invested / bought) : 0,
      total_tax_paid: round(tax),
      first_txn_date: firstDate,
      last_txn_date: lastDate,
      txn_count: group.length,
    });
  }

  return rows.sort((a, b) => b.net_invested - a.net_invested);
}

export interface CryptoTx {
  type: TxType;
  coinName: string;
  coinSymbol: string;
  date: string;
  pricePerCoin: number;
  numOfCoins: number;
  amount: number;
}

export interface CryptoSummaryRow {
  coin_symbol: string;
  coin_name: string;
  coins_held: number;
  total_bought: number;
  total_sold: number;
  total_invested: number;
  total_proceeds: number;
  net_invested: number;
  avg_buy_price: number;
  first_txn_date: string;
  last_txn_date: string;
  txn_count: number;
}

export function summarizeCryptoTransactions(txs: CryptoTx[]): CryptoSummaryRow[] {
  const groups = new Map<string, CryptoTx[]>();
  for (const tx of txs) {
    const key = tx.coinSymbol;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }

  const rows: CryptoSummaryRow[] = [];
  for (const [coinSymbol, group] of groups) {
    let bought = 0;
    let sold = 0;
    let invested = 0;
    let proceeds = 0;
    let firstDate = group[0].date;
    let lastDate = group[0].date;

    for (const tx of group) {
      if (isCredit(tx)) {
        bought += tx.numOfCoins;
        invested += tx.amount;
      } else {
        sold += tx.numOfCoins;
        proceeds += tx.amount;
      }
      if (tx.date < firstDate) firstDate = tx.date;
      if (tx.date > lastDate) lastDate = tx.date;
    }

    rows.push({
      coin_symbol: coinSymbol,
      coin_name: group[0].coinName,
      coins_held: round(bought - sold, 8),
      total_bought: round(bought, 8),
      total_sold: round(sold, 8),
      total_invested: round(invested),
      total_proceeds: round(proceeds),
      net_invested: round(invested - proceeds),
      avg_buy_price: bought > 0 ? round(invested / bought) : 0,
      first_txn_date: firstDate,
      last_txn_date: lastDate,
      txn_count: group.length,
    });
  }

  return rows.sort((a, b) => b.net_invested - a.net_invested);
}

export interface MutualFundTx {
  type: TxType;
  fundName: string;
  date: string;
  numOfUnits: number;
  amount: number;
}

export interface MutualFundSummaryRow {
  fund_name: string;
  units_held: number;
  total_bought_units: number;
  total_sold_units: number;
  total_invested: number;
  total_proceeds: number;
  net_invested: number;
  avg_buy_nav: number;
  first_txn_date: string;
  last_txn_date: string;
  txn_count: number;
}

export function summarizeMutualFundTransactions(txs: MutualFundTx[]): MutualFundSummaryRow[] {
  const groups = new Map<string, MutualFundTx[]>();
  for (const tx of txs) {
    const key = tx.fundName;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }

  const rows: MutualFundSummaryRow[] = [];
  for (const [fundName, group] of groups) {
    let bought = 0;
    let sold = 0;
    let invested = 0;
    let proceeds = 0;
    let firstDate = group[0].date;
    let lastDate = group[0].date;

    for (const tx of group) {
      if (isCredit(tx)) {
        bought += tx.numOfUnits;
        invested += tx.amount;
      } else {
        sold += tx.numOfUnits;
        proceeds += tx.amount;
      }
      if (tx.date < firstDate) firstDate = tx.date;
      if (tx.date > lastDate) lastDate = tx.date;
    }

    rows.push({
      fund_name: fundName,
      units_held: round(bought - sold, 4),
      total_bought_units: round(bought, 4),
      total_sold_units: round(sold, 4),
      total_invested: round(invested),
      total_proceeds: round(proceeds),
      net_invested: round(invested - proceeds),
      avg_buy_nav: bought > 0 ? round(invested / bought, 4) : 0,
      first_txn_date: firstDate,
      last_txn_date: lastDate,
      txn_count: group.length,
    });
  }

  return rows.sort((a, b) => b.net_invested - a.net_invested);
}
