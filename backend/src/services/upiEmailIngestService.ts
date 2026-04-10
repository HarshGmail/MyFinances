import { ObjectId } from 'mongodb';
import database from '../database';
import logger from '../utils/logger';

interface EmailData {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{ filename: string; content: string }>;
}

/**
 * Extract ingest token from email body
 * Expected format: "Token: YOUR_INGEST_TOKEN_HERE"
 */
export function extractTokenFromEmailBody(emailBody: string): string | null {
  const tokenMatch = emailBody.match(/Token:\s*([a-zA-Z0-9\-_]+)/i);
  return tokenMatch ? tokenMatch[1].trim() : null;
}

/**
 * Extract SMS content from email body (everything after the token line)
 */
export function extractSmsFromEmailBody(emailBody: string): string {
  // Remove the token line to get just the SMS content
  return emailBody.replace(/Token:\s*[a-zA-Z0-9\-_]+\s*/i, '').trim();
}

function parseUpiSms(smsText: string): { amount: number | null; merchant: string } {
  const text = smsText.trim();

  // Extract amount — handles Rs.500, Rs 500, INR 500, Rs.1,500.00
  const amountMatch = text.match(/(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;

  // Extract merchant — try patterns in order of specificity
  let merchant = 'UPI Payment';

  // HDFC / Kotak: "Info: UPI/P2M/123456/MerchantName" or "UPI/DR/123456/Merchant Name"
  const infoUpiMatch = text.match(/UPI\/[A-Z]+\/\d+\/([^.\n]+)/i);
  if (infoUpiMatch) {
    merchant = infoUpiMatch[1].trim();
  }

  // SBI / Axis: "Credited to MerchantName/UPI" or "Credited To MerchantName"
  const creditedMatch = text.match(/[Cc]redited [Tt]o\s+([^/\n.]+?)(?:\/UPI|\/IMPS|\.|\n|$)/i);
  if (!infoUpiMatch && creditedMatch) {
    merchant = creditedMatch[1].trim();
  }

  // ICICI: "UPI:MerchantName Ref No" or "UPI-MerchantName"
  const iciciMatch = text.match(/UPI[:-]\s*([A-Za-z0-9\s&_-]+?)(?:\s+Ref|\s+\d{6,}|$)/i);
  if (!infoUpiMatch && !creditedMatch && iciciMatch) {
    merchant = iciciMatch[1].trim();
  }

  // Fallback: grab word after "to" near "UPI" context
  if (merchant === 'UPI Payment') {
    const toMatch = text.match(
      /(?:to|towards)\s+([A-Za-z0-9\s&_-]{2,30}?)(?:\s+via|\s+UPI|\s+Ref|\.|\n|$)/i
    );
    if (toMatch) merchant = toMatch[1].trim();
  }

  return { amount, merchant };
}

/**
 * Process incoming email from Resend webhook
 * Extracts UPI SMS data from email body, parses it, and inserts as expense transaction
 */
export async function processUpiEmailIngest(
  emailData: EmailData,
  userId: ObjectId
): Promise<{ success: boolean; message: string; transactionId?: string }> {
  try {
    // Extract email body (prefer text, fallback to html)
    let emailBody = emailData.text || emailData.html || '';

    if (!emailBody) {
      logger.warn({ email: emailData.from }, 'Email body is empty');
      return { success: false, message: 'Email body is empty' };
    }

    // Extract SMS content (remove token line)
    emailBody = extractSmsFromEmailBody(emailBody);

    // Check if this is actually a UPI SMS (should contain debit keyword)
    if (!/debit/i.test(emailBody)) {
      logger.info({ email: emailData.from }, 'Skipped: not a debit transaction');
      return { success: false, message: 'Not a debit transaction' };
    }

    // Parse UPI data using existing regex logic
    const { amount, merchant } = parseUpiSms(emailBody);

    if (!amount || amount <= 0) {
      logger.warn({ email: emailData.from, emailBody }, 'Could not parse amount from email');
      return { success: false, message: 'Could not parse amount from email' };
    }

    // Dedup check: within ±1 day window, same amount + merchant
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneDayFuture = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const db = database.getDb();
    const existingTxn = await db.collection('expenseTransactions').findOne({
      userId,
      amount,
      name: merchant,
      date: { $gte: oneDayAgo, $lte: oneDayFuture },
      category: 'UPI',
    });

    if (existingTxn) {
      logger.info(
        { userId: userId.toString(), amount, merchant },
        'Transaction already exists (dedup)'
      );
      return { success: false, message: 'Transaction already exists (dedup)' };
    }

    // Insert transaction
    const entry = {
      userId,
      date: now,
      name: merchant,
      amount,
      category: 'UPI',
      notes: emailBody,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('expenseTransactions').insertOne(entry);

    logger.info(
      { userId: userId.toString(), transactionId: result.insertedId.toString(), amount, merchant },
      'UPI transaction inserted from email'
    );

    return {
      success: true,
      message: 'UPI transaction inserted from email',
      transactionId: result.insertedId.toString(),
    };
  } catch (error) {
    logger.error({ err: error, userId: userId.toString() }, 'Error processing UPI email ingest');
    return { success: false, message: 'Internal server error' };
  }
}

/**
 * For future use: fetch emails from Resend inbox (if Resend provides a fetch API)
 * Currently not needed as webhooks push emails to us
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchPendingUpiEmails(userId: ObjectId): Promise<EmailData[]> {
  // Placeholder for future implementation
  // Resend webhooks push emails, so we don't need to pull them
  return [];
}
