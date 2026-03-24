import { google } from 'googleapis';
import config from '../config';
import { encrypt, decrypt } from '../utils/encryption';

function getOAuthClient() {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET || !config.GOOGLE_REDIRECT_URI) {
    throw new Error(
      'Google OAuth credentials not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)'
    );
  }
  return new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(state: string): string {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force refresh_token to be returned every time
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state,
  });
}

export async function exchangeCode(
  code: string
): Promise<{ encryptedRefreshToken: string; email: string }> {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      'No refresh_token returned. The user may have already granted access — please revoke and retry.'
    );
  }

  // Get the user's email address
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  const email = data.email ?? '';

  return {
    encryptedRefreshToken: encrypt(tokens.refresh_token),
    email,
  };
}

export async function fetchPdfAttachments(
  encryptedRefreshToken: string,
  gmailQuery: string,
  afterDate?: Date
): Promise<Buffer[]> {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: decrypt(encryptedRefreshToken) });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Append date filter for incremental sync (Gmail uses epoch seconds)
  const query = afterDate
    ? `${gmailQuery} after:${Math.floor(afterDate.getTime() / 1000)}`
    : gmailQuery;

  // Fetch all matching emails via pagination (500 is Gmail API max per page)
  const messages: { id?: string | null }[] = [];
  let pageToken: string | undefined;
  do {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 500,
      pageToken,
    });
    messages.push(...(listRes.data.messages ?? []));
    pageToken = listRes.data.nextPageToken ?? undefined;
  } while (pageToken);
  const pdfBuffers: Buffer[] = [];

  for (const msg of messages) {
    if (!msg.id) continue;
    const msgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id });
    const parts = msgRes.data.payload?.parts ?? [];

    for (const part of parts) {
      const mimeType = part.mimeType ?? '';
      const attachmentId = part.body?.attachmentId;

      if (!attachmentId) continue;
      if (!mimeType.includes('pdf') && !part.filename?.toLowerCase().endsWith('.pdf')) continue;

      const attRes = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: msg.id,
        id: attachmentId,
      });

      const data = attRes.data.data;
      if (data) {
        const buf = Buffer.from(data, 'base64');
        pdfBuffers.push(buf);
      }
    }
  }

  return pdfBuffers;
}

/**
 * Fetch the HTML body of emails matching a Gmail query.
 * Used for emails that carry data in the email body (not as attachments) — e.g. CoinDCX trade confirmations.
 */
export async function fetchEmailBodies(
  encryptedRefreshToken: string,
  gmailQuery: string,
  afterDate?: Date
): Promise<string[]> {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: decrypt(encryptedRefreshToken) });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const query = afterDate
    ? `${gmailQuery} after:${Math.floor(afterDate.getTime() / 1000)}`
    : gmailQuery;

  const messages: { id?: string | null }[] = [];
  let pageToken: string | undefined;
  do {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 500,
      pageToken,
    });
    messages.push(...(listRes.data.messages ?? []));
    pageToken = listRes.data.nextPageToken ?? undefined;
  } while (pageToken);

  const bodies: string[] = [];

  for (const msg of messages) {
    if (!msg.id) continue;
    const msgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
    const payload = msgRes.data.payload;
    if (!payload) continue;

    // Find the HTML part — may be top-level or nested inside multipart
    const htmlBody = extractHtmlBody(payload);
    if (htmlBody) bodies.push(htmlBody);
  }

  return bodies;
}

function extractHtmlBody(payload: import('googleapis').gmail_v1.Schema$MessagePart): string | null {
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  for (const part of payload.parts ?? []) {
    const result = extractHtmlBody(part);
    if (result) return result;
  }

  return null;
}
