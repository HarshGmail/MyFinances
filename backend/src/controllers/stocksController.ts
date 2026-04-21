import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { stocksSchema } from '../schemas/stocks';
import { getUserFromRequest } from '../utils/jwtHelpers';
import { StocksService } from '../services/stocksService';
import { StockData, StockSearchResponse } from '../utils/types';
import {
  getCached,
  getCachedWithMaxAge,
  getCachedWithMaxAgeMs,
  setCache,
} from '../utils/priceCache';
import logger from '../utils/logger';

export async function addStockTransaction(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const parsed = stocksSchema.omit({ userId: true, _id: true }).parse(req.body);
    const transaction = {
      ...parsed,
      userId: new ObjectId(user.userId),
      date: new Date(parsed.date),
    };
    const db = database.getDb();
    const collection = db.collection('stocks');
    const result = await collection.insertOne(transaction);
    res.status(201).json({ success: true, message: 'Transaction added', id: result.insertedId });
  } catch (error) {
    logger.error({ err: error }, 'Add stock transaction error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getStockTransactions(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const collection = db.collection('stocks');
    const transactions = await collection.find({ userId: new ObjectId(user.userId) }).toArray();
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    logger.error({ err: error }, 'Fetch stock transactions error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function updateStockTransaction(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, message: 'Transaction ID is required' });
      return;
    }

    // Validate payload (ignore _id, userId)
    const parsed = stocksSchema.omit({ _id: true, userId: true }).parse(req.body);

    const db = database.getDb();
    const collection = db.collection('stocks');

    const result = await collection.updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(user.userId) },
      { $set: { ...parsed, date: new Date(parsed.date) } }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Transaction updated successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Update stock transaction error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteStockTransaction(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, message: 'Transaction ID is required' });
      return;
    }

    const db = database.getDb();
    const collection = db.collection('stocks');
    const result = await collection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(user.userId),
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    logger.error({ err: error }, 'Delete stock transaction error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteAllUserStockTransactions(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const result = await db.collection('stocks').deleteMany({ userId: new ObjectId(user.userId) });
    res.status(200).json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    logger.error({ err: error }, 'Delete all stock transactions error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getNSEQuote(req: Request, res: Response) {
  try {
    const symbolsParam = req.query.symbols;
    if (!symbolsParam || typeof symbolsParam !== 'string') {
      res.status(400).json({ success: false, message: 'Symbols are required' });
      return;
    }

    const symbols = symbolsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (symbols.length === 0) {
      res.status(400).json({ success: false, message: 'No valid symbols provided' });
      return;
    }

    // Fetch with MongoDB cache fallback
    const liveData = await StocksService.fetchNSEQuotes(symbols);
    const dataMap: Record<string, StockData | null> = {};

    for (const symbol of symbols) {
      const cacheKey = `stock:chart:${symbol}`;
      const liveResult = liveData[symbol];
      if (liveResult !== null) {
        dataMap[symbol] = liveResult;
        await setCache(cacheKey, liveResult);
      } else {
        const cached = await getCached<StockData>(cacheKey);
        if (cached) {
          logger.info({ symbol }, 'Serving cached stock data');
          dataMap[symbol] = cached;
        } else {
          dataMap[symbol] = null;
        }
      }
    }

    res.status(200).json({ success: true, data: dataMap });
  } catch (error) {
    logger.error({ err: error }, 'Fetch NSE quote error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function searchStocksByName(req: Request, res: Response) {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string' || query.length < 2) {
      res
        .status(400)
        .json({ message: 'Query string is required and should be at least 2 characters.' });
      return;
    }

    const cacheKey = `stock:search:${query.toLowerCase()}`;
    try {
      const results = await StocksService.searchStocks(query);
      await setCache(cacheKey, results);
      res.status(200).json({ success: true, data: results });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        const cached = await getCachedWithMaxAge<StockSearchResponse[]>(cacheKey, 1);
        logger.warn(
          { query },
          `Yahoo 429 on search — ${cached ? 'serving cache' : 'returning empty'}`
        );
        res.status(200).json({ success: true, data: cached ?? [] });
        return;
      }
      throw err;
    }
  } catch (err) {
    logger.error({ err }, 'Error searching stocks by name');
    res.status(500).json({ message: 'Failed to search stocks' });
  }
}

