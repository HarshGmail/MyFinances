/**
 * Minimal OAuth 2.0 Authorization Server for MCP (MCP Authorization spec, 2025-03-26).
 *
 * Flow:
 *   1. Claude.ai fetches GET /.well-known/oauth-authorization-server
 *   2. Claude.ai redirects user to GET /oauth/authorize  (shows ingest-token form)
 *   3. User submits their ingest token → POST /oauth/authorize
 *   4. Server stores code → ingest_token mapping, redirects back to Claude.ai
 *   5. Claude.ai posts to POST /oauth/token with code + code_verifier
 *   6. Server verifies PKCE and returns { access_token: <ingest_token>, ... }
 *   7. Claude.ai sends every MCP request with Authorization: Bearer <ingest_token>
 *   8. Existing mcpAuthMiddleware extracts it as req.ingestToken — nothing else changes.
 */

import { Router, Request, Response } from 'express';
import { createHash, randomBytes } from 'crypto';

const SITE_URL = (process.env.SITE_URL ?? 'https://mcp.my-finances.site').replace(/\/$/, '');

// ─── In-memory stores (single process — fine for personal use) ───────────────

interface PendingRequest {
  redirectUri: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: number;
}

interface PendingCode {
  ingestToken: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: number;
}

const pendingRequests = new Map<string, PendingRequest>();
const pendingCodes = new Map<string, PendingCode>();

// Prune expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pendingRequests) if (v.expiresAt < now) pendingRequests.delete(k);
  for (const [k, v] of pendingCodes) if (v.expiresAt < now) pendingCodes.delete(k);
}, 10 * 60 * 1000);

// ─── Router ──────────────────────────────────────────────────────────────────

const router = Router();

// RFC 8414 — OAuth 2.0 Authorization Server Metadata
router.get('/.well-known/oauth-authorization-server', (_req: Request, res: Response) => {
  res.json({
    issuer: SITE_URL,
    authorization_endpoint: `${SITE_URL}/oauth/authorize`,
    token_endpoint: `${SITE_URL}/oauth/token`,
    registration_endpoint: `${SITE_URL}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  });
});

// RFC 7591 — Dynamic Client Registration
// Claude.ai registers itself before starting the OAuth flow.
// We accept any registration and echo back a client_id — we don't enforce it.
router.post('/oauth/register', (req: Request, res: Response) => {
  const { client_name, redirect_uris } = req.body as Record<string, unknown>;
  res.status(201).json({
    client_id: randomBytes(16).toString('hex'),
    client_name: client_name ?? 'MCP Client',
    redirect_uris: redirect_uris ?? [],
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  });
});

// GET /oauth/authorize — show the ingest-token form
router.get('/oauth/authorize', (req: Request, res: Response) => {
  const {
    response_type,
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method,
  } = req.query as Record<string, string>;

  if (response_type !== 'code') {
    res.status(400).json({ error: 'unsupported_response_type' });
    return;
  }
  if (!redirect_uri) {
    res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri required' });
    return;
  }

  const requestId = randomBytes(16).toString('hex');
  pendingRequests.set(requestId, {
    redirectUri: redirect_uri,
    state,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method ?? 'S256',
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 min to complete the form
  });

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Connect to My Finances</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #09090b;
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 1rem;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 2rem;
      width: 100%;
      max-width: 420px;
    }
    .logo { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; }
    .subtitle { color: #a1a1aa; font-size: 0.875rem; margin-bottom: 1.5rem; }
    label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; }
    input[type="text"], input[type="password"] {
      width: 100%;
      padding: 0.625rem 0.75rem;
      background: #09090b;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      color: #fafafa;
      font-size: 0.875rem;
      font-family: monospace;
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus { border-color: #6366f1; }
    .hint {
      font-size: 0.75rem;
      color: #71717a;
      margin-top: 0.375rem;
      line-height: 1.4;
    }
    button {
      margin-top: 1.25rem;
      width: 100%;
      padding: 0.625rem;
      background: #6366f1;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover { background: #4f46e5; }
    .divider { border-top: 1px solid #27272a; margin: 1.25rem 0; }
    .footer { font-size: 0.75rem; color: #52525b; text-align: center; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">My Finances</div>
    <p class="subtitle">Claude wants to connect to your finance data</p>

    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="request_id" value="${requestId}" />

      <label for="ingest_token">Your Ingest Token</label>
      <input
        id="ingest_token"
        type="password"
        name="ingest_token"
        placeholder="Paste your ingest token"
        autocomplete="off"
        required
      />
      <p class="hint">
        Find your ingest token on the
        <a href="https://www.my-finances.site/profile" target="_blank" style="color:#6366f1">
          Profile page
        </a>
        under "UPI Auto-Track / MCP Integration".
      </p>

      <button type="submit">Connect</button>
    </form>

    <div class="divider"></div>
    <p class="footer">
      This grants Claude read &amp; write access to your expenses, stocks, and goals.<br/>
      You can revoke access at any time by regenerating your ingest token.
    </p>
  </div>
</body>
</html>`);
});

// POST /oauth/authorize — handle form submission
router.post(
  '/oauth/authorize',
  (req: Request, res: Response) => {
    const { request_id, ingest_token } = req.body as Record<string, string>;

    const pending = pendingRequests.get(request_id);
    if (!pending || Date.now() > pending.expiresAt) {
      pendingRequests.delete(request_id);
      res.status(400).send('Authorization request expired. Please try again.');
      return;
    }
    if (!ingest_token?.trim()) {
      res.status(400).send('Ingest token is required.');
      return;
    }

    pendingRequests.delete(request_id);

    const code = randomBytes(32).toString('hex');
    pendingCodes.set(code, {
      ingestToken: ingest_token.trim(),
      codeChallenge: pending.codeChallenge,
      codeChallengeMethod: pending.codeChallengeMethod,
      expiresAt: Date.now() + 5 * 60 * 1000, // code valid for 5 min
    });

    const redirectUrl = new URL(pending.redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (pending.state) redirectUrl.searchParams.set('state', pending.state);

    res.redirect(302, redirectUrl.toString());
  }
);

// POST /oauth/token — exchange code for access_token
router.post('/oauth/token', (req: Request, res: Response) => {
  const { grant_type, code, code_verifier } = req.body as Record<string, string>;

  if (grant_type !== 'authorization_code') {
    res.status(400).json({ error: 'unsupported_grant_type' });
    return;
  }
  if (!code) {
    res.status(400).json({ error: 'invalid_request', error_description: 'code required' });
    return;
  }

  const pending = pendingCodes.get(code);
  if (!pending || Date.now() > pending.expiresAt) {
    pendingCodes.delete(code);
    res.status(400).json({ error: 'invalid_grant', error_description: 'Code expired or not found' });
    return;
  }

  // Verify PKCE (S256) if code_challenge was provided during authorization
  if (pending.codeChallenge) {
    if (!code_verifier) {
      res.status(400).json({ error: 'invalid_grant', error_description: 'code_verifier required' });
      return;
    }
    const computed = createHash('sha256').update(code_verifier).digest('base64url');
    if (computed !== pending.codeChallenge) {
      res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
      return;
    }
  }

  pendingCodes.delete(code);

  res.json({
    access_token: pending.ingestToken,
    token_type: 'bearer',
    expires_in: 86400,
  });
});

export default router;
