'use client';

import { useAppStore } from '@/store/useAppStore';
import { useMemo } from 'react';
import {
  useMutualFundTransactionsQuery,
  useSafeGoldRatesQuery,
  useGoldTransactionsQuery,
  useCryptoTransactionsQuery,
  useCryptoCoinPricesQuery,
  useMutualFundInfoFetchQuery,
  useMfapiNavHistoryBatchQuery,
  useStockTransactionsQuery,
  useNseQuoteQuery,
  useEpfQuery,
  useEpfTimelineQuery,
  useFixedDepositsQuery,
  useRecurringDepositsQuery,
} from '@/api/query';
import { Skeleton } from '@/components/ui/skeleton';
import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import { Card } from '@/components/ui/card';
import _ from 'lodash';
import xirr, { XirrTransaction as XirrCashFlow } from '@/utils/xirr';
import { formatCurrency, formatToPercentage, formatToTwoDecimals } from '@/utils/numbers';
import dynamic from 'next/dynamic';
import { getProfitLossColor } from '@/utils/text';
import { differenceInDays, differenceInMonths } from 'date-fns';

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
    const monthlyRate = rate / 1200;
    amount = amount * (1 + monthlyRate * remainingMonths);
  }

  return amount - principal;
};

export default function Home() {
  const user = useAppStore((state) => state.user);

  // ===== STOCKS DATA =====
  const { data: stockTransactions, isLoading: stockTransactionsLoading } =
    useStockTransactionsQuery();
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

  const stockGroupedRows = useMemo(() => {
    if (!stockTransactions) return [];
    const grouped = _.groupBy(stockTransactions, 'stockName');
    return Object.entries(grouped).map(([stockName, group]) => {
      const txs = group as typeof stockTransactions;
      const totalShares = txs.reduce(
        (sum: number, tx: (typeof txs)[0]) => sum + (tx.numOfShares ?? 0),
        0
      );
      const totalAmount = txs.reduce(
        (sum: number, tx: (typeof txs)[0]) => sum + (tx.amount ?? 0),
        0
      );
      const avgAmount = totalShares > 0 ? formatToTwoDecimals(totalAmount / totalShares) : 0;
      return {
        stockName,
        numOfShares: totalShares,
        avgPrice: avgAmount.toFixed(2),
      };
    });
  }, [stockTransactions]);

  // Fetch NSE data for stocks
  const stockNames = stockGroupedRows.map((row) => row.stockName).filter(Boolean);
  const { data: nseQuoteData, isLoading: nseQuoteLoading } = useNseQuoteQuery(stockNames);

  // Process stock portfolio data
  const stockPortfolioData = useMemo(() => {
    if (!stockGroupedRows.length) return [];

    return stockGroupedRows.map((row) => {
      const stockData = nseQuoteData?.[row.stockName];
      const currentPrice = stockData?.chart?.result?.[0]?.meta?.regularMarketPrice;
      const currentValuation = currentPrice ? currentPrice * row.numOfShares : 0;
      const investedAmount = parseFloat(row.avgPrice) * row.numOfShares;
      const profitLoss = currentValuation - investedAmount;
      const profitLossPercentage =
        investedAmount > 0 ? formatToPercentage(profitLoss, investedAmount) : 0;

      return {
        ...row,
        currentPrice: currentPrice || 0,
        currentValuation,
        investedAmount,
        profitLoss,
        profitLossPercentage,
        isDataAvailable: !!currentPrice,
      };
    });
  }, [stockGroupedRows, nseQuoteData]);

  // ===== MUTUAL FUNDS DATA =====
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
      if (navData && navData.data && navData.data.length > 0) {
        map[schemeNumber] = {
          nav: parseFloat(navData.data[0].nav),
          navDate: navData.data[0].date,
        };
      } else {
        map[schemeNumber] = null;
      }
    });
    return map;
  }, [schemeNumbers, navHistoryBatch]);

  const mfGrouped = useMemo(() => {
    if (!mutualFundsTransactionsData) return {};
    return _.groupBy(mutualFundsTransactionsData, 'fundName');
  }, [mutualFundsTransactionsData]);

  const mfPortfolioData = useMemo(() => {
    if (!mutualFundsTransactionsData || !mfInfoData) return [];
    return Object.entries(mfGrouped).map(([fundName, txs]) => {
      const totalUnits = txs.reduce((sum, tx) => sum + tx.numOfUnits, 0);
      const totalInvested = txs.reduce((sum, tx) => sum + tx.amount, 0);
      const info = mfInfoData.find((info) => info.fundName === fundName);
      const schemeNumber = info?.schemeNumber;
      const navInfo = schemeNumber ? navDataMap[schemeNumber] : null;
      const currentNav = navInfo ? navInfo.nav : null;
      const currentValue = currentNav !== null ? totalUnits * currentNav : null;
      const profitLoss = currentValue !== null ? currentValue - totalInvested : null;
      const profitLossPercentage =
        profitLoss !== null && totalInvested > 0 ? (profitLoss / totalInvested) * 100 : null;

      return {
        fundName,
        totalUnits,
        totalInvested,
        currentNav,
        currentValue,
        profitLoss,
        profitLossPercentage,
      };
    });
  }, [mfGrouped, mfInfoData, mutualFundsTransactionsData, navDataMap]);

  // ===== GOLD DATA =====
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: goldRatesData, isLoading: goldRatesLoading } = useSafeGoldRatesQuery({
    startDate,
    endDate,
  });

  // Gold portfolio calculations
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
    if (goldRatesData?.data && goldRatesData.data.length > 0) {
      currentGoldRate = parseFloat(goldRatesData.data[goldRatesData.data.length - 1].rate);
    }

    const currentValue = totalGold * currentGoldRate;
    const profitLoss = currentValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return [
      {
        totalGold,
        totalInvested,
        currentValue,
        profitLoss,
        profitLossPercentage,
        currentGoldRate,
      },
    ];
  }, [goldTransactions, goldRatesData]);

  // ===== CRYPTO DATA =====
  const cryptoInvestedMap = useMemo(() => {
    if (!cryptoTransactions) return {};
    const grouped = _.groupBy(
      cryptoTransactions,
      (tx) => tx.coinSymbol?.toUpperCase() || tx.coinName?.toUpperCase()
    );
    const map: Record<string, { invested: number; units: number; coinName: string }> = {};
    Object.entries(grouped).forEach(([symbol, txs]) => {
      let invested = 0;
      let units = 0;
      let coinName = '';
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

  const cryptoPortfolioData = useMemo(() => {
    if (!coinPrices?.data) return [];

    const portfolioItems: CryptoPortfolioItem[] = [];

    validCoins.forEach((coinSymbol) => {
      const coinName = cryptoInvestedMap[coinSymbol]?.coinName;
      const currentPrice = coinPrices.data[coinSymbol] || 0;
      const investedAmount = cryptoInvestedMap[coinSymbol]?.invested || 0;
      const units = cryptoInvestedMap[coinSymbol]?.units || 0;
      const currentValue = units * (currentPrice || 0);
      const profitLoss = currentValue - investedAmount;
      const profitLossPercentage = investedAmount > 0 ? (profitLoss / investedAmount) * 100 : 0;

      portfolioItems.push({
        coinName,
        currency: coinSymbol,
        balance: units,
        currentPrice: currentPrice,
        investedAmount: investedAmount,
        currentValue: currentValue,
        profitLoss: profitLoss,
        profitLossPercentage: profitLossPercentage,
      });
    });

    return portfolioItems;
  }, [coinPrices, cryptoInvestedMap, validCoins]);

  // ===== EPF DATA =====
  const epfPortfolioData = useMemo(() => {
    if (!epfTimelineData)
      return { invested: 0, currentValue: 0, profitLoss: 0, profitLossPercentage: 0 };

    const invested = epfTimelineData.totalCurrentBalance || 0;
    const currentValue = invested; // For EPF, current value is the balance
    const profitLoss = 0; // EPF doesn't show profit/loss in the same way
    const profitLossPercentage = 0;

    return { invested, currentValue, profitLoss, profitLossPercentage };
  }, [epfTimelineData]);

  // ===== NEW FD DATA PROCESSING =====
  const fdPortfolioData = useMemo(() => {
    if (!fdData || fdData.length === 0)
      return { invested: 0, currentValue: 0, profitLoss: 0, profitLossPercentage: 0 };

    const processedFDs = fdData.map((fd) => {
      const creationDate = new Date(fd.dateOfCreation);
      const maturityDate = new Date(fd.dateOfMaturity);
      const currentDate = new Date();

      const totalDays = differenceInDays(maturityDate, creationDate);
      const daysCompleted = Math.min(differenceInDays(currentDate, creationDate), totalDays);

      const annualRate = fd.rateOfInterest / 100;
      const currentInterest = (fd.amountInvested * annualRate * daysCompleted) / 365;
      const currentValue = fd.amountInvested + currentInterest;

      return {
        ...fd,
        currentValue,
        currentInterest,
      };
    });

    const totalInvested = processedFDs.reduce((sum, fd) => sum + fd.amountInvested, 0);
    const totalCurrentValue = processedFDs.reduce((sum, fd) => sum + fd.currentValue, 0);
    const totalProfitLoss = totalCurrentValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    return {
      invested: totalInvested,
      currentValue: totalCurrentValue,
      profitLoss: totalProfitLoss,
      profitLossPercentage,
    };
  }, [fdData]);

  // ===== NEW RD DATA PROCESSING =====
  const rdPortfolioData = useMemo(() => {
    if (!rdData || rdData.length === 0)
      return { invested: 0, currentValue: 0, profitLoss: 0, profitLossPercentage: 0 };

    const processedRDs = rdData.map((rd) => {
      const creationDate = new Date(rd.dateOfCreation);
      const maturityDate = new Date(rd.dateOfMaturity);
      const currentDate = new Date();

      const totalMonths = differenceInMonths(maturityDate, creationDate);
      const monthsCompleted = Math.min(differenceInMonths(currentDate, creationDate), totalMonths);

      const currentInterest = calculateCompoundInterest(
        rd.amountInvested,
        rd.rateOfInterest,
        monthsCompleted
      );
      const currentValue = rd.amountInvested + currentInterest;

      return {
        ...rd,
        currentValue,
        currentInterest,
      };
    });

    const totalInvested = processedRDs.reduce((sum, rd) => sum + rd.amountInvested, 0);
    const totalCurrentValue = processedRDs.reduce((sum, rd) => sum + rd.currentValue, 0);
    const totalProfitLoss = totalCurrentValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    return {
      invested: totalInvested,
      currentValue: totalCurrentValue,
      profitLoss: totalProfitLoss,
      profitLossPercentage,
    };
  }, [rdData]);

  // ===== AGGREGATE PORTFOLIO SUMMARY =====
  const portfolioSummary = useMemo(() => {
    // Stocks summary
    const stockTotalInvested = stockPortfolioData.reduce(
      (sum, stock) => sum + stock.investedAmount,
      0
    );
    const stockTotalCurrentValue = stockPortfolioData.reduce(
      (sum, stock) => sum + stock.currentValuation,
      0
    );
    const stockTotalProfitLoss = stockTotalCurrentValue - stockTotalInvested;

    // Mutual funds summary
    const mfTotalInvested = mfPortfolioData.reduce((sum, fund) => sum + fund.totalInvested, 0);
    const mfTotalCurrentValue = mfPortfolioData.reduce(
      (sum, fund) => sum + (fund.currentValue ?? 0),
      0
    );
    const mfTotalProfitLoss = mfTotalCurrentValue - mfTotalInvested;

    // Gold summary
    const goldTotalInvested = goldPortfolioData.reduce((sum, gold) => sum + gold.totalInvested, 0);
    const goldTotalCurrentValue = goldPortfolioData.reduce(
      (sum, gold) => sum + gold.currentValue,
      0
    );
    const goldTotalProfitLoss = goldTotalCurrentValue - goldTotalInvested;

    // Crypto summary
    const cryptoTotalInvested = cryptoPortfolioData.reduce(
      (sum, coin) => sum + coin.investedAmount,
      0
    );
    const cryptoTotalCurrentValue = cryptoPortfolioData.reduce(
      (sum, coin) => sum + coin.currentValue,
      0
    );
    const cryptoTotalProfitLoss = cryptoTotalCurrentValue - cryptoTotalInvested;

    // Overall totals
    const totalInvested =
      stockTotalInvested +
      mfTotalInvested +
      goldTotalInvested +
      cryptoTotalInvested +
      epfPortfolioData.invested +
      fdPortfolioData.invested +
      rdPortfolioData.invested;

    const totalCurrentValue =
      stockTotalCurrentValue +
      mfTotalCurrentValue +
      goldTotalCurrentValue +
      cryptoTotalCurrentValue +
      epfPortfolioData.currentValue +
      fdPortfolioData.currentValue +
      rdPortfolioData.currentValue;

    const totalProfitLoss = totalCurrentValue - totalInvested;
    const totalProfitLossPercentage =
      totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    return {
      stocks: {
        invested: stockTotalInvested,
        currentValue: stockTotalCurrentValue,
        profitLoss: stockTotalProfitLoss,
        profitLossPercentage:
          stockTotalInvested > 0 ? (stockTotalProfitLoss / stockTotalInvested) * 100 : 0,
      },
      mutualFunds: {
        invested: mfTotalInvested,
        currentValue: mfTotalCurrentValue,
        profitLoss: mfTotalProfitLoss,
        profitLossPercentage: mfTotalInvested > 0 ? (mfTotalProfitLoss / mfTotalInvested) * 100 : 0,
      },
      gold: {
        invested: goldTotalInvested,
        currentValue: goldTotalCurrentValue,
        profitLoss: goldTotalProfitLoss,
        profitLossPercentage:
          goldTotalInvested > 0 ? (goldTotalProfitLoss / goldTotalInvested) * 100 : 0,
      },
      crypto: {
        invested: cryptoTotalInvested,
        currentValue: cryptoTotalCurrentValue,
        profitLoss: cryptoTotalProfitLoss,
        profitLossPercentage:
          cryptoTotalInvested > 0 ? (cryptoTotalProfitLoss / cryptoTotalInvested) * 100 : 0,
      },
      epf: epfPortfolioData,
      fd: fdPortfolioData,
      rd: rdPortfolioData,
      total: {
        invested: totalInvested,
        currentValue: totalCurrentValue,
        profitLoss: totalProfitLoss,
        profitLossPercentage: totalProfitLossPercentage,
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

  // ===== XIRR CALCULATIONS =====
  const stockXirr = useMemo(() => {
    if (!stockTransactions || stockPortfolioData.length === 0) return null;
    const cashFlows: XirrCashFlow[] = stockTransactions.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
    const stockCurrentValue = stockPortfolioData.reduce(
      (sum, stock) => sum + stock.currentValuation,
      0
    );
    if (stockCurrentValue > 0) {
      cashFlows.push({ amount: stockCurrentValue, when: new Date() });
    }
    try {
      return xirr(cashFlows) * 100;
    } catch {
      return null;
    }
  }, [stockTransactions, stockPortfolioData]);

  const mfXirr = useMemo(() => {
    if (!mutualFundsTransactionsData || mfPortfolioData.length === 0) return null;
    const cashFlows: XirrCashFlow[] = mutualFundsTransactionsData.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
    const mfCurrentValue = mfPortfolioData.reduce((sum, fund) => sum + (fund.currentValue ?? 0), 0);
    if (mfCurrentValue > 0) {
      cashFlows.push({ amount: mfCurrentValue, when: new Date() });
    }
    try {
      return xirr(cashFlows) * 100;
    } catch {
      return null;
    }
  }, [mutualFundsTransactionsData, mfPortfolioData]);

  const goldXirr = useMemo(() => {
    if (!goldTransactions || goldPortfolioData.length === 0) return null;
    const cashFlows: XirrCashFlow[] = goldTransactions.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
    const goldCurrentValue = goldPortfolioData.reduce((sum, gold) => sum + gold.currentValue, 0);
    if (goldCurrentValue > 0) {
      cashFlows.push({ amount: goldCurrentValue, when: new Date() });
    }
    try {
      return xirr(cashFlows) * 100;
    } catch {
      return null;
    }
  }, [goldTransactions, goldPortfolioData]);

  const cryptoXirr = useMemo(() => {
    if (!cryptoTransactions || cryptoPortfolioData.length === 0) return null;
    const cashFlows: XirrCashFlow[] = cryptoTransactions.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
    const cryptoCurrentValue = cryptoPortfolioData.reduce(
      (sum, coin) => sum + coin.currentValue,
      0
    );
    if (cryptoCurrentValue > 0) {
      cashFlows.push({ amount: cryptoCurrentValue, when: new Date() });
    }
    try {
      return xirr(cashFlows) * 100;
    } catch {
      return null;
    }
  }, [cryptoTransactions, cryptoPortfolioData]);

  // ===== OVERALL XIRR CALCULATION =====
  const overallXirr = useMemo(() => {
    const allCashFlows: XirrCashFlow[] = [];

    // Add stock transactions
    if (stockTransactions) {
      stockTransactions.forEach((tx) => {
        allCashFlows.push({
          amount: tx.type === 'credit' ? -tx.amount : tx.amount,
          when: new Date(tx.date),
        });
      });
    }

    // Add mutual fund transactions
    if (mutualFundsTransactionsData) {
      mutualFundsTransactionsData.forEach((tx) => {
        allCashFlows.push({
          amount: tx.type === 'credit' ? -tx.amount : tx.amount,
          when: new Date(tx.date),
        });
      });
    }

    // Add gold transactions
    if (goldTransactions) {
      goldTransactions.forEach((tx) => {
        allCashFlows.push({
          amount: tx.type === 'credit' ? -tx.amount : tx.amount,
          when: new Date(tx.date),
        });
      });
    }

    // Add crypto transactions
    if (cryptoTransactions) {
      cryptoTransactions.forEach((tx) => {
        allCashFlows.push({
          amount: tx.type === 'credit' ? -tx.amount : tx.amount,
          when: new Date(tx.date),
        });
      });
    }

    // Add EPF as negative cash flows (contributions)
    if (epfData) {
      epfData.forEach((epf, index) => {
        const startDate = new Date(epf.startDate);
        const currentDate = new Date();

        // Determine the end date for this EPF entry
        const nextStartDate =
          index < epfData.length - 1 ? new Date(epfData[index + 1].startDate) : currentDate;

        // Calculate months difference between startDate and nextStartDate/currentDate
        const monthsDiff = differenceInMonths(nextStartDate, startDate);

        for (let i = 0; i < monthsDiff; i++) {
          const contributionDate = new Date(startDate);
          contributionDate.setMonth(contributionDate.getMonth() + i);
          contributionDate.setDate(epf.creditDay); // Use credit day from entry

          if (contributionDate <= currentDate) {
            allCashFlows.push({
              amount: -epf.epfAmount, // Negative because it's an investment
              when: contributionDate,
            });
          }
        }
      });
    }

    // Add FD transactions
    if (fdData) {
      fdData.forEach((fd) => {
        allCashFlows.push({
          amount: -fd.amountInvested, // Negative because it's an investment
          when: new Date(fd.dateOfCreation),
        });
      });
    }

    // Add RD transactions
    if (rdData) {
      rdData.forEach((rd) => {
        allCashFlows.push({
          amount: -rd.amountInvested, // Negative because it's an investment
          when: new Date(rd.dateOfCreation),
        });
      });
    }

    // Add current portfolio value as final positive cash flow
    if (portfolioSummary.total.currentValue > 0) {
      allCashFlows.push({
        amount: portfolioSummary.total.currentValue,
        when: new Date(),
      });
    }

    // Calculate XIRR
    if (allCashFlows.length > 1) {
      try {
        return xirr(allCashFlows) * 100;
      } catch {
        return null;
      }
    }

    return null;
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

  const Chart = dynamic(() => import('./Chart'), { ssr: false });

  // Prepare data for chart
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

  // Loading states
  const isLoading =
    stockTransactionsLoading ||
    nseQuoteLoading ||
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

  if (isLoading) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-6 text-center">Portfolio Dashboard</h2>
        {/* Top: Summary Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <Skeleton className="w-full h-[120px]" />
          <Skeleton className="w-full h-[120px]" />
          <Skeleton className="w-full h-[120px]" />
          <Skeleton className="w-full h-[120px]" />
        </div>
        {/* Below: Chart and Portfolio Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="flex items-stretch">
            <Skeleton className="w-full h-[420px]" />
          </div>
          <div className="flex flex-col gap-6">
            <Skeleton className="w-full h-[200px]" />
            <Skeleton className="w-full h-[200px]" />
          </div>
          <div className="flex flex-col gap-6">
            <Skeleton className="w-full h-[200px]" />
            <Skeleton className="w-full h-[200px]" />
          </div>
        </div>
        {/* New Row: EPF, FD, RD Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Skeleton className="w-full h-[200px]" />
          <Skeleton className="w-full h-[200px]" />
          <Skeleton className="w-full h-[200px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6 text-center">Portfolio Dashboard</h2>
      {/* Top: Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <SummaryStatCard
          label="Total Invested"
          value={formatCurrency(portfolioSummary.total.invested)}
        />
        <SummaryStatCard
          label={
            <>
              Total Current Value{' '}
              <span className={getProfitLossColor(portfolioSummary.total.profitLoss)}>
                ({formatCurrency(portfolioSummary.total.profitLoss)})
              </span>
            </>
          }
          value={
            <span className={getProfitLossColor(portfolioSummary.total.profitLoss)}>
              {formatCurrency(portfolioSummary.total.currentValue)}{' '}
            </span>
          }
          valueClassName={getProfitLossColor(portfolioSummary.total.profitLoss)}
        />
        <SummaryStatCard
          label="Total P&L %"
          value={formatToPercentage(portfolioSummary.total.profitLossPercentage)}
          valueClassName={getProfitLossColor(portfolioSummary.total.profitLoss)}
        />
        <SummaryStatCard
          label="Overall XIRR %"
          value={overallXirr !== null ? `${overallXirr.toFixed(2)}%` : 'N/A'}
          valueClassName={
            overallXirr !== null && overallXirr >= 0 ? 'text-green-600' : 'text-red-600'
          }
        />
      </div>

      {/* 3rd Row: Chart and Portfolio Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Left: Chart */}
        <div className="flex items-stretch">
          <div
            className={
              'bg-card rounded-lg p-4 w-full flex items-center justify-center h-full border shadow-sm'
            }
          >
            <Chart
              investedData={investedData}
              currentValueData={currentValueData}
              categories={polarCategories}
            />
          </div>
        </div>
        {/* Middle: Stocks & Gold */}
        <div className="flex flex-col gap-6">
          {/* Stocks Portfolio */}
          <Card className="p-6 flex-1">
            <h3 className="text-lg font-semibold mb-1">Stocks Portfolio</h3>
            {stockPortfolioData.length > 0 ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Invested:</span>
                  <span>{formatCurrency(portfolioSummary.stocks.invested)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Value:</span>
                  <span className={getProfitLossColor(portfolioSummary.stocks.profitLoss)}>
                    {formatCurrency(portfolioSummary.stocks.currentValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>P&L:</span>
                  <span className={getProfitLossColor(portfolioSummary.stocks.profitLoss)}>
                    {formatCurrency(portfolioSummary.stocks.profitLoss)} (
                    {formatToPercentage(portfolioSummary.stocks.profitLossPercentage)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>XIRR:</span>
                  <span
                    className={
                      stockXirr !== null && stockXirr >= 0 ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {stockXirr !== null ? `${stockXirr.toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                <p className="text-sm">No stock investments found</p>
              </div>
            )}
          </Card>
          {/* Gold Portfolio */}
          <Card className="p-6 flex-1">
            <h3 className="text-lg font-semibold mb-1">Gold Portfolio</h3>
            {goldPortfolioData.length > 0 && goldPortfolioData[0].totalInvested > 0 ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Invested:</span>
                  <span>{formatCurrency(portfolioSummary.gold.invested)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Value:</span>
                  <span className={getProfitLossColor(portfolioSummary.gold.profitLoss)}>
                    {formatCurrency(portfolioSummary.gold.currentValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>P&L:</span>
                  <span className={getProfitLossColor(portfolioSummary.gold.profitLoss)}>
                    {formatCurrency(portfolioSummary.gold.profitLoss)} (
                    {formatToPercentage(portfolioSummary.gold.profitLossPercentage)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>XIRR:</span>
                  <span
                    className={
                      goldXirr !== null && goldXirr >= 0 ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {goldXirr !== null ? `${goldXirr.toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                <p className="text-sm">No gold investments found</p>
              </div>
            )}
          </Card>
        </div>
        {/* Right: Mutual Funds & Crypto */}
        <div className="flex flex-col gap-6">
          {/* Mutual Funds Portfolio */}
          <Card className="p-6 flex-1">
            <h3 className="text-lg font-semibold mb-1">Mutual Funds Portfolio</h3>
            {mfPortfolioData.length > 0 ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Invested:</span>
                  <span>{formatCurrency(portfolioSummary.mutualFunds.invested)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Value:</span>
                  <span className={getProfitLossColor(portfolioSummary.mutualFunds.profitLoss)}>
                    {formatCurrency(portfolioSummary.mutualFunds.currentValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>P&L:</span>
                  <span className={getProfitLossColor(portfolioSummary.mutualFunds.profitLoss)}>
                    {formatCurrency(portfolioSummary.mutualFunds.profitLoss)} (
                    {formatToPercentage(portfolioSummary.mutualFunds.profitLossPercentage)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>XIRR:</span>
                  <span
                    className={mfXirr !== null && mfXirr >= 0 ? 'text-green-600' : 'text-red-600'}
                  >
                    {mfXirr !== null ? `${mfXirr.toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                <p className="text-sm">No mutual fund investments found</p>
              </div>
            )}
          </Card>
          {/* Crypto Portfolio */}
          <Card className="p-6 flex-1">
            <h3 className="text-lg font-semibold mb-1">Crypto Portfolio</h3>
            {cryptoPortfolioData.length > 0 ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Invested:</span>
                  <span>{formatCurrency(portfolioSummary.crypto.invested)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Value:</span>
                  <span className={getProfitLossColor(portfolioSummary.crypto.profitLoss)}>
                    {formatCurrency(portfolioSummary.crypto.currentValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>P&L:</span>
                  <span className={getProfitLossColor(portfolioSummary.crypto.profitLoss)}>
                    {formatCurrency(portfolioSummary.crypto.profitLoss)} (
                    {formatToPercentage(portfolioSummary.crypto.profitLossPercentage)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>XIRR:</span>
                  <span
                    className={
                      cryptoXirr !== null && cryptoXirr >= 0 ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {cryptoXirr !== null ? `${cryptoXirr.toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                <p className="text-sm">No crypto investments found</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 4th Row: EPF, FD, RD Portfolio Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* EPF Portfolio */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-1">EPF Portfolio</h3>
          {epfData && epfData.length > 0 ? (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Total Balance:</span>
                <span className="text-blue-600 font-medium">
                  {formatCurrency(portfolioSummary.epf.currentValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active Accounts:</span>
                <span>{epfData.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly Contribution:</span>
                <span>{formatCurrency(epfData.reduce((sum, epf) => sum + epf.epfAmount, 0))}</span>
              </div>
              <div className="flex justify-between">
                <span>Annual Contribution:</span>
                <span>
                  {formatCurrency(epfData.reduce((sum, epf) => sum + epf.epfAmount * 12, 0))}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              <p className="text-sm">No EPF accounts found</p>
            </div>
          )}
        </Card>

        {/* Fixed Deposits Portfolio */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-1">Fixed Deposits Portfolio</h3>
          {fdData && fdData.length > 0 ? (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Invested:</span>
                <span>{formatCurrency(portfolioSummary.fd.invested)}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Value:</span>
                <span className={getProfitLossColor(portfolioSummary.fd.profitLoss)}>
                  {formatCurrency(portfolioSummary.fd.currentValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Interest Earned:</span>
                <span className="text-green-600 font-medium">
                  {formatCurrency(portfolioSummary.fd.profitLoss)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active FDs:</span>
                <span>
                  {fdData.filter((fd) => new Date(fd.dateOfMaturity) > new Date()).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg Rate:</span>
                <span>
                  {fdData.length > 0
                    ? (
                        fdData.reduce((sum, fd) => sum + fd.rateOfInterest, 0) / fdData.length
                      ).toFixed(2)
                    : '0.00'}
                  %
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              <p className="text-sm">No fixed deposits found</p>
            </div>
          )}
        </Card>

        {/* Recurring Deposits Portfolio */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-1">Recurring Deposits Portfolio</h3>
          {rdData && rdData.length > 0 ? (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Invested:</span>
                <span>{formatCurrency(portfolioSummary.rd.invested)}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Value:</span>
                <span className={getProfitLossColor(portfolioSummary.rd.profitLoss)}>
                  {formatCurrency(portfolioSummary.rd.currentValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Interest Earned:</span>
                <span className="text-green-600 font-medium">
                  {formatCurrency(portfolioSummary.rd.profitLoss)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active RDs:</span>
                <span>
                  {rdData.filter((rd) => new Date(rd.dateOfMaturity) > new Date()).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg Rate:</span>
                <span>
                  {rdData.length > 0
                    ? (
                        rdData.reduce((sum, rd) => sum + rd.rateOfInterest, 0) / rdData.length
                      ).toFixed(2)
                    : '0.00'}
                  %
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              <p className="text-sm">No recurring deposits found</p>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="text-center text-muted-foreground">
        <p>Welcome back, {user?.name}! Your comprehensive portfolio overview is ready.</p>
        <p className="text-sm mt-2">
          Total Assets: {stockPortfolioData.length} Stocks • {mfPortfolioData.length} Mutual Funds •{' '}
          {goldPortfolioData.filter((g) => g.totalInvested > 0).length} Gold •{' '}
          {cryptoPortfolioData.length} Crypto • {epfData?.length || 0} EPF • {fdData?.length || 0}{' '}
          FDs • {rdData?.length || 0} RDs
        </p>
      </div>
    </div>
  );
}
