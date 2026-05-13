import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { mutualFundSchema } from '../schemas/mutual-funds';
import { getUserFromRequest } from '../utils/jwtHelpers';
import logger from '../utils/logger';
import { fundNameSimilarity, lookupMFAPIScheme } from '../utils/fundNameMatch';

export async function addMutualFundTransaction(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const parsed = mutualFundSchema.omit({ userId: true, _id: true }).parse(req.body);
    const db = database.getDb();
    const uid = new ObjectId(user.userId);

    // Resolve fundName to the canonical name stored in mutualFundsInfo so the
    // dashboard's exact-match lookup (fundName → schemeNumber → NAV) works correctly.
    const trackedFunds = (await db
      .collection('mutualFundsInfo')
      .find({ userId: uid }, { projection: { fundName: 1, schemeNumber: 1 } })
      .toArray()) as unknown as { fundName: string; schemeNumber: number }[];

    let resolvedFundName = parsed.fundName;

    const exactMatch = trackedFunds.find((f) => f.fundName === parsed.fundName);
    if (!exactMatch) {
      // Jaccard similarity against tracked fund names (stop words stripped, so
      // "Franklin Build India Fund Direct Growth" ≈ "Franklin Build India")
      let bestScore = 0;
      let bestName = '';
      for (const f of trackedFunds) {
        const score = fundNameSimilarity(parsed.fundName, f.fundName);
        if (score > bestScore) {
          bestScore = score;
          bestName = f.fundName;
        }
      }

      if (bestScore >= 0.4) {
        logger.info(
          `[MF] Fund name mapped (local): "${parsed.fundName}" → "${bestName}" (score: ${bestScore.toFixed(2)})`
        );
        resolvedFundName = bestName;
      } else {
        // No local match — look up canonical name + scheme number from MFAPI
        const mfapiMatch = await lookupMFAPIScheme(parsed.fundName);
        if (mfapiMatch) {
          resolvedFundName = mfapiMatch.schemeName;
          logger.info(
            `[MF] Fund name mapped (MFAPI): "${parsed.fundName}" → "${resolvedFundName}"`
          );
          // Auto-create mutualFundsInfo so the dashboard can fetch NAV immediately
          const alreadyTracked = await db
            .collection('mutualFundsInfo')
            .findOne({ userId: uid, fundName: mfapiMatch.schemeName });
          if (!alreadyTracked) {
            await db.collection('mutualFundsInfo').insertOne({
              userId: uid,
              fundName: mfapiMatch.schemeName,
              schemeNumber: mfapiMatch.schemeCode,
              sipAmount: 0,
              date: new Date(),
            });
            logger.info(
              `[MF] Auto-created mutualFundsInfo for "${mfapiMatch.schemeName}" (scheme: ${mfapiMatch.schemeCode})`
            );
          }
        } else {
          // Cannot resolve — tell the caller what names are actually tracked
          const tracked = trackedFunds.map((f) => f.fundName);
          res.status(422).json({
            success: false,
            message: `Fund "${parsed.fundName}" not found. Use one of the tracked fund names: ${tracked.join('; ')}. If this is a new fund, add it via the website first.`,
          });
          return;
        }
      }
    }

    const transaction = {
      ...parsed,
      fundName: resolvedFundName,
      userId: uid,
      date: new Date(parsed.date),
    };
    const collection = db.collection('mutualFunds');
    const result = await collection.insertOne(transaction);
    res.status(201).json({ success: true, message: 'Transaction added', id: result.insertedId });
  } catch (error) {
    logger.error({ err: error }, 'Add mutual fund transaction error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getMutualFundTransactions(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const collection = db.collection('mutualFunds');
    const transactions = await collection.find({ userId: new ObjectId(user.userId) }).toArray();
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    logger.error({ err: error }, 'Fetch mutual fund transactions error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteMutualFundTransaction(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { id } = req.params;
    const db = database.getDb();
    const result = await db.collection('mutualFunds').deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(user.userId),
    });
    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    logger.error({ err: error }, 'Delete mutual fund transaction error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteAllUserMutualFundTransactions(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const result = await db
      .collection('mutualFunds')
      .deleteMany({ userId: new ObjectId(user.userId) });
    res.status(200).json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    logger.error({ err: error }, 'Delete all mutual fund transactions error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
