import { useEffect, useMemo, useState } from 'react';
import {
  useMutualFundTransactionsQuery,
  useMutualFundInfoFetchQuery,
  useMfapiRecentNavQuery,
  useGoldTransactionsQuery,
  useSafeGoldRatesQuery,
  useCryptoTransactionsQuery,
  useCryptoTickerChangesQuery,
} from '@/api/query';
import { useStocksPortfolioQuery } from '@/api/query/stocks';
import {
  AssetMove,
  buildCryptoMove,
  buildGoldMove,
  buildMutualFundMove,
  buildStockMove,
  combineMoves,
  topMovers,
} from '@/utils/dailyMoves';
import { groupCryptoHoldings, heldCoinSymbols } from '@/utils/cryptoHoldings';
import {
  formatIstSessionDate,
  getNseMarketStatus,
  NseMarketStatus,
  STOCK_REFRESH_MS_CLOSED,
  STOCK_REFRESH_MS_OPEN,
} from '@/utils/marketHours';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const GOLD_RATE_LOOKBACK_DAYS = 7;
const MARKET_STATUS_POLL_MS = 60 * 1000;

function useNseMarketStatus(): NseMarketStatus {
  const [status, setStatus] = useState<NseMarketStatus>(() => getNseMarketStatus());
  useEffect(() => {
    const id = setInterval(() => setStatus(getNseMarketStatus()), MARKET_STATUS_POLL_MS);
    return () => clearInterval(id);
  }, []);
  return status;
}

export function useTodayMovesData() {
  const marketStatus = useNseMarketStatus();
  const stockRefreshMs = marketStatus === 'open' ? STOCK_REFRESH_MS_OPEN : STOCK_REFRESH_MS_CLOSED;

  const stocksQuery = useStocksPortfolioQuery(false, { refetchInterval: stockRefreshMs });
  const mfTransactionsQuery = useMutualFundTransactionsQuery();
  const mfInfoQuery = useMutualFundInfoFetchQuery();
  const goldTransactionsQuery = useGoldTransactionsQuery();
  const cryptoTransactionsQuery = useCryptoTransactionsQuery();

  const schemeNumbers = useMemo(
    () => Array.from(new Set((mfInfoQuery.data ?? []).map((info) => info.schemeNumber))),
    [mfInfoQuery.data]
  );
  const recentNavQuery = useMfapiRecentNavQuery(schemeNumbers);

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - GOLD_RATE_LOOKBACK_DAYS * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
  const goldRatesQuery = useSafeGoldRatesQuery({ startDate, endDate });

  const cryptoHoldings = useMemo(
    () => groupCryptoHoldings(cryptoTransactionsQuery.data ?? []),
    [cryptoTransactionsQuery.data]
  );
  const heldCoins = useMemo(() => heldCoinSymbols(cryptoHoldings), [cryptoHoldings]);
  const tickerChangesQuery = useCryptoTickerChangesQuery(heldCoins);

  const lastTradeTime = stocksQuery.data?.summary.lastTradeTime ?? null;
  const stockSessionLabel = lastTradeTime
    ? `Session of ${formatIstSessionDate(lastTradeTime)}`
    : 'Last session';

  const moves = useMemo<AssetMove[]>(() => {
    const built: AssetMove[] = [];
    if (stocksQuery.data) built.push(buildStockMove(stocksQuery.data.portfolio, stockSessionLabel));
    if (mfTransactionsQuery.data && mfInfoQuery.data && recentNavQuery.data) {
      built.push(
        buildMutualFundMove(mfTransactionsQuery.data, mfInfoQuery.data, recentNavQuery.data)
      );
    }
    if (goldTransactionsQuery.data && goldRatesQuery.data) {
      built.push(buildGoldMove(goldTransactionsQuery.data, goldRatesQuery.data.data ?? []));
    }
    if (tickerChangesQuery.data?.data) {
      built.push(buildCryptoMove(cryptoHoldings, tickerChangesQuery.data.data));
    }
    return built.filter((move) => move.currentValue > 0);
  }, [
    stocksQuery.data,
    stockSessionLabel,
    mfTransactionsQuery.data,
    mfInfoQuery.data,
    recentNavQuery.data,
    goldTransactionsQuery.data,
    goldRatesQuery.data,
    cryptoHoldings,
    tickerChangesQuery.data,
  ]);

  const total = useMemo(() => combineMoves(moves), [moves]);
  const movers = useMemo(() => topMovers(moves), [moves]);

  const baseQueries = [
    stocksQuery,
    mfTransactionsQuery,
    mfInfoQuery,
    goldTransactionsQuery,
    cryptoTransactionsQuery,
  ];
  const priceQueries = [recentNavQuery, goldRatesQuery, tickerChangesQuery];
  const allQueries = [...baseQueries, ...priceQueries];

  const baseDataArrived = baseQueries.every((query) => query.data !== undefined);
  const navReady = schemeNumbers.length === 0 || recentNavQuery.data !== undefined;
  const goldReady = !goldTransactionsQuery.data?.length || goldRatesQuery.data !== undefined;
  const cryptoReady = heldCoins.length === 0 || tickerChangesQuery.data !== undefined;
  const isInitialLoad = !baseDataArrived || !navReady || !goldReady || !cryptoReady;

  const isRefreshing = allQueries.some((query) => query.isFetching);
  const updateTimestamps = allQueries
    .map((query) => query.dataUpdatedAt)
    .filter((timestamp) => timestamp > 0);
  const lastUpdatedAt = updateTimestamps.length ? Math.max(...updateTimestamps) : null;

  return {
    moves,
    total,
    movers,
    marketStatus,
    lastTradeTime,
    isInitialLoad,
    isRefreshing,
    lastUpdatedAt,
  };
}
