import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import axios from 'axios';
import database from '../database';
import { getUserFromRequest } from '../utils/jwtHelpers';
import {
  getAuthUrl,
  exchangeCode,
  fetchPdfAttachments,
  fetchEmailBodies,
} from '../services/gmailService';
import { extractTextFromPdf } from '../services/pdfParser';
import { parseCdslMFTransactions } from '../services/cdslParser';
import { parseCdslStockHoldings, ParsedStockHolding } from '../services/cdslStocksParser';
import { parseSafeGoldTransactions } from '../services/safegoldParser';
import { parseSafeGoldInvoice } from '../services/safegoldInvoiceParser';
import { parseCoinDCXTradeEmail, ParsedCoinDCXTrade } from '../services/coinDCXEmailParser';
import { StocksService } from '../services/stocksService';
import { decrypt } from '../utils/encryption';
import config from '../config';

// ─── OAuth Connect ────────────────────────────────────────────────────────────

export async function oauthConnect(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const authUrl = getAuthUrl(user.userId);
    res.json({ success: true, data: { authUrl } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate auth URL';
    res.status(500).json({ success: false, message: msg });
  }
}

// ─── OAuth Callback ───────────────────────────────────────────────────────────

export async function oauthCallback(req: Request, res: Response) {
  try {
    const { code, state: userId, error } = req.query;

    if (error) {
      res.redirect(`${getFrontendUrl()}/integrations?emailError=${error}`);
      return;
    }

    if (!code || typeof code !== 'string' || !userId || typeof userId !== 'string') {
      res.redirect(`${getFrontendUrl()}/integrations?emailError=missing_params`);
      return;
    }

    const { encryptedRefreshToken, email } = await exchangeCode(code);

    const db = database.getDb();
    // Upsert keyed on (userId, email) so multiple Gmail accounts can be linked.
    // Preserve existing lastSyncAt and safegoldSender on re-auth — only reset them on first connect.
    await db.collection('emailIntegrations').updateOne(
      { userId: new ObjectId(userId), email },
      {
        $set: {
          userId: new ObjectId(userId),
          email,
          refreshToken: encryptedRefreshToken,
          linkedAt: new Date(),
        },
        $setOnInsert: {
          lastSyncAt: null,
          safegoldSender: 'estatements@safegold.in',
        },
      },
      { upsert: true }
    );

    res.redirect(`${getFrontendUrl()}/integrations?emailConnected=true`);
  } catch (err: unknown) {
    console.error('OAuth callback error:', err);
    const msg = encodeURIComponent(err instanceof Error ? err.message : 'oauth_failed');
    res.redirect(`${getFrontendUrl()}/integrations?emailError=${msg}`);
  }
}

// ─── Status ───────────────────────────────────────────────────────────────────

export async function getStatus(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const db = database.getDb();
    const integrations = await db
      .collection('emailIntegrations')
      .find({ userId: new ObjectId(user.userId) })
      .toArray();

    if (integrations.length === 0) {
      res.json({ success: true, data: { connected: false, accounts: [] } });
      return;
    }

    res.json({
      success: true,
      data: {
        connected: true,
        accounts: integrations.map((i) => ({
          email: i.email,
          lastSyncAt: i.lastSyncAt,
          safegoldSender: i.safegoldSender ?? 'estatements@safegold.in',
        })),
      },
    });
  } catch (err) {
    console.error('Get email integration status error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── Reset Sync ───────────────────────────────────────────────────────────────

export async function resetSync(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, message: 'email is required' });
      return;
    }

    const db = database.getDb();
    await db
      .collection('emailIntegrations')
      .updateOne({ userId: new ObjectId(user.userId), email }, { $set: { lastSyncAt: null } });
    res.json({ success: true, message: 'Sync history cleared — next sync will fetch all emails' });
  } catch (err) {
    console.error('Reset sync error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── Disconnect ───────────────────────────────────────────────────────────────

export async function disconnect(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const email = req.query.email as string | undefined;
    if (!email) {
      res.status(400).json({ success: false, message: 'email query param is required' });
      return;
    }

    const db = database.getDb();
    await db
      .collection('emailIntegrations')
      .deleteOne({ userId: new ObjectId(user.userId), email });
    res.json({ success: true, message: 'Gmail account removed' });
  } catch (err) {
    console.error('Disconnect error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── Update SafeGold Sender ───────────────────────────────────────────────────

export async function updateSettings(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { email, safegoldSender } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, message: 'email is required' });
      return;
    }
    if (safegoldSender && typeof safegoldSender === 'string') {
      const db = database.getDb();
      await db
        .collection('emailIntegrations')
        .updateOne({ userId: new ObjectId(user.userId), email }, { $set: { safegoldSender } });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export async function syncEmails(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const db = database.getDb();
    const userId = new ObjectId(user.userId);

    // Load all linked integrations for this user
    const integrations = await db.collection('emailIntegrations').find({ userId }).toArray();
    if (integrations.length === 0) {
      res.status(400).json({ success: false, message: 'No Gmail account linked' });
      return;
    }

    // Load user for PAN and phone (needed for PDF passwords)
    const userDoc = await db.collection('users').findOne({ _id: userId });
    if (!userDoc) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Derive passwords
    const cdslPassword = derivesCdslPassword(userDoc.panNumber);
    const safegoldPassword = derivesSafeGoldPassword(userDoc.name, userDoc.phone);

    const errors: string[] = [];
    const allMFTransactions: ReturnType<typeof parseCdslMFTransactions> = [];
    const allGoldTransactions: ReturnType<typeof parseSafeGoldTransactions> = [];
    const allStockHoldings: ParsedStockHolding[] = [];
    const allCryptoTrades: ParsedCoinDCXTrade[] = [];

    // Loop over every linked account and collect from each
    for (const integration of integrations) {
      const afterDate: Date | undefined = integration.lastSyncAt ?? undefined;
      const accountTag = integration.email;

      // ── Fetch and parse CDSL emails ────────────────────────────────────────
      try {
        const cdslQuery = 'from:eCAS@cdslstatement.com has:attachment';
        const cdslPdfs = await fetchPdfAttachments(integration.refreshToken, cdslQuery, afterDate);
        console.log(`[Sync:${accountTag}] Found ${cdslPdfs.length} CDSL PDF(s)`);

        for (const pdf of cdslPdfs) {
          try {
            const passwords = cdslPassword ? [cdslPassword, ''] : [''];
            const text = await extractTextFromPdf(pdf, passwords);
            allMFTransactions.push(...parseCdslMFTransactions(text));
            allStockHoldings.push(...parseCdslStockHoldings(text));
          } catch (e) {
            errors.push(
              `[${accountTag}] CDSL PDF parse error: ${e instanceof Error ? e.message : String(e)}`
            );
          }
        }
      } catch (e) {
        errors.push(
          `[${accountTag}] CDSL email fetch error: ${e instanceof Error ? e.message : String(e)}`
        );
      }

      // ── Fetch and parse SafeGold statement emails ──────────────────────────
      try {
        const sgSender = integration.safegoldSender ?? 'estatements@safegold.in';
        const sgPdfs = await fetchPdfAttachments(
          integration.refreshToken,
          `from:${sgSender} has:attachment`,
          afterDate
        );
        console.log(`[Sync:${accountTag}] Found ${sgPdfs.length} SafeGold PDF(s)`);

        for (const pdf of sgPdfs) {
          try {
            const passwords = safegoldPassword ? [safegoldPassword, ''] : [''];
            const text = await extractTextFromPdf(pdf, passwords);
            allGoldTransactions.push(...parseSafeGoldTransactions(text));
          } catch (e) {
            errors.push(
              `[${accountTag}] SafeGold PDF parse error: ${e instanceof Error ? e.message : String(e)}`
            );
          }
        }
      } catch (e) {
        errors.push(
          `[${accountTag}] SafeGold email fetch error: ${e instanceof Error ? e.message : String(e)}`
        );
      }

      // ── Fetch and parse SafeGold real-time invoice emails ──────────────────
      try {
        const sgInvoicePdfs = await fetchPdfAttachments(
          integration.refreshToken,
          'from:noreply@safegold.in has:attachment',
          afterDate
        );
        console.log(`[Sync:${accountTag}] Found ${sgInvoicePdfs.length} SafeGold invoice PDF(s)`);

        for (const pdf of sgInvoicePdfs) {
          try {
            const text = await extractTextFromPdf(pdf, []);
            const tx = parseSafeGoldInvoice(text);
            if (tx) allGoldTransactions.push(tx);
          } catch (e) {
            errors.push(
              `[${accountTag}] SafeGold invoice parse error: ${e instanceof Error ? e.message : String(e)}`
            );
          }
        }
      } catch (e) {
        errors.push(
          `[${accountTag}] SafeGold invoice fetch error: ${e instanceof Error ? e.message : String(e)}`
        );
      }

      // ── Fetch and parse CoinDCX trade emails ──────────────────────────────
      try {
        const cdxBodies = await fetchEmailBodies(
          integration.refreshToken,
          'from:no-reply@coindcx.com subject:"CoinDCX Trade Executed"',
          afterDate
        );
        console.log(`[Sync:${accountTag}] Found ${cdxBodies.length} CoinDCX trade email(s)`);

        for (const body of cdxBodies) {
          try {
            const trade = parseCoinDCXTradeEmail(body);
            if (trade) allCryptoTrades.push(trade);
          } catch (e) {
            errors.push(
              `[${accountTag}] CoinDCX parse error: ${e instanceof Error ? e.message : String(e)}`
            );
          }
        }
      } catch (e) {
        errors.push(
          `[${accountTag}] CoinDCX fetch error: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    // ── Deduplicate against existing DB records ──────────────────────────────

    // Normalize CDSL fund names to match existing DB fund names (for NAV lookups)
    const canonicalMF = await canonicalizeMFNames(db, userId, allMFTransactions);
    const { newMF, skippedMF } = await deduplicateMF(db, userId, canonicalMF);
    const { newGold, skippedGold } = await deduplicateGold(db, userId, allGoldTransactions);

    // Deduplicate stock holdings across multiple PDFs, then canonicalize names via Yahoo Finance
    const dedupedHoldings = deduplicateHoldingsList(allStockHoldings);
    const canonicalStocks = await canonicalizeStockNames(db, userId, dedupedHoldings);
    const { newStocks, skippedStocks } = await deduplicateStocks(db, userId, canonicalStocks);

    const { newCrypto, skippedCrypto } = await deduplicateCrypto(db, userId, allCryptoTrades);

    // Update lastSyncAt for all linked accounts
    await db
      .collection('emailIntegrations')
      .updateMany({ userId }, { $set: { lastSyncAt: new Date() } });

    res.json({
      success: true,
      data: {
        mutualFunds: newMF,
        gold: newGold,
        stocks: newStocks,
        crypto: newCrypto,
        duplicatesSkipped: skippedMF + skippedGold + skippedStocks + skippedCrypto,
        errors,
      },
    });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importTransactions(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { mutualFunds = [], gold = [], stocks = [], crypto = [] } = req.body;
    const userId = new ObjectId(user.userId);
    const db = database.getDb();

    let importedMF = 0;
    let importedGold = 0;
    let importedStocks = 0;
    let importedCrypto = 0;

    // Import MF transactions
    if (mutualFunds.length > 0) {
      const mfDocs = mutualFunds.map((tx: Record<string, unknown>) => ({
        userId,
        type: tx.type,
        date: new Date(tx.date as string),
        fundName: tx.fundName,
        numOfUnits: tx.numOfUnits,
        fundPrice: tx.fundPrice,
        amount: tx.amount,
        platform: 'CDSL',
      }));
      // Normalize names then final dedup before insert
      const canonicalMFDocs = await canonicalizeMFNames(db, userId, mfDocs);
      const { newMF } = await deduplicateMF(db, userId, canonicalMFDocs);
      if (newMF.length > 0) {
        await db.collection('mutualFunds').insertMany(newMF.map(docForMF(userId)));
        importedMF = newMF.length;
      }
    }

    // Import Gold transactions
    if (gold.length > 0) {
      const goldDocs = gold.map((tx: Record<string, unknown>) => ({
        userId,
        type: tx.type,
        date: new Date(tx.date as string),
        goldPrice: tx.goldPrice,
        quantity: tx.quantity,
        amount: tx.amount,
        tax: tx.tax ?? 0,
        platform: tx.platform ?? 'SafeGold',
      }));
      const { newGold } = await deduplicateGold(db, userId, goldDocs);
      if (newGold.length > 0) {
        await db.collection('digitalGold').insertMany(newGold.map(docForGold(userId)));
        importedGold = newGold.length;
      }
    }

    // Import Stock holdings
    if (stocks.length > 0) {
      const stockDocs = stocks.map((tx: Record<string, unknown>) => ({
        type: tx.type,
        date: new Date(tx.date as string),
        stockName: tx.stockName,
        numOfShares: tx.numOfShares,
        marketPrice: tx.marketPrice,
        amount: tx.amount,
      }));
      const { newStocks } = await deduplicateStocks(db, userId, stockDocs);
      if (newStocks.length > 0) {
        await db.collection('stocks').insertMany(newStocks.map(docForStock(userId)));
        importedStocks = newStocks.length;
      }
    }

    // Import Crypto trades
    if (crypto.length > 0) {
      const cryptoDocs = crypto.map((tx: Record<string, unknown>) => ({
        coinSymbol: tx.coinSymbol,
        coinName: tx.coinName,
        quantity: tx.quantity,
        coinPrice: tx.coinPrice,
        amount: tx.amount,
        date: new Date(tx.date as string),
        type: tx.type,
      }));
      const { newCrypto } = await deduplicateCrypto(db, userId, cryptoDocs);
      if (newCrypto.length > 0) {
        await db.collection('crypto').insertMany(newCrypto.map(docForCrypto(userId)));
        importedCrypto = newCrypto.length;
      }
    }

    res.json({
      success: true,
      data: {
        importedMF,
        importedGold,
        importedStocks,
        importedCrypto,
        total: importedMF + importedGold + importedStocks + importedCrypto,
      },
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── Fund name canonicalization ───────────────────────────────────────────────
// CDSL uses full AMFI names ("Motilal Oswal Midcap Fund - Direct Plan Growth")
// while users may store short names ("Motilal Oswal Midcap Direct Growth").
// We normalize both and pick the highest-similarity existing name so that
// imported transactions share the same fundName key used for MFAPI NAV lookups.

const FUND_STOP_WORDS = new Set([
  'fund',
  'funds',
  'plan',
  'option',
  'direct',
  'growth',
  'regular',
  'idcw',
  'reinvestment',
  'payout',
  'series',
  'and',
  'of',
  'the',
  'fof',
  'etf',
  'nfo',
  'scheme',
  'class',
]);

function normalizeFundName(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !FUND_STOP_WORDS.has(w));
}

function fundNameSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeFundName(a));
  const wordsB = new Set(normalizeFundName(b));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union; // Jaccard similarity
}

// Module-level cache so the full MFAPI list is only fetched once per server lifetime
let mfapiAllFundsCache: { schemeCode: number; schemeName: string }[] | null = null;

async function getMFAPIAllFunds(): Promise<{ schemeCode: number; schemeName: string }[]> {
  if (mfapiAllFundsCache) return mfapiAllFundsCache;
  try {
    const res =
      await axios.get<{ schemeCode: number; schemeName: string }[]>('https://api.mfapi.in/mf');
    mfapiAllFundsCache = res.data;
    return mfapiAllFundsCache;
  } catch {
    return [];
  }
}

/**
 * Word-recall: fraction of CDSL's distinctive words that appear in the candidate name.
 * High recall = candidate contains all/most of what CDSL describes.
 * This handles "ABSL PSU Equity" vs "Aditya Birla Sun Life PSU Equity" mismatches
 * where Jaccard is low but key discriminating words (PSU, Equity) all match.
 */
function wordRecall(cdslName: string, candidate: string): number {
  const cdslWords = new Set(normalizeFundName(cdslName));
  const candidateWords = new Set(normalizeFundName(candidate));
  if (cdslWords.size === 0) return 0;
  const matched = [...cdslWords].filter((w) => candidateWords.has(w)).length;
  return matched / cdslWords.size;
}

/** For a CDSL name with no local DB match, find the best MFAPI direct-growth scheme */
async function lookupMFAPIScheme(
  cdslName: string
): Promise<{ schemeName: string; schemeCode: number } | null> {
  const allFunds = await getMFAPIAllFunds();
  if (allFunds.length === 0) return null;

  // Prefer Direct Growth / Direct Plan Growth schemes
  const directFunds = allFunds.filter((f) => {
    const l = f.schemeName.toLowerCase();
    return (
      l.includes('direct') && (l.includes('growth') || l.includes(' gr ') || l.endsWith(' gr'))
    );
  });

  const search = (pool: typeof allFunds) => {
    let best: { schemeName: string; schemeCode: number } | null = null;
    let bestScore = 0;

    for (const fund of pool) {
      const jaccard = fundNameSimilarity(cdslName, fund.schemeName);
      // Also check recall — catches cases where fund is known by abbreviation (ABSL vs Aditya Birla)
      const recall = wordRecall(cdslName, fund.schemeName);
      // Primary: jaccard >= 0.6. Secondary: all CDSL words are in candidate (recall = 1.0)
      const score = jaccard >= 0.6 ? jaccard : recall >= 1.0 ? 0.55 + recall * 0.1 : 0;
      if (score > bestScore) {
        bestScore = score;
        best = { schemeName: fund.schemeName, schemeCode: fund.schemeCode };
      }
    }
    return bestScore > 0 ? best : null;
  };

  return search(directFunds) ?? search(allFunds);
}

async function canonicalizeMFNames(
  db: ReturnType<typeof import('../database').default.getDb>,
  userId: ObjectId,
  txns: ReturnType<typeof parseCdslMFTransactions>
): Promise<ReturnType<typeof parseCdslMFTransactions>> {
  const [mfNames, infoNames] = await Promise.all([
    db.collection('mutualFunds').distinct('fundName', { userId }),
    db.collection('mutualFundsInfo').distinct('fundName', { userId }),
  ]);
  const existingNames = [...new Set([...mfNames, ...infoNames])] as string[];

  return Promise.all(
    txns.map(async (tx) => {
      // 1. Try local DB match (user may have entered a different short name)
      let bestName = '';
      let bestScore = 0;
      for (const name of existingNames) {
        const score = fundNameSimilarity(tx.fundName, name);
        if (score > bestScore) {
          bestScore = score;
          bestName = name;
        }
      }

      if (bestScore >= 0.6) {
        if (bestName !== tx.fundName) {
          console.log(
            `[Email Import] Fund name mapped (local): "${tx.fundName}" → "${bestName}" (score: ${bestScore.toFixed(2)})`
          );
        }
        return { ...tx, fundName: bestName };
      }

      // 2. Brand new fund — look up correct name from MFAPI so NAV fetches work
      const mfapiMatch = await lookupMFAPIScheme(tx.fundName);
      if (mfapiMatch) {
        console.log(
          `[Email Import] Fund name mapped (MFAPI): "${tx.fundName}" → "${mfapiMatch.schemeName}"`
        );

        // Auto-create mutualFundsInfo so NAV history is immediately fetchable
        const existsInfo = await db
          .collection('mutualFundsInfo')
          .findOne({ userId, fundName: mfapiMatch.schemeName });
        if (!existsInfo) {
          await db.collection('mutualFundsInfo').insertOne({
            userId,
            fundName: mfapiMatch.schemeName,
            schemeNumber: mfapiMatch.schemeCode,
            sipAmount: 0,
            platform: 'CDSL',
            date: new Date(),
          });
          console.log(
            `[Email Import] Auto-created mutualFundsInfo for "${mfapiMatch.schemeName}" (scheme: ${mfapiMatch.schemeCode})`
          );
        }

        return { ...tx, fundName: mfapiMatch.schemeName };
      }

      // 3. No match anywhere — keep CDSL name as fallback
      console.log(`[Email Import] No MFAPI match for "${tx.fundName}" — keeping CDSL name`);
      return tx;
    })
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFrontendUrl(): string {
  return config.NODE_ENV === 'production'
    ? 'https://www.my-finances.site'
    : 'http://localhost:3000';
}

function derivesCdslPassword(encryptedPan: string | undefined): string {
  if (!encryptedPan) return '';
  try {
    return decrypt(encryptedPan).toUpperCase();
  } catch {
    return '';
  }
}

function derivesSafeGoldPassword(name: string, phone: string | undefined): string {
  if (!name || !phone) return '';
  const first4 = name.replace(/\s+/g, '').slice(0, 4).toUpperCase();
  const last4 = phone.slice(-4);
  return first4 + last4;
}

async function deduplicateMF(
  db: ReturnType<typeof import('../database').default.getDb>,
  userId: ObjectId,
  txns: ReturnType<typeof parseCdslMFTransactions>
) {
  const newMF: typeof txns = [];
  let skippedMF = 0;

  for (const tx of txns) {
    const txDate = new Date(tx.date);
    const dateMin = new Date(txDate);
    dateMin.setDate(dateMin.getDate() - 2);
    const dateMax = new Date(txDate);
    dateMax.setDate(dateMax.getDate() + 2);

    const unitsMin = tx.numOfUnits - 0.01;
    const unitsMax = tx.numOfUnits + 0.01;

    // Don't match on fundName — user may have entered a different/shorter name.
    // numOfUnits ±0.01 + date ±2 days + type is unique enough in practice.
    const existsInDb = await db.collection('mutualFunds').findOne({
      userId,
      numOfUnits: { $gte: unitsMin, $lte: unitsMax },
      type: tx.type,
      date: { $gte: dateMin, $lte: dateMax },
    });

    if (existsInDb) {
      skippedMF++;
      continue;
    }

    // Also deduplicate within the batch itself — the same transaction can appear
    // in multiple monthly CAS PDFs (e.g. July txn shows up in July + August CAS).
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const existsInBatch = newMF.some(
      (existing) =>
        existing.type === tx.type &&
        Math.abs(existing.numOfUnits - tx.numOfUnits) <= 0.01 &&
        Math.abs(new Date(existing.date).getTime() - txDate.getTime()) <= TWO_DAYS_MS
    );

    if (existsInBatch) {
      skippedMF++;
      continue;
    }

    newMF.push(tx);
  }

  return { newMF, skippedMF };
}

async function deduplicateGold(
  db: ReturnType<typeof import('../database').default.getDb>,
  userId: ObjectId,
  txns: ReturnType<typeof parseSafeGoldTransactions>
) {
  const newGold: typeof txns = [];
  let skippedGold = 0;

  for (const tx of txns) {
    const txDate = new Date(tx.date);
    const dateMin = new Date(txDate);
    dateMin.setDate(dateMin.getDate() - 2);
    const dateMax = new Date(txDate);
    dateMax.setDate(dateMax.getDate() + 2);

    const existsInDb = await db.collection('digitalGold').findOne({
      userId,
      quantity: { $gte: tx.quantity - 0.01, $lte: tx.quantity + 0.01 },
      type: tx.type,
      date: { $gte: dateMin, $lte: dateMax },
    });

    if (existsInDb) {
      skippedGold++;
      continue;
    }

    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const existsInBatch = newGold.some(
      (existing) =>
        existing.type === tx.type &&
        Math.abs(existing.quantity - tx.quantity) <= 0.01 &&
        Math.abs(new Date(existing.date).getTime() - txDate.getTime()) <= TWO_DAYS_MS
    );

    if (existsInBatch) {
      skippedGold++;
      continue;
    }

    newGold.push(tx);
  }

  return { newGold, skippedGold };
}

function docForMF(userId: ObjectId) {
  return (tx: ReturnType<typeof parseCdslMFTransactions>[number]) => ({
    userId,
    type: tx.type,
    date: new Date(tx.date),
    fundName: tx.fundName,
    numOfUnits: tx.numOfUnits,
    fundPrice: tx.fundPrice,
    amount: tx.amount,
    platform: 'CDSL',
  });
}

function docForGold(userId: ObjectId) {
  return (tx: ReturnType<typeof parseSafeGoldTransactions>[number]) => ({
    userId,
    type: tx.type,
    date: new Date(tx.date),
    goldPrice: tx.goldPrice,
    quantity: tx.quantity,
    amount: tx.amount,
    tax: tx.tax ?? 0,
    platform: tx.platform ?? 'SafeGold',
  });
}

// ─── Stock Holdings Helpers ───────────────────────────────────────────────────

interface CanonicalStockHolding {
  stockName: string; // Yahoo Finance symbol (e.g. "MSTCLTD.NS")
  numOfShares: number;
  marketPrice: number;
  amount: number;
  date: Date;
  type: 'credit';
}

/**
 * Collapse duplicate holdings from multiple monthly CAS PDFs.
 * Keep the entry with the largest numOfShares (most recent snapshot).
 */
function deduplicateHoldingsList(holdings: ParsedStockHolding[]): ParsedStockHolding[] {
  const map = new Map<string, ParsedStockHolding>();
  for (const h of holdings) {
    const key = h.isin;
    const existing = map.get(key);
    if (!existing || h.numOfShares > existing.numOfShares) {
      map.set(key, h);
    }
  }
  return [...map.values()];
}

/**
 * Map CDSL company names to Yahoo Finance NSE symbols.
 * Skips stocks that already have any transaction in the DB (user already tracks them).
 */
async function canonicalizeStockNames(
  db: ReturnType<typeof import('../database').default.getDb>,
  userId: ObjectId,
  holdings: ParsedStockHolding[]
): Promise<CanonicalStockHolding[]> {
  const existingNames = (await db
    .collection('stocks')
    .distinct('stockName', { userId })) as string[];

  const existingSet = new Set(existingNames.map((n) => n.replace(/\.NS$/i, '').toUpperCase()));

  const results: CanonicalStockHolding[] = [];

  for (const holding of holdings) {
    let symbol: string | null = null;

    try {
      const searchResults = await StocksService.searchStocks(holding.companyName);
      if (searchResults.length > 0) {
        symbol = searchResults[0].symbol; // e.g. "MSTCLTD.NS"
      }
    } catch {
      console.log(`[Email Import] Yahoo Finance search failed for "${holding.companyName}"`);
    }

    const resolvedName = symbol ?? holding.companyName;
    const resolvedKey = resolvedName.replace(/\.NS$/i, '').toUpperCase();

    // Skip stocks the user already tracks (any existing transaction for that symbol)
    if (existingSet.has(resolvedKey)) {
      console.log(`[Email Import] Stock "${resolvedName}" already in DB — skipping`);
      continue;
    }

    if (symbol && symbol !== holding.companyName) {
      console.log(`[Email Import] Stock name mapped: "${holding.companyName}" → "${symbol}"`);
    }

    results.push({
      stockName: resolvedName,
      numOfShares: holding.numOfShares,
      marketPrice: holding.marketPrice,
      amount: holding.amount,
      date: holding.date,
      type: 'credit',
    });
  }

  return results;
}

async function deduplicateStocks(
  db: ReturnType<typeof import('../database').default.getDb>,
  userId: ObjectId,
  holdings: CanonicalStockHolding[]
) {
  const newStocks: CanonicalStockHolding[] = [];
  let skippedStocks = 0;

  for (const h of holdings) {
    const symbolBase = h.stockName.replace(/\.NS$/i, '');

    // Match with or without .NS suffix
    const existsInDb = await db.collection('stocks').findOne({
      userId,
      stockName: { $in: [h.stockName, symbolBase, `${symbolBase}.NS`] },
    });

    if (existsInDb) {
      skippedStocks++;
      continue;
    }

    const existsInBatch = newStocks.some((s) => s.stockName.replace(/\.NS$/i, '') === symbolBase);

    if (existsInBatch) {
      skippedStocks++;
      continue;
    }

    newStocks.push(h);
  }

  return { newStocks, skippedStocks };
}

function docForStock(userId: ObjectId) {
  return (h: CanonicalStockHolding) => ({
    userId,
    type: h.type,
    date: new Date(h.date),
    stockName: h.stockName,
    numOfShares: h.numOfShares,
    marketPrice: h.marketPrice,
    amount: h.amount,
    platform: 'CDSL',
  });
}

async function deduplicateCrypto(
  db: ReturnType<typeof import('../database').default.getDb>,
  userId: ObjectId,
  trades: ParsedCoinDCXTrade[]
) {
  const newCrypto: ParsedCoinDCXTrade[] = [];
  let skippedCrypto = 0;

  for (const tx of trades) {
    const txDate = new Date(tx.date);
    const dateMin = new Date(txDate);
    dateMin.setDate(dateMin.getDate() - 1);
    const dateMax = new Date(txDate);
    dateMax.setDate(dateMax.getDate() + 1);

    const existsInDb = await db.collection('crypto').findOne({
      userId,
      coinSymbol: tx.coinSymbol,
      quantity: { $gte: tx.quantity - 0.0001, $lte: tx.quantity + 0.0001 },
      type: tx.type,
      date: { $gte: dateMin, $lte: dateMax },
    });

    if (existsInDb) {
      skippedCrypto++;
      continue;
    }

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const existsInBatch = newCrypto.some(
      (existing) =>
        existing.coinSymbol === tx.coinSymbol &&
        existing.type === tx.type &&
        Math.abs(existing.quantity - tx.quantity) <= 0.0001 &&
        Math.abs(new Date(existing.date).getTime() - txDate.getTime()) <= ONE_DAY_MS
    );

    if (existsInBatch) {
      skippedCrypto++;
      continue;
    }

    newCrypto.push(tx);
  }

  return { newCrypto, skippedCrypto };
}

function docForCrypto(userId: ObjectId) {
  return (tx: ParsedCoinDCXTrade) => ({
    userId,
    type: tx.type,
    date: new Date(tx.date),
    coinName: tx.coinName,
    coinSymbol: tx.coinSymbol,
    quantity: tx.quantity,
    coinPrice: tx.coinPrice,
    amount: tx.amount,
    platform: 'CoinDCX',
  });
}
