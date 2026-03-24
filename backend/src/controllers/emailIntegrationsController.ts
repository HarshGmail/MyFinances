import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { getUserFromRequest } from '../utils/jwtHelpers';
import { getAuthUrl, exchangeCode, fetchPdfAttachments } from '../services/gmailService';
import { extractTextFromPdf } from '../services/pdfParser';
import { parseCdslMFTransactions } from '../services/cdslParser';
import { parseSafeGoldTransactions } from '../services/safegoldParser';
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
    await db.collection('emailIntegrations').updateOne(
      { userId: new ObjectId(userId) },
      {
        $set: {
          userId: new ObjectId(userId),
          email,
          refreshToken: encryptedRefreshToken,
          linkedAt: new Date(),
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
    const integration = await db.collection('emailIntegrations').findOne({
      userId: new ObjectId(user.userId),
    });

    if (!integration) {
      res.json({ success: true, data: { connected: false } });
      return;
    }

    res.json({
      success: true,
      data: {
        connected: true,
        email: integration.email,
        lastSyncAt: integration.lastSyncAt,
        safegoldSender: integration.safegoldSender ?? 'estatements@safegold.in',
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

    const db = database.getDb();
    await db
      .collection('emailIntegrations')
      .updateOne({ userId: new ObjectId(user.userId) }, { $set: { lastSyncAt: null } });
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

    const db = database.getDb();
    await db.collection('emailIntegrations').deleteOne({ userId: new ObjectId(user.userId) });
    res.json({ success: true, message: 'Gmail integration removed' });
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

    const { safegoldSender } = req.body;
    if (safegoldSender && typeof safegoldSender === 'string') {
      const db = database.getDb();
      await db
        .collection('emailIntegrations')
        .updateOne({ userId: new ObjectId(user.userId) }, { $set: { safegoldSender } });
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

    // Load integration
    const integration = await db.collection('emailIntegrations').findOne({
      userId: new ObjectId(user.userId),
    });
    if (!integration) {
      res.status(400).json({ success: false, message: 'No Gmail account linked' });
      return;
    }

    // Load user for PAN and phone (needed for PDF passwords)
    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(user.userId) });
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

    // Use lastSyncAt for incremental sync (skip already-seen emails)
    const afterDate: Date | undefined = integration.lastSyncAt ?? undefined;

    // ── Fetch and parse CDSL emails ──────────────────────────────────────────
    try {
      const cdslQuery = 'from:eCAS@cdslstatement.com has:attachment';
      const cdslPdfs = await fetchPdfAttachments(integration.refreshToken, cdslQuery, afterDate);
      console.log(`[Sync] Found ${cdslPdfs.length} CDSL PDF(s)`);

      for (const pdf of cdslPdfs) {
        try {
          const passwords = cdslPassword ? [cdslPassword, ''] : [''];
          const text = await extractTextFromPdf(pdf, passwords);
          const txns = parseCdslMFTransactions(text);
          allMFTransactions.push(...txns);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`CDSL PDF parse error: ${msg}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`CDSL email fetch error: ${msg}`);
    }

    // ── Fetch and parse SafeGold emails ─────────────────────────────────────
    try {
      const sgSender = integration.safegoldSender ?? 'estatements@safegold.in';
      const sgQuery = `from:${sgSender} has:attachment`;
      const sgPdfs = await fetchPdfAttachments(integration.refreshToken, sgQuery, afterDate);
      console.log(`[Sync] Found ${sgPdfs.length} SafeGold PDF(s)`);

      for (const pdf of sgPdfs) {
        try {
          const passwords = safegoldPassword ? [safegoldPassword, ''] : [''];
          const text = await extractTextFromPdf(pdf, passwords);
          const txns = parseSafeGoldTransactions(text);
          allGoldTransactions.push(...txns);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`SafeGold PDF parse error: ${msg}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`SafeGold email fetch error: ${msg}`);
    }

    // ── Deduplicate against existing DB records ──────────────────────────────
    const userId = new ObjectId(user.userId);

    const { newMF, skippedMF } = await deduplicateMF(db, userId, allMFTransactions);
    const { newGold, skippedGold } = await deduplicateGold(db, userId, allGoldTransactions);

    // Update lastSyncAt
    await db
      .collection('emailIntegrations')
      .updateOne({ userId }, { $set: { lastSyncAt: new Date() } });

    res.json({
      success: true,
      data: {
        mutualFunds: newMF,
        gold: newGold,
        duplicatesSkipped: skippedMF + skippedGold,
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

    const { mutualFunds = [], gold = [] } = req.body;
    const userId = new ObjectId(user.userId);
    const db = database.getDb();

    let importedMF = 0;
    let importedGold = 0;

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
      // Final dedup before insert
      const { newMF } = await deduplicateMF(db, userId, mfDocs);
      if (newMF.length > 0) {
        await db.collection('mutual-funds').insertMany(newMF.map(docForMF(userId)));
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
        await db.collection('gold').insertMany(newGold.map(docForGold(userId)));
        importedGold = newGold.length;
      }
    }

    res.json({
      success: true,
      data: { importedMF, importedGold, total: importedMF + importedGold },
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
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
  const newMF = [];
  let skippedMF = 0;

  for (const tx of txns) {
    const txDate = new Date(tx.date);
    const dateMin = new Date(txDate);
    dateMin.setDate(dateMin.getDate() - 1);
    const dateMax = new Date(txDate);
    dateMax.setDate(dateMax.getDate() + 1);

    const exists = await db.collection('mutual-funds').findOne({
      userId,
      fundName: tx.fundName,
      numOfUnits: tx.numOfUnits,
      type: tx.type,
      date: { $gte: dateMin, $lte: dateMax },
    });

    if (exists) {
      skippedMF++;
    } else {
      newMF.push(tx);
    }
  }

  return { newMF, skippedMF };
}

async function deduplicateGold(
  db: ReturnType<typeof import('../database').default.getDb>,
  userId: ObjectId,
  txns: ReturnType<typeof parseSafeGoldTransactions>
) {
  const newGold = [];
  let skippedGold = 0;

  for (const tx of txns) {
    const txDate = new Date(tx.date);
    const dateMin = new Date(txDate);
    dateMin.setDate(dateMin.getDate() - 1);
    const dateMax = new Date(txDate);
    dateMax.setDate(dateMax.getDate() + 1);

    const exists = await db.collection('gold').findOne({
      userId,
      quantity: tx.quantity,
      type: tx.type,
      date: { $gte: dateMin, $lte: dateMax },
    });

    if (exists) {
      skippedGold++;
    } else {
      newGold.push(tx);
    }
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
