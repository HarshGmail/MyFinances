import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { stocksSchema } from '../schemas/stocks';
import { getUserFromRequest } from '../utils/jwtHelpers';
import { StocksService } from '../services/stocksService';

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
    console.error('Update stock transaction error:', error);
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
    console.error('Delete stock transaction error:', error);
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

    const dataMap = await StocksService.fetchNSEQuotes(symbols);
    res.status(200).json({ success: true, data: dataMap });
  } catch (error) {
    console.error('Fetch NSE quote error:', error);
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

    const results = await StocksService.searchStocks(query);
    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error('Error searching stocks by name:', err);
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
    const priceData = await StocksService.fetchNSEQuotes(stockNames);

    const portfolio = stockNames.map((stockName) => {
      const txs = grouped[stockName];
      const numOfShares = txs.reduce(
        (sum, tx) =>
          sum + (tx.type === 'credit' ? (tx.numOfShares as number) : -(tx.numOfShares as number)),
        0
      );
      const totalAmount = txs.reduce(
        (sum, tx) =>
          sum + (tx.type === 'credit' ? (tx.amount as number) : -(tx.amount as number)),
        0
      );
      const avgPrice = numOfShares > 0 ? totalAmount / numOfShares : 0;
      const investedAmount = parseFloat((avgPrice * numOfShares).toFixed(2));

      const meta = priceData[stockName]?.chart?.result?.[0]?.meta;
      const currentPrice = meta?.regularMarketPrice ?? null;
      const previousClose = meta?.chartPreviousClose ?? null;

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
      totalInvested > 0
        ? parseFloat(((totalProfitLoss / totalInvested) * 100).toFixed(2))
        : 0;
    const totalOneDayChange = parseFloat(
      portfolio.reduce((s, p) => s + p.oneDayChange, 0).toFixed(2)
    );
    const totalPreviousValue = portfolio.reduce(
      (s, p) => s + p.previousClose * p.numOfShares,
      0
    );
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
    console.error('Fetch stocks portfolio error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getFullStockProfile(req: Request, res: Response) {
  try {
    const { symbol } = req.query;
    if (!symbol || typeof symbol !== 'string') {
      res.status(400).json({ success: false, message: 'symbol is required' });
      return;
    }

    const range = (req.query.range as string) || '1y';
    const interval = (req.query.interval as string) || '1d';

    const data = await StocksService.getFullStockProfile(symbol, range, interval);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching full stock profile:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
