import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';

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

export async function ingestUpiTransaction(req: Request, res: Response) {
  try {
    const { token, smsText, reason, categoryUmbrella } = req.body;

    if (!token || !smsText) {
      res.status(400).json({ success: false, message: 'token and smsText are required' });
      return;
    }

    // Only process debit SMS (ignore credit/received)
    if (!/debit/i.test(smsText)) {
      res.status(200).json({ success: true, message: 'Skipped: not a debit transaction' });
      return;
    }

    const db = database.getDb();
    const user = await db.collection('users').findOne({ ingestToken: token });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid token' });
      return;
    }

    const { amount, merchant } = parseUpiSms(smsText);

    if (!amount || amount <= 0) {
      res.status(400).json({ success: false, message: 'Could not parse amount from SMS' });
      return;
    }

    const now = new Date();
    const entry = {
      userId: new ObjectId(user._id),
      date: now,
      name: merchant,
      amount,
      category: 'UPI',
      ...(reason && { reason }),
      ...(categoryUmbrella && { categoryUmbrella }),
      notes: smsText,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('expenseTransactions').insertOne(entry);

    res.status(201).json({
      success: true,
      message: 'Transaction recorded',
      data: { id: result.insertedId, amount, merchant },
    });
  } catch (error) {
    console.error('UPI ingest error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
