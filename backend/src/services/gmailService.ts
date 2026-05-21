import { google, gmail_v1 } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import config from '../config';
import { encrypt, decrypt } from '../utils/encryption';

function buildOAuthClient(): OAuth2Client {
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

export class GmailClient {
  private readonly encryptedRefreshToken: string;
  private gmail?: gmail_v1.Gmail;

  constructor(encryptedRefreshToken: string) {
    this.encryptedRefreshToken = encryptedRefreshToken;
  }

  static getAuthUrl(state: string): string {
    const oauth2Client = buildOAuthClient();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state,
    });
  }

  static async exchangeCode(
    code: string
  ): Promise<{ encryptedRefreshToken: string; email: string }> {
    const oauth2Client = buildOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      throw new Error(
        'No refresh_token returned. The user may have already granted access — please revoke and retry.'
      );
    }

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    return {
      encryptedRefreshToken: encrypt(tokens.refresh_token),
      email: data.email ?? '',
    };
  }

  async fetchPdfAttachments(gmailQuery: string, afterDate?: Date): Promise<Buffer[]> {
    const gmail = this.getGmail();
    const messageIds = await this.listMessageIds(gmailQuery, afterDate);
    const pdfBuffers: Buffer[] = [];

    for (const id of messageIds) {
      const msgRes = await gmail.users.messages.get({ userId: 'me', id });
      const parts = msgRes.data.payload?.parts ?? [];

      for (const part of parts) {
        const mimeType = part.mimeType ?? '';
        const attachmentId = part.body?.attachmentId;

        if (!attachmentId) continue;
        if (!mimeType.includes('pdf') && !part.filename?.toLowerCase().endsWith('.pdf')) continue;

        const attRes = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: id,
          id: attachmentId,
        });

        const data = attRes.data.data;
        if (data) {
          pdfBuffers.push(Buffer.from(data, 'base64'));
        }
      }
    }

    return pdfBuffers;
  }

  /**
   * Fetch the HTML body of emails matching a Gmail query.
   * Used for emails that carry data in the email body (not as attachments) — e.g. CoinDCX trade confirmations.
   */
  async fetchEmailBodies(gmailQuery: string, afterDate?: Date): Promise<string[]> {
    const gmail = this.getGmail();
    const messageIds = await this.listMessageIds(gmailQuery, afterDate);
    const bodies: string[] = [];

    for (const id of messageIds) {
      const msgRes = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
      const payload = msgRes.data.payload;
      if (!payload) continue;

      const htmlBody = extractHtmlBody(payload);
      if (htmlBody) bodies.push(htmlBody);
    }

    return bodies;
  }

  private getGmail(): gmail_v1.Gmail {
    if (!this.gmail) {
      const oauth2Client = buildOAuthClient();
      oauth2Client.setCredentials({ refresh_token: decrypt(this.encryptedRefreshToken) });
      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    }
    return this.gmail;
  }

  private async listMessageIds(gmailQuery: string, afterDate?: Date): Promise<string[]> {
    const gmail = this.getGmail();
    const query = afterDate
      ? `${gmailQuery} after:${Math.floor(afterDate.getTime() / 1000)}`
      : gmailQuery;

    const ids: string[] = [];
    let pageToken: string | undefined;
    do {
      const listRes = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 500,
        pageToken,
      });
      for (const msg of listRes.data.messages ?? []) {
        if (msg.id) ids.push(msg.id);
      }
      pageToken = listRes.data.nextPageToken ?? undefined;
    } while (pageToken);

    return ids;
  }
}

function extractHtmlBody(payload: gmail_v1.Schema$MessagePart): string | null {
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  for (const part of payload.parts ?? []) {
    const result = extractHtmlBody(part);
    if (result) return result;
  }

  return null;
}
