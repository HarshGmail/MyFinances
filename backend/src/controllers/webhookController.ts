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
 * Resend's inbound webhook payload does not include the email body.
 * Fetch it via GET /emails/receiving/{id} (the Resend SDK's emails.get()
 * hits /emails/{id} which is for outbound only — inbound 404s there).
 */
async function fetchEmailBodyFromResend(
  emailId: string
): Promise<{ text?: string; html?: string }> {
  if (!config.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured — cannot fetch email body');
    return {};
  }
  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${config.RESEND_API_KEY}` },
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error(
        { status: res.status, body, emailId },
        'Resend API error fetching inbound email'
      );
      return {};
    }
    const data = (await res.json()) as { text?: string | null; html?: string | null };
    return { text: data.text ?? undefined, html: data.html ?? undefined };
  } catch (error) {
    logger.error({ err: error, emailId }, 'Failed to fetch inbound email from Resend');
    return {};
  }
}

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
    // Resend sends `email_id`; some older shapes may use `id`. Support both.
    id?: string;
    email_id?: string;
    // Resend sends `from` as a plain string ("x@y.com" or "Name <x@y.com>"),
    // but we also tolerate { email, name } objects.
    from: string | { email: string; name?: string };
    // Resend sends `to` as string[]; we also tolerate a string.
    to: string | string[];
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

function extractEmailAddress(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'object' && value !== null && 'email' in value) {
    return String((value as { email: unknown }).email || '')
      .trim()
      .toLowerCase();
  }
  const str = String(value);
  // Parse "Name <email@example.com>" format, or return as-is
  const match = str.match(/<([^>]+)>/);
  return (match ? match[1] : str).trim().toLowerCase();
}

function extractToAddresses(value: unknown): string[] {
  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => extractEmailAddress(item)).filter((s) => s.length > 0);
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

    // Log every hit so we can diagnose payload shape if things break
    logger.info(
      {
        eventType: event?.type,
        hasData: !!event?.data,
        dataKeys: event?.data ? Object.keys(event.data) : [],
      },
      'Webhook received'
    );

    // Only process email.received events
    if (event.type !== 'email.received') {
      res.status(200).json({ success: true, message: 'Event ignored' });
      return;
    }

    const {
      id,
      email_id,
      from,
      to,
      subject,
      text: rawText,
      html: rawHtml,
      attachments,
    } = event.data;
    const emailId = id || email_id;
    const fromEmail = extractEmailAddress(from);
    const toAddresses = extractToAddresses(to);

    // Resend's inbound webhook omits text/html. Fetch via API using email_id.
    let text = rawText;
    let html = rawHtml;
    if (!text && !html && emailId) {
      logger.info({ emailId }, 'Email body not in webhook payload — fetching from Resend API');
      const fetched = await fetchEmailBodyFromResend(emailId);
      text = fetched.text;
      html = fetched.html;
    }

    logger.info(
      {
        emailId,
        fromEmail,
        toAddresses,
        subject,
        hasText: !!text,
        hasHtml: !!html,
        textLength: text?.length ?? 0,
      },
      'Received email via webhook'
    );

    // Only process emails to transactions-ingest@<domain>
    if (!toAddresses.some((addr) => addr.includes('transactions-ingest'))) {
      logger.info({ toAddresses }, 'Email not for transactions-ingest, ignoring');
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
    if (!user && fromEmail) {
      user = await db.collection('users').findOne({ ingestSenderEmail: fromEmail });
      if (user) {
        logger.info({ emailId, fromEmail }, 'Matched user via ingestSenderEmail fallback');
      }
    }

    if (!user) {
      logger.warn(
        {
          emailId,
          fromEmail,
          hadTokenInBody: !!ingestToken,
          bodyPreview: emailBody.slice(0, 300),
        },
        'No user found for ingest token or sender email'
      );
      res.status(200).json({ success: true, message: 'Unrecognized sender or invalid token' });
      return;
    }

    // Process the email as UPI ingest
    const result = await processUpiEmailIngest(
      {
        from: fromEmail,
        to: toAddresses.join(','),
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
