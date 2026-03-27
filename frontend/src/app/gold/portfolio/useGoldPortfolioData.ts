import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useSafeGoldRatesQuery, useGoldTransactionsQuery } from '@/api/query';
import { useCapitalGainsQuery } from '@/api/query/capitalGains';
import xirr, { XirrTransaction } from '@/utils/xirr';
import { getPastDate, getTimeframes } from '@/utils/chartHelpers';
import Highcharts from 'highcharts';

export function useGoldPortfolioData() {
  const { theme } = useAppStore();
  const TIMEFRAMES = getTimeframes();
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[1].label);

  const endDate = new Date().toISOString().slice(0, 10);
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const startDate = fiveYearsAgo.toISOString().slice(0, 10);

  const selectedTimeframe = TIMEFRAMES.find((tf) => tf.label === timeframe) || TIMEFRAMES[1];
  const timeframeStartDate = getPastDate(selectedTimeframe.days, 'ymd');

  const { data, isLoading: ratesLoading, error } = useSafeGoldRatesQuery({ startDate, endDate });
  const { data: transactions, isLoading: transactionsLoading } = useGoldTransactionsQuery();
  const { data: cgData, isLoading: cgLoading } = useCapitalGainsQuery();

  const filteredRates = useMemo(() => {
    if (!data?.data) return [];
    const cutoff = Date.parse(timeframeStartDate);
    return data.data.filter((d) => Date.parse(d.date) >= cutoff);
  }, [data, timeframeStartDate]);

  const goldStats = useMemo(() => {
    if (!transactions || !filteredRates.length) return null;

    const totalGold = transactions.reduce(
      (sum, tx) => sum + (tx.type === 'credit' ? tx.quantity : -tx.quantity),
      0
    );
    const totalInvested = transactions.reduce(
      (sum, tx) => sum + (tx.type === 'credit' ? tx.amount : -tx.amount),
      0
    );
    const lastRate = parseFloat(filteredRates[filteredRates.length - 1].rate);
    const avgPrice = totalGold > 0 ? totalInvested / totalGold : 0;
    const currentValue = totalGold * lastRate * 0.97;
    const profitLoss = currentValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    const cashFlows: XirrTransaction[] = transactions.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
    cashFlows.push({ amount: currentValue, when: new Date() });
    let xirrValue: number | null = null;
    try {
      xirrValue = xirr(cashFlows) * 100;
    } catch {
      xirrValue = null;
    }

    return {
      totalGold,
      totalInvested,
      currentValue,
      profitLoss,
      profitLossPercentage,
      xirrValue,
      avgPrice,
      currentPrice: lastRate,
    };
  }, [transactions, filteredRates]);

  const goldUnrealized = useMemo(() => {
    const lots = cgData?.byAsset?.gold?.currentLots ?? [];
    const livePrice = goldStats?.currentPrice ?? 0;
    let stcg = 0,
      ltcg = 0;
    for (const lot of lots) {
      const gain = (livePrice - lot.costPerGram) * lot.grams;
      if (lot.holdingDays > 730) ltcg += gain;
      else stcg += gain;
    }
    return { stcg, ltcg, flat30: 0, stcgTax: 0, ltcgTax: Math.max(0, ltcg) * 0.125, flatTax: 0 };
  }, [cgData, goldStats]);

  const transactionPlotLines = useMemo(() => {
    if (!transactions?.length) return [];
    const cutoff = Date.parse(timeframeStartDate);
    const inr = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });

    return transactions
      .map((tx) => {
        const tMs = Date.parse(tx.date);
        if (Number.isNaN(tMs) || tMs < cutoff) return null;
        const isCredit = tx.type === 'credit';
        const color = isCredit ? '#16a34a' : '#dc2626';
        const qty = typeof tx.quantity === 'number' ? ` • ${Number(tx.quantity).toFixed(2)}g` : '';
        const labelText = `${isCredit ? '+' : '-'} ${inr.format(tx.amount)}${qty}`;
        const opt: Highcharts.XAxisPlotLinesOptions = {
          value: tMs,
          color,
          width: 1,
          dashStyle: 'ShortDash',
          zIndex: 5,
          label: {
            text: labelText,
            align: 'left',
            verticalAlign: 'top',
            x: 2,
            y: 12,
            style: {
              color: theme === 'dark' ? '#d1d5db' : '#374151',
              fontSize: '10px',
              fontWeight: '500',
              whiteSpace: 'nowrap',
            },
          },
        };
        return opt;
      })
      .filter((opt): opt is Highcharts.XAxisPlotLinesOptions => Boolean(opt))
      .slice(-30);
  }, [transactions, timeframeStartDate, theme]);

  return {
    theme,
    TIMEFRAMES,
    timeframe,
    setTimeframe,
    data,
    transactions,
    cgData,
    cgLoading,
    filteredRates,
    goldStats,
    goldUnrealized,
    transactionPlotLines,
    isLoading: ratesLoading || transactionsLoading,
    error,
  };
}
