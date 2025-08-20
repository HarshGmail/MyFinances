import { useMemo } from 'react';
import _ from 'lodash';
import {
  useCryptoTransactionsQuery,
  useCryptoCoinPricesQuery,
  useGoldTransactionsQuery,
  useSafeGoldRatesQuery,
  useMutualFundTransactionsQuery,
  useMutualFundInfoFetchQuery,
  useMfapiNavHistoryBatchQuery,
  useStockTransactionsQuery,
  useNseQuoteQuery,
} from '@/api/query';
import {
  OwnedCoin,
  OwnedMutualFund,
  GoldPortfolioData,
  MutualFundPortfolioData,
  PortfolioMetrics,
  OwnedStock,
} from './types';

export const usePipData = (selectedCoins: string[], selectedStocks: string[] = []) => {
  // Crypto data queries
  const { data: cryptoTransactions, isLoading: transactionsLoading } = useCryptoTransactionsQuery();

  // Gold data queries
  const { data: goldTransactions, isLoading: goldTransactionsLoading } = useGoldTransactionsQuery();

  // Get current gold rates (last 24 hours)
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: goldRatesData, isLoading: goldRatesLoading } = useSafeGoldRatesQuery({
    startDate,
    endDate,
  });

  // Mutual Funds data queries
  const { data: mutualFundsTransactionsData, isLoading: mfTransactionsLoading } =
    useMutualFundTransactionsQuery();
  const { data: mfInfoData, isLoading: mfInfoLoading } = useMutualFundInfoFetchQuery();

  // Calculate crypto invested map
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

  // Calculate owned coins
  const ownedCoins: OwnedCoin[] = useMemo(() => {
    return Object.entries(cryptoInvestedMap)
      .filter(([, v]) => v.units > 0)
      .map(([symbol, data]) => ({
        symbol,
        name: data.coinName,
        units: data.units,
        invested: data.invested,
      }));
  }, [cryptoInvestedMap]);

  // Calculate mutual funds grouping
  const mfGrouped = useMemo(() => {
    if (!mutualFundsTransactionsData) return {};
    return _.groupBy(mutualFundsTransactionsData, 'fundName');
  }, [mutualFundsTransactionsData]);

  // Calculate owned mutual funds
  const ownedMutualFunds: OwnedMutualFund[] = useMemo(() => {
    if (!mutualFundsTransactionsData || !mfInfoData) return [];
    return Object.entries(mfGrouped)
      .map(([fundName, txs]) => {
        const totalUnits = txs.reduce((sum, tx) => sum + tx.numOfUnits, 0);
        const totalInvested = txs.reduce((sum, tx) => sum + tx.amount, 0);
        const info = mfInfoData.find((info) => info.fundName === fundName);

        return {
          fundName,
          schemeNumber: info?.schemeNumber || null,
          totalUnits,
          totalInvested,
        };
      })
      .filter((fund) => fund.totalUnits > 0);
  }, [mfGrouped, mfInfoData, mutualFundsTransactionsData]);

  // Get scheme numbers for NAV fetching
  const schemeNumbers = useMemo(() => {
    const ownedSchemes = ownedMutualFunds.map((fund) => fund.schemeNumber).filter(Boolean);
    return [...new Set(ownedSchemes)];
  }, [ownedMutualFunds]);

  const { data: navHistoryBatch, isLoading: navHistoryLoading } =
    // @ts-expect-error to be fixed
    useMfapiNavHistoryBatchQuery(schemeNumbers);

  // Calculate mutual fund portfolio data
  const mfPortfolioData: MutualFundPortfolioData[] = useMemo(() => {
    if (!navHistoryBatch || !ownedMutualFunds.length) return [];

    return ownedMutualFunds.map((fund) => {
      const navData = navHistoryBatch[fund.schemeNumber || ''];
      const currentNav = navData?.data?.[0]?.nav ? parseFloat(navData.data[0].nav) : null;
      const currentValue = currentNav ? fund.totalUnits * currentNav : null;
      const profitLoss = currentValue ? currentValue - fund.totalInvested : null;
      const profitLossPercentage =
        profitLoss && fund.totalInvested > 0 ? (profitLoss / fund.totalInvested) * 100 : null;

      return {
        ...fund,
        currentNav,
        currentValue,
        profitLoss,
        profitLossPercentage,
      };
    });
  }, [ownedMutualFunds, navHistoryBatch]);

  // Calculate Stocks data
  const { data: stockTransactions, isLoading: stockTxLoading } = useStockTransactionsQuery();

  const ownedStocks: OwnedStock[] = useMemo(() => {
    if (!stockTransactions) return [];
    const grouped = _.groupBy(stockTransactions, 'stockName'); // base symbol stored as stockName
    return Object.entries(grouped)
      .map(([symbol, txs]) => {
        // credit = buy (+), debit = sell (-)
        const shares = (txs as typeof stockTransactions).reduce((sum, tx) => {
          const q = tx.numOfShares ?? 0;
          return sum + (tx.type === 'credit' ? q : -q);
        }, 0);
        return { symbol: symbol.toUpperCase(), shares };
      })
      .filter((row) => row.shares > 0);
  }, [stockTransactions]);

  // Symbols to quote = owned + selected
  const allStockSymbols = useMemo(() => {
    const owned = ownedStocks.map((s) => s.symbol);
    const selected = (selectedStocks || []).map((s) => s.toUpperCase());
    return [...new Set([...owned, ...selected])];
  }, [ownedStocks, selectedStocks]);

  // Current prices map { [symbol]: price }
  const { data: nseQuoteData, isLoading: stockQuoteLoading } = useNseQuoteQuery(allStockSymbols);

  const stockPrices: Record<string, number | null> = useMemo(() => {
    const map: Record<string, number | null> = {};
    if (nseQuoteData) {
      allStockSymbols.forEach((sym) => {
        const d = nseQuoteData[sym];
        const price = d?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
        map[sym] = typeof price === 'number' ? price : null;
      });
    }
    return map;
  }, [nseQuoteData, allStockSymbols]);

  // Calculate gold portfolio data
  const goldPortfolioData: GoldPortfolioData | null = useMemo(() => {
    if (!goldTransactions) return null;

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

    return {
      totalGold,
      totalInvested,
      currentValue,
      profitLoss,
      profitLossPercentage,
      currentGoldRate,
    };
  }, [goldTransactions, goldRatesData]);

  // Get all coins for price fetching (owned + selected)
  const allCoinsToFetch = useMemo(() => {
    const ownedSymbols = ownedCoins.map((coin) => coin.symbol);
    return [...new Set([...ownedSymbols, ...selectedCoins])];
  }, [ownedCoins, selectedCoins]);

  const { data: coinPrices, isLoading: pricesLoading } = useCryptoCoinPricesQuery(allCoinsToFetch);

  // Calculate crypto portfolio metrics
  const cryptoPortfolioMetrics: PortfolioMetrics | null = useMemo(() => {
    if (!coinPrices?.data) return null;

    let totalInvested = 0;
    let totalCurrentValue = 0;

    ownedCoins.forEach((coin) => {
      const currentPrice = coinPrices.data[coin.symbol] || 0;
      const currentValue = coin.units * currentPrice;

      totalInvested += coin.invested;
      totalCurrentValue += currentValue;
    });

    const profitLoss = totalCurrentValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalCurrentValue,
      profitLoss,
      profitLossPercentage,
    };
  }, [ownedCoins, coinPrices]);

  // Calculate mutual fund portfolio metrics
  const mfPortfolioMetrics: PortfolioMetrics | null = useMemo(() => {
    if (!mfPortfolioData.length) return null;

    let totalInvested = 0;
    let totalCurrentValue = 0;

    mfPortfolioData.forEach((fund) => {
      totalInvested += fund.totalInvested;
      if (fund.currentValue) {
        totalCurrentValue += fund.currentValue;
      }
    });

    const profitLoss = totalCurrentValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalCurrentValue,
      profitLoss,
      profitLossPercentage,
    };
  }, [mfPortfolioData]);

  const isLoading =
    transactionsLoading ||
    goldTransactionsLoading ||
    mfTransactionsLoading ||
    mfInfoLoading ||
    stockTxLoading;
  const isPricesLoading =
    pricesLoading || goldRatesLoading || navHistoryLoading || stockQuoteLoading;

  return {
    // Data
    ownedCoins,
    ownedMutualFunds,
    goldPortfolioData,
    mfPortfolioData,
    coinPrices,
    cryptoPortfolioMetrics,
    mfPortfolioMetrics,
    ownedStocks,
    stockPrices,

    // Loading states
    isLoading,
    isPricesLoading,
  };
};
