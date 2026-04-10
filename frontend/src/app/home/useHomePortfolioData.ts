import { useMemo } from 'react';
import _ from 'lodash';
import { differenceInDays, differenceInMonths } from 'date-fns';
import { useAppStore } from '@/store/useAppStore';
import {
  useMutualFundTransactionsQuery,
  useSafeGoldRatesQuery,
  useGoldTransactionsQuery,
  useCryptoTransactionsQuery,
  useCryptoCoinPricesQuery,
  useMutualFundInfoFetchQuery,
  useMfapiNavHistoryBatchQuery,
  useEpfQuery,
  useEpfTimelineQuery,
  useFixedDepositsQuery,
  useRecurringDepositsQuery,
} from '@/api/query';
import { useStocksPortfolioQuery } from '@/api/query/stocks';
import { useCapitalGainsQuery } from '@/api/query/capitalGains';
import xirr, { XirrTransaction as XirrCashFlow } from '@/utils/xirr';
import { calcMFPortfolio, calcEPFPortfolio } from '@/utils/portfolioCalculations';
import { buildAIInsightPrompt } from './aiCopy';

interface CryptoPortfolioItem {
  coinName: string;
  currency: string;
  balance: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

const calculateCompoundInterest = (principal: number, rate: number, timeInMonths: number) => {
  const quarterlyRate = rate / 400;
  const quarters = Math.floor(timeInMonths / 3);
  const remainingMonths = timeInMonths % 3;
  let amount = principal * Math.pow(1 + quarterlyRate, quarters);
  if (remainingMonths > 0) {
    amount = amount * (1 + (rate / 1200) * remainingMonths);
  }
  return amount - principal;
};

export function useHomePortfolioData() {
  const user = useAppStore((state) => state.user);

  const { data: cgData } = useCapitalGainsQuery();
  const { data: stocksPortfolioData, isLoading: stocksPortfolioLoading } =
    useStocksPortfolioQuery();
  const { data: mutualFundsTransactionsData, isLoading: mfTransactionsLoading } =
    useMutualFundTransactionsQuery();
  const { data: mfInfoData, isLoading: mfInfoLoading } = useMutualFundInfoFetchQuery();
  const { data: goldTransactions, isLoading: goldTransactionsLoading } = useGoldTransactionsQuery();
  const { data: cryptoTransactions, isLoading: cryptoTransactionsLoading } =
    useCryptoTransactionsQuery();
  const { data: epfData, isLoading: epfLoading } = useEpfQuery();
  const { data: epfTimelineData, isLoading: epfTimelineLoading } = useEpfTimelineQuery();
  const { data: fdData, isLoading: fdLoading } = useFixedDepositsQuery();
  const { data: rdData, isLoading: rdLoading } = useRecurringDepositsQuery();

  const stockPortfolioData = useMemo(
    () => stocksPortfolioData?.portfolio ?? [],
    [stocksPortfolioData?.portfolio]
  );
  const stockTransactions = useMemo(
    () => stocksPortfolioData?.transactions,
    [stocksPortfolioData?.transactions]
  );

  // ===== MUTUAL FUNDS =====
  const schemeNumbers = useMemo(() => {
    if (!mfInfoData) return [];
    return Array.from(new Set(mfInfoData.map((info) => info.schemeNumber)));
  }, [mfInfoData]);

  const { data: navHistoryBatch, isLoading: navHistoryLoading } =
    useMfapiNavHistoryBatchQuery(schemeNumbers);

  const navDataMap = useMemo(() => {
    const map: Record<string, { nav: number; navDate: string } | null> = {};
    schemeNumbers.forEach((schemeNumber) => {
      const navData = navHistoryBatch?.[schemeNumber];
      map[schemeNumber] = navData?.data?.length
        ? { nav: parseFloat(navData.data[0].nav), navDate: navData.data[0].date }
        : null;
    });
    return map;
  }, [schemeNumbers, navHistoryBatch]);

  const mfPortfolioData = useMemo(() => {
    if (!mutualFundsTransactionsData || !mfInfoData) return [];
    return calcMFPortfolio(mutualFundsTransactionsData, mfInfoData, navDataMap).fundData;
  }, [mfInfoData, mutualFundsTransactionsData, navDataMap]);

  // ===== GOLD =====
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: goldRatesData, isLoading: goldRatesLoading } = useSafeGoldRatesQuery({
    startDate,
    endDate,
  });

