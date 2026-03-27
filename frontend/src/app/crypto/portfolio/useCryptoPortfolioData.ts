import { useMemo, useCallback, useRef, useState } from 'react';
import groupBy from 'lodash/groupBy';
import { useCryptoCoinPricesQuery, useCryptoTransactionsQuery } from '@/api/query';
import { useMultipleCoinCandlesQuery } from '@/api/query/crypto';
import { useCapitalGainsQuery } from '@/api/query/capitalGains';
import xirr, { XirrTransaction as XirrCashFlow } from '@/utils/xirr';
import { CryptoTransaction } from '@/api/dataInterface';

export interface PortfolioItem {
  coinName: string;
  currency: string;
  balance: number;
  currentPrice: number | null;
  investedAmount: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export const CRYPTO_TIMEFRAMES = [
  { label: '1D', days: 1 },
  { label: '3D', days: 3 },
  { label: '7D', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '2Y', days: 730 },
  { label: '3Y', days: 1095 },
  { label: '5Y', days: 1825 },
];

export const COIN_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
  '#F8C471',
  '#82E0AA',
  '#F1948A',
  '#76D7C4',
  '#AED6F1',
  '#D7BDE2',
  '#F9E79F',
];

export function useCryptoPortfolioData() {
  const [timeframe, setTimeframe] = useState(CRYPTO_TIMEFRAMES[6].label);
  const [selectedCoin, setSelectedCoin] = useState('All');
  const chartRef = useRef<HTMLDivElement>(null);

  const selectedTimeframe =
    CRYPTO_TIMEFRAMES.find((tf) => tf.label === timeframe) || CRYPTO_TIMEFRAMES[6];
  const timeframeStart = Date.now() - selectedTimeframe.days * 24 * 60 * 60 * 1000;

  const {
    data: transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useCryptoTransactionsQuery();
  const { data: cgData, isLoading: cgLoading } = useCapitalGainsQuery();

  const investedMap = useMemo(() => {
    if (!transactions) return {};
    const grouped = groupBy(
      transactions,
      (tx) => tx.coinSymbol?.toUpperCase() || tx.coinName?.toUpperCase()
    );
    const map: Record<string, { invested: number; units: number; coinName: string }> = {};
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
      map[symbol] = { invested, units, coinName };
    });
    return map;
  }, [transactions]);

  const validCoins = useMemo(
    () =>
      Object.entries(investedMap)
        .filter(([, v]) => v.units > 0)
        .map(([s]) => s),
    [investedMap]
  );

  const {
    data: coinPrices,
    isLoading: pricesLoading,
    error: pricesError,
  } = useCryptoCoinPricesQuery(validCoins);

  const portfolioData = useMemo<PortfolioItem[]>(() => {
    if (!coinPrices?.data) return [];
    return validCoins.map((coinSymbol) => {
      const { coinName, invested: investedAmount, units } = investedMap[coinSymbol];
      const currentPrice = coinPrices.data[coinSymbol] || 0;
      const currentValue = units * currentPrice;
      const profitLoss = currentValue - investedAmount;
      return {
        coinName,
        currency: coinSymbol,
        balance: units,
        currentPrice,
        investedAmount,
        currentValue,
        profitLoss,
        profitLossPercentage: investedAmount > 0 ? (profitLoss / investedAmount) * 100 : 0,
      };
    });
  }, [coinPrices, investedMap, validCoins]);

  const cryptoUnrealized = useMemo(() => {
    const lots = cgData?.byAsset?.crypto?.currentLots ?? [];
    let flat30 = 0;
    for (const lot of lots) {
      if (!coinPrices?.data) continue;
      const portfolioItem = portfolioData.find((p) => p.coinName === lot.coinName);
      if (!portfolioItem?.currentPrice) continue;
      flat30 += (portfolioItem.currentPrice - lot.costPerUnit) * lot.units;
    }
    return { stcg: 0, ltcg: 0, flat30, stcgTax: 0, ltcgTax: 0, flatTax: Math.max(0, flat30) * 0.3 };
  }, [cgData, portfolioData, coinPrices]);

  const cryptoUnrealizedByCoin = useMemo(() => {
    const map: Record<string, number> = {};
    for (const lot of cgData?.byAsset?.crypto?.currentLots ?? []) {
      const portfolioItem = portfolioData.find((p) => p.coinName === lot.coinName);
      if (!portfolioItem?.currentPrice) continue;
      map[lot.coinName] =
        (map[lot.coinName] ?? 0) + (portfolioItem.currentPrice - lot.costPerUnit) * lot.units;
    }
    return map;
  }, [cgData, portfolioData]);

  const coinColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    portfolioData.forEach((coin, i) => {
      m[coin.currency] = COIN_COLORS[i % COIN_COLORS.length];
    });
    return m;
  }, [portfolioData]);

  const summary = useMemo(() => {
    const totalInvested = portfolioData.reduce((s, i) => s + i.investedAmount, 0);
    const totalCurrentValue = portfolioData.reduce((s, i) => s + i.currentValue, 0);
    const totalProfitLoss = totalCurrentValue - totalInvested;
    return {
      totalInvested,
      totalCurrentValue,
      totalProfitLoss,
      totalProfitLossPercentage: totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0,
    };
  }, [portfolioData]);

  const xirrValue = useMemo(() => {
    if (!transactions) return null;
    const grouped: Record<string, number> = {};
    transactions.forEach((tx) => {
      const k = new Date(tx.date).toISOString().slice(0, 10);
      grouped[k] = (grouped[k] || 0) + (tx.type === 'credit' ? -tx.amount : tx.amount);
    });
    const flows: XirrCashFlow[] = Object.entries(grouped).map(([d, a]) => ({
      amount: a,
      when: new Date(d),
    }));
    flows.push({ amount: Number(summary.totalCurrentValue.toFixed(2)), when: new Date() });
    try {
      return flows.length ? xirr(flows) * 100 : null;
    } catch {
      return null;
    }
  }, [transactions, summary.totalCurrentValue]);

  const coinSymbols = useMemo(
    () => portfolioData.map((c) => c.currency).filter(Boolean),
    [portfolioData]
  );

  const { data: multipleCoinCandles, isLoading: candlesLoading } = useMultipleCoinCandlesQuery(
    coinSymbols,
    '1d'
  );

  const chartData = useMemo(() => {
    if (!portfolioData.length || !multipleCoinCandles) return null;
    const coinSeries: unknown[] = [];
    portfolioData.forEach((coin) => {
      const candles = multipleCoinCandles[coin.currency];
      if (!candles?.length) return;
      const seriesData = candles
        .map((c) => {
          const t = c.time > 1000000000000 ? c.time : c.time * 1000;
          if (t < timeframeStart) return null;
          return [t, c.close * coin.balance];
        })
        .filter(Boolean);
      if (seriesData.length > 0)
        coinSeries.push({
          name: coin.currency,
          data: seriesData,
          color: coinColorMap[coin.currency],
          lineWidth: 2,
          marker: { enabled: false, states: { hover: { enabled: true, radius: 4 } } },
        });
    });
    return coinSeries;
  }, [portfolioData, multipleCoinCandles, timeframeStart, coinColorMap]);

  const getCoinTransactions = useCallback(
    (coin: string) => {
      if (!transactions) return [];
      return transactions.filter(
        (tx: CryptoTransaction) =>
          (tx.coinSymbol?.toUpperCase() || tx.coinName?.toUpperCase()) === coin
      );
    },
    [transactions]
  );

  return {
    transactions,
    cgData,
    cgLoading,
    portfolioData,
    cryptoUnrealized,
    cryptoUnrealizedByCoin,
    coinColorMap,
    summary,
    xirrValue,
    multipleCoinCandles,
    chartData,
    getCoinTransactions,
    timeframe,
    setTimeframe,
    selectedCoin,
    setSelectedCoin,
    selectedTimeframe,
    timeframeStart,
    chartRef,
    isLoading: transactionsLoading || pricesLoading,
    isChartLoading: candlesLoading,
    error: transactionsError || pricesError,
  };
}