export async function getStocksPortfolio(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const db = database.getDb();
    const transactions = await db
      .collection('stocks')
      .find({ userId: new ObjectId(user.userId) })
      .sort({ date: 1 })
      .toArray();

    if (!transactions.length) {
      res.status(200).json({
        success: true,
        data: {
          portfolio: [],
          priceData: {},
          summary: {
            totalInvested: 0,
            totalCurrentValue: 0,
            totalProfitLoss: 0,
            totalProfitLossPercentage: 0,
            totalOneDayChange: 0,
            totalOneDayChangePercentage: 0,
          },
          transactions: [],
        },
      });
      return;
    }

    // Group transactions by stockName
    const grouped: Record<string, typeof transactions> = {};
    for (const tx of transactions) {
      const name = tx.stockName as string;
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(tx);
    }

    const stockNames = Object.keys(grouped);
    const rawPriceData = await StocksService.fetchNSEQuotes(stockNames);
    const priceData: Record<string, StockData | null> = {};
    for (const symbol of stockNames) {
      const cacheKey = `stock:chart:${symbol}`;
      const liveResult = rawPriceData[symbol];
      if (liveResult !== null) {
        priceData[symbol] = liveResult;
        await setCache(cacheKey, liveResult);
      } else {
        priceData[symbol] = (await getCached<StockData>(cacheKey)) ?? null;
      }
    }

    const portfolio = stockNames.map((stockName) => {
      const txs = grouped[stockName];
      const numOfShares = txs.reduce(
        (sum, tx) =>
          sum + (tx.type === 'credit' ? (tx.numOfShares as number) : -(tx.numOfShares as number)),
        0
      );
      const totalAmount = txs.reduce(
        (sum, tx) => sum + (tx.type === 'credit' ? (tx.amount as number) : -(tx.amount as number)),
        0
      );
      const avgPrice = numOfShares > 0 ? totalAmount / numOfShares : 0;
      const investedAmount = parseFloat((avgPrice * numOfShares).toFixed(2));

      const chartResult = priceData[stockName]?.chart?.result?.[0];
      const meta = chartResult?.meta;
      const currentPrice = meta?.regularMarketPrice ?? null;
      const closes: (number | null)[] = chartResult?.indicators?.quote?.[0]?.close ?? [];
      const lastTwoCloses = closes.filter((v) => v !== null).slice(-2);
      const previousClose =
        lastTwoCloses.length >= 2
          ? lastTwoCloses[lastTwoCloses.length - 2]
          : (meta?.regularMarketPreviousClose ?? meta?.chartPreviousClose ?? null);

      const currentValuation =
        currentPrice !== null ? parseFloat((currentPrice * numOfShares).toFixed(2)) : 0;
      const profitLoss = parseFloat((currentValuation - investedAmount).toFixed(2));
      const profitLossPercentage =
        investedAmount > 0 ? parseFloat(((profitLoss / investedAmount) * 100).toFixed(2)) : 0;

      const oneDayPriceChange =
        currentPrice !== null && previousClose !== null ? currentPrice - previousClose : 0;
      const oneDayChange = parseFloat((oneDayPriceChange * numOfShares).toFixed(2));
      const oneDayChangePercentage =
        previousClose && previousClose > 0
          ? parseFloat(((oneDayPriceChange / previousClose) * 100).toFixed(2))
          : 0;

      return {
        stockName,
        numOfShares,
        avgPrice: parseFloat(avgPrice.toFixed(2)),
        investedAmount,
        currentPrice: currentPrice ?? 0,
        previousClose: previousClose ?? 0,
        currentValuation,
        profitLoss,
        profitLossPercentage,
        oneDayChange,
        oneDayChangePercentage,
        isDataAvailable: currentPrice !== null,
      };
    });

    const totalInvested = parseFloat(
      portfolio.reduce((s, p) => s + p.investedAmount, 0).toFixed(2)
    );
    const totalCurrentValue = parseFloat(
      portfolio.reduce((s, p) => s + p.currentValuation, 0).toFixed(2)
    );
    const totalProfitLoss = parseFloat((totalCurrentValue - totalInvested).toFixed(2));
    const totalProfitLossPercentage =
      totalInvested > 0 ? parseFloat(((totalProfitLoss / totalInvested) * 100).toFixed(2)) : 0;
    const totalOneDayChange = parseFloat(
      portfolio.reduce((s, p) => s + p.oneDayChange, 0).toFixed(2)
    );
    const totalPreviousValue = portfolio.reduce((s, p) => s + p.previousClose * p.numOfShares, 0);
    const totalOneDayChangePercentage =
      totalPreviousValue > 0
        ? parseFloat(((totalOneDayChange / totalPreviousValue) * 100).toFixed(2))
        : 0;

    res.status(200).json({
      success: true,
      data: {
        portfolio,
        priceData,
        summary: {
          totalInvested,
          totalCurrentValue,
          totalProfitLoss,
          totalProfitLossPercentage,
          totalOneDayChange,
          totalOneDayChangePercentage,
        },
        transactions,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Fetch stocks portfolio error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getStockFinancials(req: Request, res: Response) {
  try {
    const { symbol } = req.query;
    if (!symbol || typeof symbol !== 'string') {
      res.status(400).json({ success: false, message: 'symbol is required' });
      return;
    }
    const cacheKey = `stock:financials:${symbol}`;
    const cached = await getCachedWithMaxAge<unknown>(cacheKey, 7);
    if (cached !== null) {
      res.status(200).json({ success: true, data: cached });
      return;
    }
    try {
      const data = await StocksService.fetchFinancials(symbol);
      const hasData = Object.values(data).some((v) => v !== null);
      if (hasData) await setCache(cacheKey, data);
      res.status(200).json({ success: true, data });
    } catch (err) {
      if ((err as { status?: number })?.status === 429) {
        const stale = await getCached<unknown>(cacheKey);
        if (stale) {
          logger.warn({ symbol }, 'Yahoo 429 on financials — serving stale cache');
          res.status(200).json({ success: true, data: stale });
          return;
        }
        logger.warn({ symbol }, 'Yahoo 429 on financials — no cache available');
        res.status(200).json({
          success: true,
          data: {
            summaryDetail: null,
            defaultKeyStatistics: null,
            financialData: null,
            price: null,
            earningsTrend: null,
          },
        });
        return;
      }
      throw err;
    }
  } catch (error) {
    logger.error({ err: error }, 'Error fetching stock financials');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getPortfolioAnalytics(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const db = database.getDb();
    const transactions = await db
      .collection('stocks')
      .find({ userId: new ObjectId(user.userId) })
      .toArray();

    const symbolSet = new Set<string>();
    for (const tx of transactions) {
      if (tx.stockName) symbolSet.add(tx.stockName as string);
    }
    const symbols = Array.from(symbolSet);

    if (symbols.length === 0) {
      res.status(200).json({ success: true, data: {} });
      return;
    }

    const results: [string, unknown][] = [];
    let prevWasYahooFetch = false;
    for (const symbol of symbols) {
      const cacheKey = `stock:financials:${symbol}`;
      const cached = await getCachedWithMaxAge<unknown>(cacheKey, 7);
      if (cached !== null) {
        results.push([symbol, cached]);
        prevWasYahooFetch = false;
      } else {
        if (prevWasYahooFetch) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        try {
          const data = await StocksService.fetchFinancials(symbol);
          const hasData = Object.values(data).some((v) => v !== null);
          if (hasData) await setCache(cacheKey, data);
          results.push([symbol, hasData ? data : ((await getCached(cacheKey)) ?? data)]);
        } catch (err) {
          if ((err as { status?: number })?.status === 429) {
            logger.warn({ symbol }, 'Yahoo 429 on portfolio analytics — using stale or null');
            results.push([symbol, (await getCached(cacheKey)) ?? null]);
          } else {
            throw err;
          }
        }
        prevWasYahooFetch = true;
      }
    }

    const data: Record<string, unknown> = Object.fromEntries(results);
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching portfolio analytics');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

const PROFILE_TTL_MS: Record<string, number> = {
  '1d': 30 * 60 * 1000, // 30 min — intraday
  '1w': 2 * 60 * 60 * 1000, // 2 h
  '1m': 4 * 60 * 60 * 1000, // 4 h
  '3m': 12 * 60 * 60 * 1000, // 12 h
  '6m': 12 * 60 * 60 * 1000,
  '1y': 24 * 60 * 60 * 1000, // 24 h
  '5y': 24 * 60 * 60 * 1000,
  max: 24 * 60 * 60 * 1000,
};

export async function getFullStockProfile(req: Request, res: Response) {
  try {
    const { symbol } = req.query;
    if (!symbol || typeof symbol !== 'string') {
      res.status(400).json({ success: false, message: 'symbol is required' });
      return;
    }

    const range = (req.query.range as string) || '1y';
    const interval = (req.query.interval as string) || '1d';
    const ttlMs = PROFILE_TTL_MS[range] ?? 24 * 60 * 60 * 1000;
    const cacheKey = `stock:profile:${symbol}:${range}:${interval}`;

    const cached = await getCachedWithMaxAgeMs(cacheKey, ttlMs);
    if (cached) {
      res.status(200).json({ success: true, data: cached });
      return;
    }

    const data = await StocksService.getFullStockProfile(symbol, range, interval);
    if (data.trends !== null || data.chartData !== null) {
      await setCache(cacheKey, data);
      res.status(200).json({ success: true, data });
      return;
    }

    // Both null — Yahoo is likely rate limiting. Try stale profile cache first,
    // then fall back to the NSE quote cache (stock:chart:SYMBOL) which has valid
    // chart data fetched by the portfolio endpoint.
    const staleProfile = await getCached<unknown>(cacheKey);
    if (staleProfile) {
      logger.warn({ symbol, range }, 'Yahoo returned null profile — serving stale cache');
      res.status(200).json({ success: true, data: staleProfile });
      return;
    }
    const nseCache = await getCached<unknown>(`stock:chart:${symbol}`);
    if (nseCache) {
      logger.warn(
        { symbol, range },
        'Yahoo returned null profile — falling back to NSE chart cache'
      );
      res.status(200).json({ success: true, data: { trends: null, chartData: nseCache } });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching full stock profile');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
