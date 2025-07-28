import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { cryptoSchema } from '../schemas';
import { getUserFromRequest } from '../utils/jwtHelpers';
import coindcxService from '../services/coindcxService';
import axios from 'axios';

export async function addCryptoTransaction(req: Request, res: Response) {
  try {
    // Get user from cookie
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    // Validate and parse request body (excluding userId)
    const parsed = cryptoSchema.omit({ userId: true, _id: true }).parse(req.body);
    // Prepare transaction document
    const transaction = {
      ...parsed,
      userId: new ObjectId(user.userId),
      date: new Date(parsed.date),
    };
    // Insert into database
    const db = database.getDb();
    const collection = db.collection('crypto');
    const result = await collection.insertOne(transaction);
    res.status(201).json({ success: true, message: 'Transaction added', id: result.insertedId });
  } catch (error) {
    console.error('Add crypto transaction error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getCryptoTransactions(req: Request, res: Response) {
  try {
    // Get user from cookie
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const collection = db.collection('crypto');
    const transactions = await collection.find({ userId: new ObjectId(user.userId) }).toArray();
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    console.error('Fetch crypto transactions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function fetchUserBalance(req: Request, res: Response) {
  try {
    const userData = await coindcxService.getUserBalances();
    res.status(200).json({
      success: true,
      message: 'User balances fetched',
      data: userData,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.log('Error while fetching user balance from coin dcx', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching user balances',
    });
  }
}

export async function fetchMultipleCoinBalances(req: Request, res: Response) {
  try {
    const coinData = await coindcxService.getCurrentPrices(req.body);
    res.status(200).json({
      success: true,
      message: 'coin balances fetched',
      data: coinData,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.log('Error while fetching coin prices from coin dcx', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching user balances',
    });
  }
}

export async function getCoinCandles(req: Request, res: Response) {
  try {
    const { symbol, interval = '1d', limit = '365', startTime, endTime } = req.query;
    if (!symbol || typeof symbol !== 'string') {
      res.status(400).json({ success: false, message: 'Symbol is required' });
      return;
    }
    const candles = await coindcxService.getCoinCandles({
      symbol,
      interval: typeof interval === 'string' ? interval : '1d',
      limit: Number(limit),
      startTime: startTime ? Number(startTime) : undefined,
      endTime: endTime ? Number(endTime) : undefined,
    });
    res.status(200).json({ success: true, data: candles });
  } catch (error) {
    console.error('Error in getCoinCandles:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

function fuzzyMatchName(name: string, query: string): boolean {
  return name.toLowerCase().includes(query.toLowerCase());
}

type coinNames = {
  id: string;
  name: string;
  symbol: string;
  rank: string;
  is_new: string;
  is_active: string;
  type: string;
};

export async function searchCryptoCoinsByName(req: Request, res: Response) {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string' || query.length < 2) {
      res.status(400).json({
        success: false,
        message: 'Query string is required and should be at least 2 characters.',
      });
      return;
    }

    // Fetch all coins from CoinPaprika
    const response = await axios.get('https://api.coinpaprika.com/v1/coins');
    const allCoins = response.data;

    // Filter coins where `name` matches the search query
    const matches = allCoins.filter((coin: coinNames) => {
      return typeof coin.name === 'string' && fuzzyMatchName(coin.name, query);
    });

    res.status(200).json({ success: true, data: matches });
  } catch (error) {
    console.error('Error searching crypto coins by name:', error);
    res.status(500).json({ success: false, message: 'Failed to search coins' });
  }
}