  const goldPortfolioData = useMemo(() => {
    if (!goldTransactions) return [];
    const totalGold = goldTransactions.reduce(
      (sum, tx) => sum + (tx.type === 'credit' ? tx.quantity : -tx.quantity),
      0
    );
    const totalInvested = goldTransactions.reduce(
      (sum, tx) => sum + (tx.type === 'credit' ? tx.amount : -tx.amount),
      0
    );
    let currentGoldRate = 0;
    if (goldRatesData?.data?.length) {
      currentGoldRate = parseFloat(goldRatesData.data[goldRatesData.data.length - 1].rate);
    }
    const currentValue = totalGold * currentGoldRate;
    const profitLoss = currentValue - totalInvested;
    return [
      {
        totalGold,
        totalInvested,
        currentValue,
        profitLoss,
        profitLossPercentage: totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0,
        currentGoldRate,
      },
    ];
  }, [goldTransactions, goldRatesData]);

  // ===== CRYPTO =====
  const cryptoInvestedMap = useMemo(() => {
    if (!cryptoTransactions) return {};
    const grouped = _.groupBy(
      cryptoTransactions,
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
  }, [cryptoTransactions]);

  const validCoins = useMemo(() => {
    return Object.entries(cryptoInvestedMap)
      .filter(([, v]) => v.units > 0)
      .map(([symbol]) => symbol);
  }, [cryptoInvestedMap]);

  const { data: coinPrices, isLoading: cryptoPricesLoading } = useCryptoCoinPricesQuery(validCoins);

  const cryptoPortfolioData = useMemo<CryptoPortfolioItem[]>(() => {
    if (!coinPrices?.data) return [];
    return validCoins.map((coinSymbol) => {
      const { coinName, invested: investedAmount, units } = cryptoInvestedMap[coinSymbol];
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
  }, [coinPrices, cryptoInvestedMap, validCoins]);

  // ===== EPF =====
  const epfPortfolioData = useMemo(() => {
    const monthlyContribution = epfData?.length ? (epfData.at(-1)?.epfAmount ?? 0) : 0;
    const base = {
      invested: 0,
      currentValue: 0,
      profitLoss: 0,
      profitLossPercentage: 0,
      monthlyContribution,
      annualContribution: monthlyContribution * 12,
    };
    if (!epfTimelineData) return base;
    return {
      ...calcEPFPortfolio(epfTimelineData),
      monthlyContribution,
      annualContribution: monthlyContribution * 12,
    };
  }, [epfTimelineData, epfData]);

  // ===== FD =====
  const fdPortfolioData = useMemo(() => {
    if (!fdData?.length)
      return { invested: 0, currentValue: 0, profitLoss: 0, profitLossPercentage: 0 };
    const processed = fdData.map((fd) => {
      const totalDays = differenceInDays(new Date(fd.dateOfMaturity), new Date(fd.dateOfCreation));
      const daysCompleted = Math.min(
        differenceInDays(new Date(), new Date(fd.dateOfCreation)),
        totalDays
      );
      const currentInterest = (fd.amountInvested * (fd.rateOfInterest / 100) * daysCompleted) / 365;
      return { ...fd, currentValue: fd.amountInvested + currentInterest };
    });
    const invested = processed.reduce((s, fd) => s + fd.amountInvested, 0);
    const currentValue = processed.reduce((s, fd) => s + fd.currentValue, 0);
    const profitLoss = currentValue - invested;
    return {
      invested,
      currentValue,
      profitLoss,
      profitLossPercentage: invested > 0 ? (profitLoss / invested) * 100 : 0,
    };
  }, [fdData]);

  // ===== RD =====
  const rdPortfolioData = useMemo(() => {
    if (!rdData?.length)
      return { invested: 0, currentValue: 0, profitLoss: 0, profitLossPercentage: 0 };
    const processed = rdData.map((rd) => {
      const totalMonths = differenceInMonths(
        new Date(rd.dateOfMaturity),
        new Date(rd.dateOfCreation)
      );
      const monthsCompleted = Math.min(
        differenceInMonths(new Date(), new Date(rd.dateOfCreation)),
        totalMonths
      );
      const currentInterest = calculateCompoundInterest(
        rd.amountInvested,
        rd.rateOfInterest,
        monthsCompleted
      );
      return { ...rd, currentValue: rd.amountInvested + currentInterest };
    });
    const invested = processed.reduce((s, rd) => s + rd.amountInvested, 0);
    const currentValue = processed.reduce((s, rd) => s + rd.currentValue, 0);
    const profitLoss = currentValue - invested;
    return {
      invested,
      currentValue,
      profitLoss,
      profitLossPercentage: invested > 0 ? (profitLoss / invested) * 100 : 0,
    };
  }, [rdData]);

  // ===== PORTFOLIO SUMMARY =====
  const portfolioSummary = useMemo(() => {
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const pct = (pnl: number, inv: number) => (inv > 0 ? (pnl / inv) * 100 : 0);

    const stocksInvested = sum(stockPortfolioData.map((s) => s.investedAmount));
    const stocksValue = sum(stockPortfolioData.map((s) => s.currentValuation));
    const mfInvested = sum(mfPortfolioData.map((f) => f.totalInvested));
    const mfValue = sum(mfPortfolioData.map((f) => f.currentValue ?? 0));
    const goldInvested = sum(goldPortfolioData.map((g) => g.totalInvested));
    const goldValue = sum(goldPortfolioData.map((g) => g.currentValue));
    const cryptoInvested = sum(cryptoPortfolioData.map((c) => c.investedAmount));
    const cryptoValue = sum(cryptoPortfolioData.map((c) => c.currentValue));

    const totalInvested =
      stocksInvested +
      mfInvested +
      goldInvested +
      cryptoInvested +
      epfPortfolioData.invested +
      fdPortfolioData.invested +
      rdPortfolioData.invested;
    const totalCurrentValue =
      stocksValue +
      mfValue +
      goldValue +
      cryptoValue +
      epfPortfolioData.currentValue +
      fdPortfolioData.currentValue +
      rdPortfolioData.currentValue;
    const totalProfitLoss = totalCurrentValue - totalInvested;

    return {
      stocks: {
        invested: stocksInvested,
        currentValue: stocksValue,
        profitLoss: stocksValue - stocksInvested,
        profitLossPercentage: pct(stocksValue - stocksInvested, stocksInvested),
      },
      mutualFunds: {
        invested: mfInvested,
        currentValue: mfValue,
        profitLoss: mfValue - mfInvested,
        profitLossPercentage: pct(mfValue - mfInvested, mfInvested),
      },
      gold: {
        invested: goldInvested,
        currentValue: goldValue,
        profitLoss: goldValue - goldInvested,
        profitLossPercentage: pct(goldValue - goldInvested, goldInvested),
      },
      crypto: {
        invested: cryptoInvested,
        currentValue: cryptoValue,
        profitLoss: cryptoValue - cryptoInvested,
        profitLossPercentage: pct(cryptoValue - cryptoInvested, cryptoInvested),
      },
      epf: epfPortfolioData,
      fd: fdPortfolioData,
      rd: rdPortfolioData,
      total: {
        invested: totalInvested,
        currentValue: totalCurrentValue,
        profitLoss: totalProfitLoss,
        profitLossPercentage: pct(totalProfitLoss, totalInvested),
      },
    };
  }, [
    stockPortfolioData,
    mfPortfolioData,
    goldPortfolioData,
    cryptoPortfolioData,
    epfPortfolioData,
    fdPortfolioData,
    rdPortfolioData,
  ]);

  // ===== XIRR =====
  const calcXirr = (cashFlows: XirrCashFlow[]) => {
    try {
      return cashFlows.length > 1 ? xirr(cashFlows) * 100 : null;
    } catch {
      return null;
    }
  };

  const stockXirr = useMemo(() => {
    if (!stockTransactions || !stockPortfolioData.length) return null;
    const flows: XirrCashFlow[] = stockTransactions.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
    const value = portfolioSummary.stocks.currentValue;
    if (value > 0) flows.push({ amount: value, when: new Date() });
    return calcXirr(flows);
  }, [stockTransactions, stockPortfolioData, portfolioSummary.stocks.currentValue]);

  const mfXirr = useMemo(() => {
    if (!mutualFundsTransactionsData || !mfPortfolioData.length) return null;
    const flows: XirrCashFlow[] = mutualFundsTransactionsData.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
    const value = portfolioSummary.mutualFunds.currentValue;
    if (value > 0) flows.push({ amount: value, when: new Date() });
    return calcXirr(flows);
  }, [mutualFundsTransactionsData, mfPortfolioData, portfolioSummary.mutualFunds.currentValue]);

  const goldXirr = useMemo(() => {
    if (!goldTransactions || !goldPortfolioData.length) return null;
    const flows: XirrCashFlow[] = goldTransactions.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
    const value = portfolioSummary.gold.currentValue;
    if (value > 0) flows.push({ amount: value, when: new Date() });
    return calcXirr(flows);
  }, [goldTransactions, goldPortfolioData, portfolioSummary.gold.currentValue]);

  const cryptoXirr = useMemo(() => {
    if (!cryptoTransactions || !cryptoPortfolioData.length) return null;
    const flows: XirrCashFlow[] = cryptoTransactions.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
    const value = portfolioSummary.crypto.currentValue;
    if (value > 0) flows.push({ amount: value, when: new Date() });
    return calcXirr(flows);
  }, [cryptoTransactions, cryptoPortfolioData, portfolioSummary.crypto.currentValue]);

  const overallXirr = useMemo(() => {
    const flows: XirrCashFlow[] = [];
    stockTransactions?.forEach((tx) =>
      flows.push({ amount: tx.type === 'credit' ? -tx.amount : tx.amount, when: new Date(tx.date) })
    );
    mutualFundsTransactionsData?.forEach((tx) =>
      flows.push({ amount: tx.type === 'credit' ? -tx.amount : tx.amount, when: new Date(tx.date) })
    );
    goldTransactions?.forEach((tx) =>
      flows.push({ amount: tx.type === 'credit' ? -tx.amount : tx.amount, when: new Date(tx.date) })
    );
    cryptoTransactions?.forEach((tx) =>
      flows.push({ amount: tx.type === 'credit' ? -tx.amount : tx.amount, when: new Date(tx.date) })
    );
    epfData?.forEach((epf, index) => {
      const epfStart = new Date(epf.startDate);
      const nextDate =
        index < epfData.length - 1 ? new Date(epfData[index + 1].startDate) : new Date();
      const monthsDiff = differenceInMonths(nextDate, epfStart);
      for (let i = 0; i < monthsDiff; i++) {
        const d = new Date(epfStart);
        d.setMonth(d.getMonth() + i);
        d.setDate(epf.creditDay);
        if (d <= new Date()) flows.push({ amount: -epf.epfAmount, when: d });
      }
    });
    fdData?.forEach((fd) =>
      flows.push({ amount: -fd.amountInvested, when: new Date(fd.dateOfCreation) })
    );
    rdData?.forEach((rd) =>
      flows.push({ amount: -rd.amountInvested, when: new Date(rd.dateOfCreation) })
    );
    if (portfolioSummary.total.currentValue > 0)
      flows.push({ amount: portfolioSummary.total.currentValue, when: new Date() });
    return calcXirr(flows);
  }, [
    stockTransactions,
    mutualFundsTransactionsData,
    goldTransactions,
    cryptoTransactions,
    epfData,
    fdData,
    rdData,
    portfolioSummary.total.currentValue,
  ]);

  // ===== AI PROMPT =====
  const aiPrompt = useMemo(
    () =>
      buildAIInsightPrompt({
        userName: user?.name ?? 'Investor',
        asOf: new Date(),
        total: {
          invested: portfolioSummary.total.invested,
          currentValue: portfolioSummary.total.currentValue,
          pnl: portfolioSummary.total.profitLoss,
          pnlPct: portfolioSummary.total.profitLossPercentage,
          xirr: overallXirr,
        },
        stocks: {
          ...portfolioSummary.stocks,
          xirr: stockXirr,
          holdings: stockPortfolioData.map((s) => ({
            name: s.stockName,
            shares: s.numOfShares,
            avgCost: Number(s.avgPrice),
            currentPrice: s.currentPrice,
            currentValue: s.currentValuation,
            invested: s.investedAmount,
            pnl: s.profitLoss,
            pnlPct: s.profitLossPercentage,
            dataOk: s.isDataAvailable,
          })),
        },
        mutualFunds: {
          ...portfolioSummary.mutualFunds,
          xirr: mfXirr,
          holdings: mfPortfolioData.map((f) => ({
            name: f.fundName,
            units: f.totalUnits,
            invested: f.totalInvested,
            currentNav: f.currentNav ?? null,
            currentValue: f.currentValue ?? null,
            pnl: f.profitLoss ?? null,
            pnlPct: f.profitLossPercentage ?? null,
          })),
        },
        gold: {
          ...portfolioSummary.gold,
          xirr: goldXirr,
          currentRatePerGram: goldPortfolioData[0]?.currentGoldRate ?? null,
        },
        crypto: {
          ...portfolioSummary.crypto,
          xirr: cryptoXirr,
          coins: cryptoPortfolioData.map((c) => ({
            name: c.coinName,
            symbol: c.currency,
            units: c.balance,
            invested: c.investedAmount,
            currentPrice: c.currentPrice,
            currentValue: c.currentValue,
            pnl: c.profitLoss,
            pnlPct: c.profitLossPercentage,
          })),
        },
        epf: {
          invested: portfolioSummary.epf.invested,
          currentValue: portfolioSummary.epf.currentValue,
          monthlyContribution: portfolioSummary.epf.monthlyContribution,
          annualContribution: portfolioSummary.epf.annualContribution,
        },
        fd: {
          invested: portfolioSummary.fd.invested,
          currentValue: portfolioSummary.fd.currentValue,
          pnl: portfolioSummary.fd.profitLoss,
          pnlPct: portfolioSummary.fd.profitLossPercentage,
          list: fdData ?? [],
        },
        rd: {
          invested: portfolioSummary.rd.invested,
          currentValue: portfolioSummary.rd.currentValue,
          pnl: portfolioSummary.rd.profitLoss,
          pnlPct: portfolioSummary.rd.profitLossPercentage,
          list: rdData ?? [],
        },
      }),
    [
      user?.name,
      portfolioSummary,
      stockPortfolioData,
      mfPortfolioData,
      goldPortfolioData,
      cryptoPortfolioData,
      fdData,
      rdData,
      stockXirr,
      mfXirr,
      goldXirr,
      cryptoXirr,
      overallXirr,
    ]
  );

  // ===== CHART DATA =====
  const polarCategories = ['Stocks', 'Mutual Funds', 'Gold', 'Crypto', 'EPF', 'FD', 'RD'];
  const investedData = [
    portfolioSummary.stocks.invested,
    portfolioSummary.mutualFunds.invested,
    portfolioSummary.gold.invested,
    portfolioSummary.crypto.invested,
    portfolioSummary.epf.invested,
    portfolioSummary.fd.invested,
    portfolioSummary.rd.invested,
  ];
  const currentValueData = [
    portfolioSummary.stocks.currentValue,
    portfolioSummary.mutualFunds.currentValue,
    portfolioSummary.gold.currentValue,
    portfolioSummary.crypto.currentValue,
    portfolioSummary.epf.currentValue,
    portfolioSummary.fd.currentValue,
    portfolioSummary.rd.currentValue,
  ];

  const isLoading =
    stocksPortfolioLoading ||
    mfInfoLoading ||
    mfTransactionsLoading ||
    navHistoryLoading ||
    goldTransactionsLoading ||
    goldRatesLoading ||
    cryptoTransactionsLoading ||
    cryptoPricesLoading ||
    epfLoading ||
    epfTimelineLoading ||
    fdLoading ||
    rdLoading;

  return {
    userName: user?.name,
    cgData,
    stockPortfolioData,
    stockTransactions,
    mfPortfolioData,
    goldPortfolioData,
    cryptoPortfolioData,
    epfData,
    epfPortfolioData,
    fdData,
    rdData,
    portfolioSummary,
    stockXirr,
    mfXirr,
    goldXirr,
    cryptoXirr,
    overallXirr,
    polarCategories,
    investedData,
    currentValueData,
    isLoading,
    aiPrompt,
  };
}
