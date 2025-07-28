import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { stocksSchema } from '../schemas/stocks';
import { getUserFromRequest } from '../utils/jwtHelpers';
import axios from 'axios';

export interface TradingPeriod {
  timezone: string;
  start: number;
  end: number;
  gmtoffset: number;
}

export interface CurrentTradingPeriod {
  pre: TradingPeriod;
  regular: TradingPeriod;
  post: TradingPeriod;
}

export interface StockMeta {
  currency: string;
  symbol: string;
  exchangeName: string;
  fullExchangeName: string;
  instrumentType: string;
  firstTradeDate: number;
  regularMarketTime: number;
  hasPrePostMarketData: boolean;
  gmtoffset: number;
  timezone: string;
  exchangeTimezoneName: string;
  regularMarketPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  longName: string;
  shortName: string;
  chartPreviousClose: number;
  priceHint: number;
  currentTradingPeriod: CurrentTradingPeriod;
  dataGranularity: string;
  range: string;
  validRanges: string[];
}

export interface Quote {
  open: number[];
  volume: number[];
  close: number[];
  low: number[];
  high: number[];
}

export interface AdjClose {
  adjclose: number[];
}

export interface Indicators {
  quote: Quote[];
  adjclose: AdjClose[];
}

export interface ChartResult {
  meta: StockMeta;
  timestamp: number[];
  indicators: Indicators;
}

export interface ChartError {
  code: string;
  description: string;
}

export interface Chart {
  result: ChartResult[];
  error: ChartError | null;
}

export interface StockData {
  chart: Chart;
}

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
    console.error('Add stock transaction error:', error);
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
    console.error('Fetch stock transactions error:', error);
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

    // Throttle: Only one Yahoo Finance API call per second
    const results: [string, StockData | null][] = [];
    for (const symbol of symbols) {
      try {
        const yfSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=1d&range=1y`;
        const response = await axios.get(url);
        console.log('Symbol', symbol, ' yfSymbol', yfSymbol, ' status', response.status);
        results.push([symbol, response.data]);
      } catch (err: unknown) {
        const error = err as Error;
        console.log('error fetching api data from yahoo', error.message);
        results.push([symbol, null]);
      }
      // Wait 1 second before next call, unless it's the last symbol
      if (symbol !== symbols[symbols.length - 1]) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    const dataMap = Object.fromEntries(results);
    res.status(200).json({ success: true, data: dataMap });
  } catch (error) {
    console.error('Fetch Yahoo Finance quote error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export interface StockSearchResponse {
  exchange: string;
  shortname: string;
  quoteType: string;
  symbol: string;
  index: string;
  score: string;
  typeDisp: string;
  longname: string;
  exchDisp: string;
  sector: string;
  sectorDisp: string;
  industry: string;
  industryDisp: string;
  isYahooFinance: boolean;
}

export async function searchStocksByName(req: Request, res: Response) {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string' || query.length < 2) {
      res.status(400).json({
        message: 'Query string is required and should be at least 2 characters.',
      });
      return;
    }

    const url =
      `https://query2.finance.yahoo.com/v1/finance/search` +
      `?q=${encodeURIComponent(query)}` +
      `&lang=en-US&region=US&quotesCount=6&newsCount=3&listsCount=2` +
      `&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query` +
      `&multiQuoteQueryId=multi_quote_single_token_query` +
      `&newsQueryId=news_cie_vespa&enableCb=false&enableNavLinks=true` +
      `&enableEnhancedTrivialQuery=true&enableResearchReports=true` +
      `&enableCulturalAssets=true&enableLogoUrl=true&enableLists=false` +
      `&recommendCount=5&enablePrivateCompany=true`;

    const response = await axios.get(url);
    const quotes: StockSearchResponse[] = response.data.quotes || [];

    const filtered = quotes
      .filter((q) => q.exchange === 'NSI')
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ isYahooFinance, ...rest }) => rest); // Remove `isYahooFinance`

    res.status(200).json({
      success: true,
      data: filtered,
    });
  } catch (err) {
    console.error('Error searching stocks by name:', err);
    res.status(500).json({ message: 'Failed to search stocks' });
  }
}
