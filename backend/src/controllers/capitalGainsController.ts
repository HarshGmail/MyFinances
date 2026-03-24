import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { getUserFromRequest } from '../utils/jwtHelpers';
import { runFifo, computeAssetFYGains, buildSummary, getIndianFY } from '../utils/capitalGains';

export async function getCapitalGains(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const db = database.getDb();
    const userId = new ObjectId(user.userId);

    // Fetch all asset transactions in parallel
    const [stockDocs, goldDocs, cryptoDocs, mfDocs] = await Promise.all([
      db.collection('stocks').find({ userId }).toArray(),
      db.collection('digitalGold').find({ userId }).toArray(),
      db.collection('crypto').find({ userId }).toArray(),
      db.collection('mutualFunds').find({ userId }).toArray(),
    ]);

    // ── Stocks ──────────────────────────────────────────────────────────────
    const stockTxs = stockDocs.map((doc) => ({
      _id: doc._id,
      type: doc.type as 'credit' | 'debit',
      date: doc.date,
      qty: doc.numOfShares,
      costPerUnit: doc.marketPrice,
      label: doc.stockName,
    }));
    const stockFifo = runFifo(stockTxs, 'stocks');
    const stocksByFY = computeAssetFYGains(stockFifo.realizedGains, 'stocks');

    // ── Gold ─────────────────────────────────────────────────────────────────
    const goldTxs = goldDocs.map((doc) => ({
      _id: doc._id,
      type: doc.type as 'credit' | 'debit',
      date: doc.date,
      qty: doc.quantity,
      costPerUnit: doc.goldPrice,
    }));
    const goldFifo = runFifo(goldTxs, 'gold');
    const goldByFY = computeAssetFYGains(goldFifo.realizedGains, 'gold');

    // ── Crypto ───────────────────────────────────────────────────────────────
    const cryptoTxs = cryptoDocs.map((doc) => ({
      _id: doc._id,
      type: doc.type as 'credit' | 'debit',
      date: doc.date,
      qty: doc.quantity,
      costPerUnit: doc.coinPrice,
      label: doc.coinName,
    }));
    const cryptoFifo = runFifo(cryptoTxs, 'crypto');
    const cryptoByFY = computeAssetFYGains(cryptoFifo.realizedGains, 'crypto');

    // ── Mutual Funds ─────────────────────────────────────────────────────────
    const mfTxs = mfDocs.map((doc) => ({
      _id: doc._id,
      type: doc.type as 'credit' | 'debit',
      date: doc.date,
      qty: Number(doc.numOfUnits) || 0,
      costPerUnit: Number(doc.fundPrice) || 0,
      label: doc.fundName,
    }));
    const mfFifo = runFifo(mfTxs, 'mutualFunds');
    const mfByFY = computeAssetFYGains(mfFifo.realizedGains, 'mutualFunds');

    // ── Summary ──────────────────────────────────────────────────────────────
    const summary = buildSummary(stocksByFY, goldByFY, cryptoByFY, mfByFY);
    const currentFY = getIndianFY(new Date());

    res.json({
      byAsset: {
        stocks: {
          realizedByFY: stocksByFY,
          currentLots: stockFifo.currentLots.map((lot) => ({
            stockName: lot.label,
            units: lot.units,
            costPerUnit: lot.costPerUnit,
            purchaseDate: lot.purchaseDate,
            holdingDays: lot.holdingDays,
          })),
        },
        gold: {
          realizedByFY: goldByFY,
          currentLots: goldFifo.currentLots.map((lot) => ({
            grams: lot.units,
            costPerGram: lot.costPerUnit,
            purchaseDate: lot.purchaseDate,
            holdingDays: lot.holdingDays,
          })),
        },
        crypto: {
          realizedByFY: cryptoByFY,
          currentLots: cryptoFifo.currentLots.map((lot) => ({
            coinName: lot.label,
            units: lot.units,
            costPerUnit: lot.costPerUnit,
            purchaseDate: lot.purchaseDate,
            holdingDays: lot.holdingDays,
          })),
        },
        mutualFunds: {
          realizedByFY: mfByFY,
          currentLots: mfFifo.currentLots.map((lot) => ({
            fundName: lot.label,
            units: lot.units,
            costPerUnit: lot.costPerUnit,
            purchaseDate: lot.purchaseDate,
            holdingDays: lot.holdingDays,
          })),
        },
      },
      summary: {
        currentFY,
        byFY: summary,
        notes: [
          'LTCG exemption: ₹1.25L per year across equity + equity MF combined (not auto-applied per asset)',
          'Mutual funds: All treated as equity funds (STCG 20%, LTCG 12.5%). Debt MF taxed at slab rate.',
          'Digital gold (SafeGold): Gains are tax-free — no tax computed',
          'Crypto (VDA): 30% flat tax, no STCG/LTCG distinction',
          'Rates shown use Finance Act 2024 (effective July 23, 2024) for sales on/after that date',
        ],
      },
    });
  } catch (error) {
    console.error('Capital gains calculation error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
