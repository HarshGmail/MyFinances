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
import { isPdfServiceAvailable, submitPdfJob, waitForPdfJob } from '../services/pdfParsingClient';
import { decrypt } from '../utils/encryption';
import config from '../config';
import logger from '../utils/logger';

// ─── Wake PDF Parser ──────────────────────────────────────────────────────────
// Fires a health-check at the Rust service in the background so its cold start
// happens while the user is reading the integrations page, not when they sync.

export async function wakePdfParser(_req: Request, res: Response) {
  if (isPdfServiceAvailable()) {
    void axios.get(`${config.PDF_PARSING_SERVICE_URL}/health`).catch(() => {
      // Intentionally swallowed — this is best-effort pre-warming only
    });
  }
  res.status(200).json({ success: true });
}

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
    logger.error({ err }, 'OAuth callback error');
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
    logger.error({ err }, 'Get email integration status error');
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
    logger.error({ err }, 'Reset sync error');
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
    logger.error({ err }, 'Disconnect error');
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
    logger.error({ err }, 'Update settings error');
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

    const integrations = await db.collection('emailIntegrations').find({ userId }).toArray();
    if (integrations.length === 0) {
      res.status(400).json({ success: false, message: 'No Gmail account linked' });
      return;
    }

    const userDoc = await db.collection('users').findOne({ _id: userId });
    if (!userDoc) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Create the job record and return its ID immediately — the actual work
    // happens in the background so the HTTP response is never held open.
    const jobId = new ObjectId().toHexString();
    await db.collection('syncJobs').insertOne({
      _id: new ObjectId(jobId),
      userId,
      status: 'processing',
      createdAt: new Date(),
    });

    res.status(202).json({ success: true, data: { jobId } });

    void runSyncInBackground(jobId, userId, userDoc, integrations, db);
  } catch (err) {
    logger.error({ err }, 'Sync error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── Sync Status ──────────────────────────────────────────────────────────────

export async function getSyncJobStatus(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { jobId } = req.params;
    const db = database.getDb();

    const job = await db.collection('syncJobs').findOne({
      _id: new ObjectId(jobId),
      userId: new ObjectId(user.userId),
    });

    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    res.json({
      success: true,
      data: { status: job.status, result: job.result ?? null, error: job.error ?? null },
    });
  } catch (err) {
    logger.error({ err }, 'Get sync job status error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// ─── Background sync worker ───────────────────────────────────────────────────

async function runSyncInBackground(
  jobId: string,
  userId: ObjectId,
  userDoc: Record<string, unknown>,
  integrations: Record<string, unknown>[],
  db: ReturnType<typeof database.getDb>
) {
  const cdslPassword = derivesCdslPassword(userDoc.panNumber as string | undefined);
  const safegoldPassword = derivesSafeGoldPassword(
    userDoc.name as string,
    userDoc.phone as string | undefined
  );

  const errors: string[] = [];
  const allMFTransactions: ReturnType<typeof parseCdslMFTransactions> = [];
  const allGoldTransactions: ReturnType<typeof parseSafeGoldTransactions> = [];
  const allStockHoldings: ParsedStockHolding[] = [];
  const allCryptoTrades: ParsedCoinDCXTrade[] = [];
  const useRustService = isPdfServiceAvailable();

  logger.info(
    { jobId, accounts: integrations.length, useRustService, hasPan: !!cdslPassword, hasPhone: !!safegoldPassword },
    '[Sync] Starting background sync'
  );

  try {
    for (const integration of integrations) {
      const afterDate: Date | undefined = (integration.lastSyncAt as Date | null) ?? undefined;
      const accountTag = integration.email as string;
      const cdslPasswords = cdslPassword ? [cdslPassword, ''] : [''];
      const sgPasswords = safegoldPassword ? [safegoldPassword, ''] : [''];

      logger.info(
        { account: accountTag, afterDate: afterDate?.toISOString() ?? 'full sync (no lastSyncAt)', useRustService },
        '[Sync] Processing account'
      );

      // ── CDSL ──────────────────────────────────────────────────────────────
      try {
        logger.info({ account: accountTag, afterDate: afterDate?.toISOString() }, '[Sync] Fetching CDSL emails');
        const cdslPdfs = await fetchPdfAttachments(
          integration.refreshToken as string,
          'from:eCAS@cdslstatement.com has:attachment',
          afterDate
        );
        logger.info({ account: accountTag, count: cdslPdfs.length }, '[Sync] CDSL PDFs fetched');

        if (cdslPdfs.length > 0) {
          if (useRustService) {
            try {
              logger.info({ account: accountTag, pdfCount: cdslPdfs.length }, '[Sync] Submitting CDSL PDFs to Rust service');
              const rustJobId = await submitPdfJob('cdsl_cas', cdslPdfs, cdslPasswords);
              logger.info({ account: accountTag, rustJobId }, '[Sync] Rust CDSL job submitted, waiting...');
              const result = await waitForPdfJob(rustJobId);
              logger.info({ account: accountTag, rustJobId, parserType: result?.parser_type }, '[Sync] Rust CDSL job complete');
              if (result?.parser_type === 'cdsl_cas') {
                // TODO: map Rust MfTransaction[] to Node.js parseCdslMFTransactions format
                // once the Rust CDSL parser is implemented
              }
            } catch (e) {
              const msg = `[${accountTag}] CDSL Rust parse error: ${e instanceof Error ? e.message : String(e)}`;
              errors.push(msg);
              logger.error({ err: e, account: accountTag }, '[Sync] CDSL Rust parse error');
            }
          } else {
            for (const pdf of cdslPdfs) {
              try {
                const text = await extractTextFromPdf(pdf, cdslPasswords);
                const mfTxs = parseCdslMFTransactions(text);
                const holdings = parseCdslStockHoldings(text);
                allMFTransactions.push(...mfTxs);
                allStockHoldings.push(...holdings);
                logger.info({ account: accountTag, mfCount: mfTxs.length, holdingsCount: holdings.length }, '[Sync] CDSL PDF parsed');
              } catch (e) {
                const msg = `[${accountTag}] CDSL PDF parse error: ${e instanceof Error ? e.message : String(e)}`;
                errors.push(msg);
                logger.error({ err: e, account: accountTag }, '[Sync] CDSL PDF parse error');
              }
            }
          }
        }
      } catch (e) {
        const msg = `[${accountTag}] CDSL email fetch error: ${e instanceof Error ? e.message : String(e)}`;
        errors.push(msg);
        const isInvalidGrant = e instanceof Error && e.message.includes('invalid_grant');
        logger.error(
          { err: e, account: accountTag, isInvalidGrant },
          isInvalidGrant
            ? '[Sync] CDSL fetch failed — invalid_grant means the OAuth token was revoked or expired; user must reconnect Gmail'
            : '[Sync] CDSL email fetch error'
        );
      }

      // ── SafeGold statement ────────────────────────────────────────────────
      try {
        const sgSender = (integration.safegoldSender as string) ?? 'estatements@safegold.in';
        logger.info({ account: accountTag, sender: sgSender, afterDate: afterDate?.toISOString() }, '[Sync] Fetching SafeGold statement emails');
        const sgPdfs = await fetchPdfAttachments(
          integration.refreshToken as string,
          `from:${sgSender} has:attachment`,
          afterDate
        );
        logger.info({ account: accountTag, count: sgPdfs.length }, '[Sync] SafeGold statement PDFs fetched');

        if (sgPdfs.length > 0) {
          if (useRustService) {
            try {
              logger.info({ account: accountTag, pdfCount: sgPdfs.length }, '[Sync] Submitting SafeGold PDFs to Rust service');
              const rustJobId = await submitPdfJob('safe_gold', sgPdfs, sgPasswords);
              logger.info({ account: accountTag, rustJobId }, '[Sync] Rust SafeGold job submitted, waiting...');
              const result = await waitForPdfJob(rustJobId);
              logger.info({ account: accountTag, rustJobId, parserType: result?.parser_type }, '[Sync] Rust SafeGold job complete');
              if (result?.parser_type === 'safe_gold') {
                // TODO: map Rust GoldTransaction[] to Node.js parseSafeGoldTransactions format
                // once the Rust SafeGold parser is implemented
              }
            } catch (e) {
              const msg = `[${accountTag}] SafeGold Rust parse error: ${e instanceof Error ? e.message : String(e)}`;
              errors.push(msg);
              logger.error({ err: e, account: accountTag }, '[Sync] SafeGold Rust parse error');
            }
          } else {
            for (const pdf of sgPdfs) {
              try {
                const text = await extractTextFromPdf(pdf, sgPasswords);
                const txs = parseSafeGoldTransactions(text);
                allGoldTransactions.push(...txs);
                logger.info({ account: accountTag, count: txs.length }, '[Sync] SafeGold statement PDF parsed');
              } catch (e) {
                const msg = `[${accountTag}] SafeGold PDF parse error: ${e instanceof Error ? e.message : String(e)}`;
                errors.push(msg);
                logger.error({ err: e, account: accountTag }, '[Sync] SafeGold PDF parse error');
              }
            }
          }
        }
      } catch (e) {
        const msg = `[${accountTag}] SafeGold email fetch error: ${e instanceof Error ? e.message : String(e)}`;
        errors.push(msg);
        const isInvalidGrant = e instanceof Error && e.message.includes('invalid_grant');
        logger.error(
          { err: e, account: accountTag, isInvalidGrant },
          isInvalidGrant
            ? '[Sync] SafeGold fetch failed — invalid_grant means the OAuth token was revoked or expired; user must reconnect Gmail'
            : '[Sync] SafeGold email fetch error'
        );
      }

      // ── SafeGold invoices (stays in Node.js — not encrypted, quick parse) ─
      try {
        logger.info({ account: accountTag, afterDate: afterDate?.toISOString() }, '[Sync] Fetching SafeGold invoice emails');
        const sgInvoicePdfs = await fetchPdfAttachments(
          integration.refreshToken as string,
          'from:noreply@safegold.in has:attachment',
          afterDate
        );
        logger.info({ account: accountTag, count: sgInvoicePdfs.length }, '[Sync] SafeGold invoice PDFs fetched');

        for (const pdf of sgInvoicePdfs) {
          try {
            const text = await extractTextFromPdf(pdf, []);
            const tx = parseSafeGoldInvoice(text);
            if (tx) {
              allGoldTransactions.push(tx);
              logger.info({ account: accountTag, date: tx.date }, '[Sync] SafeGold invoice parsed');
            }
          } catch (e) {
            const msg = `[${accountTag}] SafeGold invoice parse error: ${e instanceof Error ? e.message : String(e)}`;
            errors.push(msg);
            logger.error({ err: e, account: accountTag }, '[Sync] SafeGold invoice parse error');
          }
        }
      } catch (e) {
        const msg = `[${accountTag}] SafeGold invoice fetch error: ${e instanceof Error ? e.message : String(e)}`;
        errors.push(msg);
        const isInvalidGrant = e instanceof Error && e.message.includes('invalid_grant');
        logger.error(
          { err: e, account: accountTag, isInvalidGrant },
          isInvalidGrant
            ? '[Sync] SafeGold invoice fetch failed — invalid_grant; user must reconnect Gmail'
            : '[Sync] SafeGold invoice fetch error'
        );
      }

      // ── CoinDCX (email body, not PDF — always in Node.js) ─────────────────
      try {
        logger.info({ account: accountTag, afterDate: afterDate?.toISOString() }, '[Sync] Fetching CoinDCX trade emails');
        const cdxBodies = await fetchEmailBodies(
          integration.refreshToken as string,
          'from:no-reply@coindcx.com subject:"CoinDCX Trade Executed"',
          afterDate
        );
        logger.info({ account: accountTag, count: cdxBodies.length }, '[Sync] CoinDCX emails fetched');

        for (const body of cdxBodies) {
          try {
            const trade = parseCoinDCXTradeEmail(body);
            if (trade) {
              allCryptoTrades.push(trade);
              logger.info({ account: accountTag, coin: trade.coinSymbol, date: trade.date }, '[Sync] CoinDCX trade parsed');
            }
          } catch (e) {
            const msg = `[${accountTag}] CoinDCX parse error: ${e instanceof Error ? e.message : String(e)}`;
            errors.push(msg);
            logger.error({ err: e, account: accountTag }, '[Sync] CoinDCX email parse error');
          }
        }
      } catch (e) {
        const msg = `[${accountTag}] CoinDCX fetch error: ${e instanceof Error ? e.message : String(e)}`;
        errors.push(msg);
        const isInvalidGrant = e instanceof Error && e.message.includes('invalid_grant');
        logger.error(
          { err: e, account: accountTag, isInvalidGrant },
          isInvalidGrant
            ? '[Sync] CoinDCX fetch failed — invalid_grant; user must reconnect Gmail'
            : '[Sync] CoinDCX fetch error'
        );
      }
    }

    // ── Deduplicate and resolve names ────────────────────────────────────────
    const canonicalMF = await canonicalizeMFNames(db, userId, allMFTransactions);
    const { newMF, skippedMF } = await deduplicateMF(db, userId, canonicalMF);
    const { newGold, skippedGold } = await deduplicateGold(db, userId, allGoldTransactions);

    const dedupedHoldings = deduplicateHoldingsList(allStockHoldings);
    const canonicalStocks = await canonicalizeStockNames(db, userId, dedupedHoldings);
    const { newStocks, skippedStocks } = await deduplicateStocks(db, userId, canonicalStocks);

    const { newCrypto, skippedCrypto } = await deduplicateCrypto(db, userId, allCryptoTrades);

    await db
      .collection('emailIntegrations')
      .updateMany({ userId }, { $set: { lastSyncAt: new Date() } });

    logger.info(
      {
        jobId,
        newMF: newMF.length,
        newGold: newGold.length,
        newStocks: newStocks.length,
        newCrypto: newCrypto.length,
        skipped: skippedMF + skippedGold + skippedStocks + skippedCrypto,
        errorCount: errors.length,
        errors,
      },
      '[Sync] Sync complete'
    );

    await db.collection('syncJobs').updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          status: 'done',
          completedAt: new Date(),
          result: {
            mutualFunds: newMF,
            gold: newGold,
            stocks: newStocks,
            crypto: newCrypto,
            duplicatesSkipped: skippedMF + skippedGold + skippedStocks + skippedCrypto,
            errors,
          },
        },
      }
    );
  } catch (err) {
    logger.error({ err }, `[syncJob:${jobId}] Unhandled error`);
    await db.collection('syncJobs').updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          status: 'failed',
          completedAt: new Date(),
          error: err instanceof Error ? err.message : 'Internal error',
        },
      }
    );
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
    logger.error({ err }, 'Import error');
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
          logger.info(
            `[Email Import] Fund name mapped (local): "${tx.fundName}" → "${bestName}" (score: ${bestScore.toFixed(2)})`
          );
        }
        return { ...tx, fundName: bestName };
      }

      // 2. Brand new fund — look up correct name from MFAPI so NAV fetches work
      const mfapiMatch = await lookupMFAPIScheme(tx.fundName);
      if (mfapiMatch) {
        logger.info(
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
          logger.info(
            `[Email Import] Auto-created mutualFundsInfo for "${mfapiMatch.schemeName}" (scheme: ${mfapiMatch.schemeCode})`
          );
        }

        return { ...tx, fundName: mfapiMatch.schemeName };
      }

      // 3. No match anywhere — keep CDSL name as fallback
      logger.info(`[Email Import] No MFAPI match for "${tx.fundName}" — keeping CDSL name`);
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
      logger.info(`[Email Import] Yahoo Finance search failed for "${holding.companyName}"`);
    }

    const resolvedName = symbol ?? holding.companyName;
    const resolvedKey = resolvedName.replace(/\.NS$/i, '').toUpperCase();

    // Skip stocks the user already tracks (any existing transaction for that symbol)
    if (existingSet.has(resolvedKey)) {
      logger.info(`[Email Import] Stock "${resolvedName}" already in DB — skipping`);
      continue;
    }

    if (symbol && symbol !== holding.companyName) {
      logger.info(`[Email Import] Stock name mapped: "${holding.companyName}" → "${symbol}"`);
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
