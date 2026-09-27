import { useMemo, useState } from 'react';
import { useStocksPortfolioQuery } from '../api/query/stocks';
import { useMutualFundTransactionsQuery } from '../api/query/mutual-funds';
import {
  useMfapiLatestNavQuery,
  useMutualFundInfoFetchQuery,
} from '../api/query/mutual-funds-info';
import { useCryptoCoinPricesQuery, useCryptoTransactionsQuery } from '../api/query/crypto';
import { useSafeGoldRatesQuery } from '../api/query/gold';
import { calcMFPortfolio, latestNavMap } from '../calc/portfolioCalculations';
import { groupCryptoHoldings, heldCoinSymbols, valueCryptoHoldings } from '../calc/cryptoHoldings';
import type { GoalHoldingValues } from '../calc/goals';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const GOLD_RATE_LOOKBACK_DAYS = 7;

function goldRateWindow() {
  const now = new Date();
  return {
    endDate: now.toISOString().slice(0, 10),
    startDate: new Date(now.getTime() - GOLD_RATE_LOOKBACK_DAYS * MS_PER_DAY)
      .toISOString()
      .slice(0, 10),
  };
}

export function useGoalHoldingValues() {
  const [{ startDate, endDate }] = useState(goldRateWindow);
  const stocksQuery = useStocksPortfolioQuery();
  const mfTransactionsQuery = useMutualFundTransactionsQuery();
  const mfInfoQuery = useMutualFundInfoFetchQuery();
  const cryptoTransactionsQuery = useCryptoTransactionsQuery();
  const goldRatesQuery = useSafeGoldRatesQuery({ startDate, endDate });

  const schemeNumbers = useMemo(
    () => Array.from(new Set((mfInfoQuery.data ?? []).map((info) => info.schemeNumber))),
    [mfInfoQuery.data]
  );
  const navQuery = useMfapiLatestNavQuery(schemeNumbers);
  const cryptoHoldings = useMemo(
    () => groupCryptoHoldings(cryptoTransactionsQuery.data ?? []),
    [cryptoTransactionsQuery.data]
  );
  const coinPricesQuery = useCryptoCoinPricesQuery(heldCoinSymbols(cryptoHoldings));

  const values = useMemo<GoalHoldingValues>(() => {
    const stockValueByName = Object.fromEntries(
      (stocksQuery.data?.portfolio ?? []).map((stock) => [stock.stockName, stock.currentValuation])
    );
    const fundValueByName = Object.fromEntries(
      calcMFPortfolio(
        mfTransactionsQuery.data ?? [],
        mfInfoQuery.data ?? [],
        latestNavMap(schemeNumbers, navQuery.data)
      ).fundData.map((fund) => [fund.fundName, fund.currentValue ?? 0])
    );
    const coinValueByName = Object.fromEntries(
      valueCryptoHoldings(cryptoHoldings, coinPricesQuery.data?.data ?? {}).map((position) => [
        position.coinName,
        position.currentValue,
      ])
    );
    const rates = goldRatesQuery.data?.data ?? [];
    return {
      stockValueByName,
      fundValueByName,
      coinValueByName,
      goldRatePerGram: rates.length ? parseFloat(rates[rates.length - 1].rate) : 0,
    };
  }, [
    stocksQuery.data,
    mfTransactionsQuery.data,
    mfInfoQuery.data,
    schemeNumbers,
    navQuery.data,
    cryptoHoldings,
    coinPricesQuery.data,
    goldRatesQuery.data,
  ]);

  const isLoading = stocksQuery.isLoading || mfInfoQuery.isLoading || mfTransactionsQuery.isLoading;

  return {
    values,
    mfInfo: mfInfoQuery.data ?? [],
    stockNames: (stocksQuery.data?.portfolio ?? []).map((stock) => stock.stockName),
    coinNames: Object.values(cryptoHoldings)
      .filter((holding) => holding.units > 0)
      .map((holding) => holding.coinName),
    isLoading,
  };
}
