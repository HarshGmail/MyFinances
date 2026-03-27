import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { digitalGoldSchema } from '../schemas/digitalGold';
import { getUserFromRequest } from '../utils/jwtHelpers';
import axios from 'axios';
import logger from '../utils/logger';

export async function addGoldTransaction(req: Request, res: Response) {
  try {
    // Get user from cookie
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    // Validate and parse request body (excluding userId)
    const parsed = digitalGoldSchema.omit({ userId: true, _id: true }).parse(req.body);
    // Prepare transaction document
    const transaction = {
      ...parsed,
      userId: new ObjectId(user.userId),
      date: new Date(parsed.date),
    };
    // Insert into database
    const db = database.getDb();
    const collection = db.collection('digitalGold');
    const result = await collection.insertOne(transaction);
    res.status(201).json({ success: true, message: 'Transaction added', id: result.insertedId });
  } catch (error) {
    logger.error({ err: error }, 'Add gold transaction error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getGoldTransactions(req: Request, res: Response) {
  try {
    // Get user from cookie
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const collection = db.collection('digitalGold');
    const transactions = await collection.find({ userId: new ObjectId(user.userId) }).toArray();
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    logger.error({ err: error }, 'Fetch gold transactions error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function updateGoldTransaction(req: Request, res: Response) {
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

    // Validate payload (omit _id and userId)
    const parsed = digitalGoldSchema.omit({ _id: true, userId: true }).parse(req.body);

    const db = database.getDb();
    const collection = db.collection('digitalGold');
    const result = await collection.updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(user.userId) },
      {
        $set: {
          ...parsed,
          date: new Date(parsed.date),
        },
      }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Transaction updated' });
  } catch (error) {
    logger.error({ err: error }, 'Update gold transaction error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteGoldTransaction(req: Request, res: Response) {
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
    const collection = db.collection('digitalGold');
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
    logger.error({ err: error }, 'Delete gold transaction error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteAllUserGoldTransactions(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const result = await db
      .collection('digitalGold')
      .deleteMany({ userId: new ObjectId(user.userId) });
    res.status(200).json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    logger.error({ err: error }, 'Delete all gold transactions error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

const TROY_OZ_TO_GRAM = 31.1035;
const SAFEGOLD_MARKUP = 1.0783;
const YAHOO_HEADERS = { 'User-Agent': 'Mozilla/5.0' };

// Fetches gold (USD/oz) + USD/INR from Yahoo Finance for a date range,
// calculates INR/gram with markup, and bulk-upserts into the cache.
async function fetchAndCacheFromYahoo(
  fromDate: string,
  toDate: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cacheCollection: any,
  cachedMap: Map<string, string>
) {
  const period1 = Math.floor(new Date(fromDate).getTime() / 1000) - 86400;
  const period2 = Math.floor(new Date(toDate).getTime() / 1000) + 86400;

  const [goldRes, fxRes] = await Promise.all([
    axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1d&period1=${period1}&period2=${period2}`,
      { headers: YAHOO_HEADERS }
    ),
    axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/USDINR%3DX?interval=1d&period1=${period1}&period2=${period2}`,
      { headers: YAHOO_HEADERS }
    ),
  ]);

  const goldResult = goldRes.data?.chart?.result?.[0];
  const fxResult = fxRes.data?.chart?.result?.[0];
  if (!goldResult || !fxResult) return;

  const goldTimestamps: number[] = goldResult.timestamp ?? [];
  const goldClose: (number | null)[] = goldResult.indicators?.quote?.[0]?.close ?? [];
  const fxTimestamps: number[] = fxResult.timestamp ?? [];
  const fxClose: (number | null)[] = fxResult.indicators?.quote?.[0]?.close ?? [];

  // Build sorted USD/INR list for carry-forward lookup
  const fxPairs: { date: string; rate: number }[] = [];
  fxTimestamps.forEach((ts, i) => {
    const rate = fxClose[i];
    if (rate) fxPairs.push({ date: new Date(ts * 1000).toISOString().slice(0, 10), rate });
  });
  fxPairs.sort((a, b) => a.date.localeCompare(b.date));

  const bulkOps: object[] = [];
  for (let i = 0; i < goldTimestamps.length; i++) {
    const goldUsd = goldClose[i];
    if (!goldUsd) continue;

    const date = new Date(goldTimestamps[i] * 1000).toISOString().slice(0, 10);

    // Carry-forward: nearest USD/INR on or before this date
    let usdInr: number | undefined;
    for (let j = fxPairs.length - 1; j >= 0; j--) {
      if (fxPairs[j].date <= date) {
        usdInr = fxPairs[j].rate;
        break;
      }
    }
    if (!usdInr) continue;

    const rate = ((goldUsd / TROY_OZ_TO_GRAM) * usdInr * SAFEGOLD_MARKUP).toString();
    cachedMap.set(date, rate);
    bulkOps.push({
      updateOne: {
        filter: { date },
        update: { $set: { date, rate, fetchedAt: new Date() } },
        upsert: true,
      },
    });
  }

  if (bulkOps.length > 0) {
    await cacheCollection.bulkWrite(bulkOps);
  }
}

export async function getSafeGoldRates(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
      res.status(400).json({ success: false, message: 'startDate and endDate are required' });
      return;
    }

    const db = database.getDb();
    const cacheCollection = db.collection('goldRatesCache');

    // Generate all dates in range
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10));
    }

    // Load cached rates
    const cached = await cacheCollection.find({ date: { $in: dates } }).toArray();
    const cachedMap = new Map<string, string>(
      cached.map((c) => [c.date as string, c.rate as string])
    );

    // Re-fetch today if cache is stale (> 15 min old)
    const today = new Date().toISOString().slice(0, 10);
    const todayCacheDoc = cached.find((c) => c.date === today);
    const todayIsStale =
      !todayCacheDoc || Date.now() - new Date(todayCacheDoc.fetchedAt).getTime() > 15 * 60 * 1000;

    const missingDates = dates.filter((d) => !cachedMap.has(d) || (d === today && todayIsStale));

    if (missingDates.length > 0) {
      const sorted = [...missingDates].sort();
      // Two Yahoo Finance calls cover the entire missing range regardless of size
      await fetchAndCacheFromYahoo(
        sorted[0],
        sorted[sorted.length - 1],
        cacheCollection,
        cachedMap
      );
    }

    const data = dates
      .filter((d) => cachedMap.has(d))
      .map((d) => ({ date: d, rate: cachedMap.get(d)! }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching gold rates');
    res.status(500).json({ success: false, message: 'Failed to fetch gold rates' });
  }
}
