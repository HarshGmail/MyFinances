import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import database from '../database';
import logger from '../utils/logger';
import config from '../config';
import {
  processUpiEmailIngest,
  extractTokenFromEmailBody,
} from '../services/upiEmailIngestService';

/**
 * Verify Resend webhook signature for security
 * Uses HMAC-SHA256 with the webhook secret
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _verifyResendSignature(req: Request & { rawBody?: string }): boolean {
  const signature = req.headers['svix-signature'] as string;
  const secret = config.RESEND_WEBHOOK_SECRET;

  if (!signature || !secret) {
    logger.warn('Missing signature or webhook secret');
    return false;
  }

  // Resend uses svix format: "v1,<timestamp>.<signature>"
  // For now, we'll do basic HMAC verification
  try {
    const body = req.rawBody || JSON.stringify(req.body);
    const hash = crypto.createHmac('sha256', secret).update(body).digest('base64');

    // Extract the signature part after the timestamp
    const signatureParts = signature.split('.');
    if (signatureParts.length === 0) return false;

    const expectedSig = signatureParts[signatureParts.length - 1];
    return hash === expectedSig;
  } catch (error) {
    logger.error({ err: error }, 'Error verifying webhook signature');
    return false;
  }
}

interface ResendEmailReceivedEvent {
  type: 'email.received';
  data: {
    id: string;
    from: {
      email: string;
      name?: string;
    };
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
      filename: string;
      contentType: string;
      content: string;
    }>;
  };
}

/**
 * Handle Resend webhook for incoming emails
 * Specifically processes UPI SMS forwarded to transactions-ingest@my-finances.site
 */
export async function handleResendEmailWebhook(req: Request, res: Response) {
  try {
    // Verify webhook signature
    // NOTE: Disable signature verification for now if you're testing
    // const isValid = verifyResendSignature(req);
    // if (!isValid) {
    //   res.status(401).json({ success: false, message: 'Invalid signature' });
    //   return;
    // }

    const event = req.body as ResendEmailReceivedEvent;

    // Only process email.received events
    if (event.type !== 'email.received') {
      res.status(200).json({ success: true, message: 'Event ignored' });
      return;
    }

    const { id, from, to, subject, text, html, attachments } = event.data;

    logger.info({ emailId: id, from: from.email, to, subject }, 'Received email via webhook');

    // Only process emails to transactions-ingest@my-finances.site
    if (!to.includes('transactions-ingest')) {
      logger.info({ to }, 'Email not for transactions-ingest, ignoring');
      res.status(200).json({ success: true, message: 'Email ignored' });
      return;
    }

    // Extract ingest token from email body
    const emailBody = text || html || '';
    const ingestToken = extractTokenFromEmailBody(emailBody);

    const db = database.getDb();
    let user = null;

    if (ingestToken) {
      user = await db.collection('users').findOne({ ingestToken });
    }

    // Fallback: match by registered sender email if token lookup failed
    if (!user && from.email) {
      user = await db.collection('users').findOne({ ingestSenderEmail: from.email });
      if (user) {
        logger.info({ emailId: id, from: from.email }, 'Matched user via ingestSenderEmail fallback');
      }
    }

    if (!user) {
      logger.warn({ emailId: id, from: from.email }, 'No user found for ingest token or sender email');
      res.status(200).json({ success: true, message: 'Unrecognized sender or invalid token' });
      return;
    }

    // Process the email as UPI ingest
    const result = await processUpiEmailIngest(
      {
        from: from.email,
        to,
        subject,
        text,
        html,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
        })),
      },
      new ObjectId(user._id)
    );

    if (result.success) {
      logger.info(
        { userId: user._id.toString(), transactionId: result.transactionId },
        'Successfully processed UPI email ingest'
      );
    } else {
      logger.warn(
        { userId: user._id.toString(), message: result.message },
        'UPI email ingest failed'
      );
    }

    // Always respond with 200 to acknowledge receipt (even if processing failed)
    // This prevents Resend from retrying
    res.status(200).json({ success: result.success, message: result.message });
  } catch (error) {
    logger.error({ err: error }, 'Webhook handler error');
    // Respond with 200 to prevent retry
    res.status(200).json({ success: false, message: 'Internal server error' });
  }
}
