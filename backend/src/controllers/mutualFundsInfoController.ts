import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { mutualFundInfoSchema } from '../schemas';
import { getUserFromRequest } from '../utils/jwtHelpers';
import axios from 'axios';

export interface MutualFundNavHistoryData {
  date: string;
  nav: string;
}

export interface MutualFundMeta {
  fund_house: string;
  scheme_type: string;
  scheme_category: string;
  scheme_code: number;
  scheme_name: string;
  isin_growth: string;
  isin_div_reinvestment: string | null;
}

export interface MutualFundNavHistoryItem {
  meta: MutualFundMeta;
  data: MutualFundNavHistoryData[];
  status: string;
}

export async function addMutualFundInfo(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const parsed = mutualFundInfoSchema.omit({ userId: true, _id: true }).parse(req.body);
    const mutualFundInfo = {
      ...parsed,
      userId: new ObjectId(user.userId),
      date: new Date(parsed.date),
    };
    const db = database.getDb();
    const collection = db.collection('mutualFundsInfo');
    const result = await collection.insertOne(mutualFundInfo);
    res.status(201).json({ success: true, message: 'Mutual Fund added', id: result.insertedId });
  } catch (error) {
    console.error('Add mutual fund error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getMutualFundInfo(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const collection = db.collection('mutualFundsInfo');
    const mutualFundsInfo = await collection.find({ userId: new ObjectId(user.userId) }).toArray();
    res.status(200).json({ success: true, data: mutualFundsInfo });
  } catch (error) {
    console.error('Fetching mutual fund error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getMfapiNavHistory(req: Request, res: Response) {
  try {
    const { schemeNumbers } = req.body;

    if (!schemeNumbers || !Array.isArray(schemeNumbers) || schemeNumbers.length === 0) {
      res.status(400).json({
        success: false,
        message: 'schemeNumbers array is required in request body',
      });
      return;
    }

    // Validate that all scheme numbers are valid
    for (const schemeNumber of schemeNumbers) {
      if (typeof schemeNumber !== 'string' && typeof schemeNumber !== 'number') {
        res.status(400).json({
          success: false,
          message: 'All scheme numbers must be strings or numbers',
        });
        return;
      }
    }

    // Fetch NAV history for all scheme numbers in parallel
    const navHistoryPromises = schemeNumbers.map(async (schemeNumber) => {
      try {
        const url = `https://api.mfapi.in/mf/${schemeNumber}`;
        const response = await axios.get(url);
        return { schemeNumber: schemeNumber.toString(), data: response.data };
      } catch (error) {
        console.error(`Error fetching NAV history for scheme ${schemeNumber}:`, error);
        return { schemeNumber: schemeNumber.toString(), data: null, error: 'Failed to fetch data' };
      }
    });

    const results = await Promise.all(navHistoryPromises);

    // Create a map with scheme numbers as keys
    const navHistoryMap: Record<string, MutualFundNavHistoryItem> = {};
    results.forEach((result) => {
      navHistoryMap[result.schemeNumber] = result.data;
    });

    res.status(200).json({
      success: true,
      data: navHistoryMap,
    });
  } catch (error) {
    console.error('Error fetching NAV history from mfapi.in:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch NAV history' });
  }
}

// Fuzzy search helper
function fuzzyMatch(str: string, pattern: string) {
  return str.toLowerCase().includes(pattern.toLowerCase());
}

export async function searchMutualFundsByName(req: Request, res: Response) {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string' || query.length < 2) {
      res.status(400).json({
        success: false,
        message: 'Query string is required and should be at least 2 characters.',
      });
      return;
    }
    // Fetch all mutual funds from mfapi.in
    const response = await axios.get('https://api.mfapi.in/mf');
    const allFunds = response.data;
    // Fuzzy match schemeName
    const matches = allFunds.filter((fund: unknown) => {
      if (typeof fund === 'object' && fund !== null && 'schemeName' in fund) {
        const schemeName = (fund as Record<string, unknown>).schemeName;
        return typeof schemeName === 'string' && fuzzyMatch(schemeName, query);
      }
      return false;
    });

    // Optionally, sort by closeness (e.g., Levenshtein distance) for better ranking
    res.status(200).json({ success: true, data: matches });
  } catch (error) {
    console.error('Error searching mutual funds by name:', error);
    res.status(500).json({ success: false, message: 'Failed to search mutual funds' });
  }
}
