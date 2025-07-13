import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { stocksSchema } from '../schemas/stocks';
import { getUserFromRequest } from '../utils/jwtHelpers';
import axios from 'axios';

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
    const results: [string, any][] = [];
    for (const symbol of symbols) {
      try {
        const yfSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=1d&range=1y`;
        const response = await axios.get(url);
        results.push([symbol, response.data]);
      } catch (err) {
        console.log(err);
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
