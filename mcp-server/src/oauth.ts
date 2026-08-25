/**
 * Minimal OAuth 2.0 Authorization Server for MCP (MCP Authorization spec, 2025-03-26).
 *
 * Flow:
 *   1. Claude.ai fetches GET /.well-known/oauth-authorization-server
 *   2. Claude.ai redirects user to GET /oauth/authorize
 *   3. MCP server redirects user to the frontend /connect-mcp page with request_id
 *   4. Frontend fetches the ingest token (user already logged in) and POSTs to /oauth/authorize
 *   5. Server stores code → ingest_token mapping, redirects back to Claude.ai
 *   6. Claude.ai posts to POST /oauth/token with code + code_verifier
 *   7. Server verifies PKCE and returns { access_token: <ingest_token>, ... }
 *   8. Claude.ai sends every MCP request with Authorization: Bearer <ingest_token>
 *   9. Existing mcpAuthMiddleware extracts it as req.ingestToken — nothing else changes.
 */

import { Router, Request, Response } from 'express';
import { createHash, randomBytes } from 'crypto';
import { exchangeIngestToken, isIngestTokenRejected } from './backendClient.js';
import { log, logError } from './logger.js';

const SITE_URL = (process.env.SITE_URL ?? 'https://mcp.my-finances.site').replace(/\/$/, '');
const FRONTEND_URL = (process.env.FRONTEND_URL ?? 'https://www.my-finances.site').replace(
  /\/$/,
  ''
);

// ─── In-memory stores (single process — fine for personal use) ───────────────

interface PendingRequest {
  redirectUri: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  resource?: string;
  expiresAt: number;
}

interface PendingCode {
  ingestToken: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  resource?: string;
  expiresAt: number;
}

const pendingRequests = new Map<string, PendingRequest>();
const pendingCodes = new Map<string, PendingCode>();

// Prune expired entries every 10 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [k, v] of pendingRequests) if (v.expiresAt < now) pendingRequests.delete(k);
    for (const [k, v] of pendingCodes) if (v.expiresAt < now) pendingCodes.delete(k);
  },
  10 * 60 * 1000
);

// ─── Router ──────────────────────────────────────────────────────────────────

const router = Router();

// RFC 9728 — OAuth Protected Resource Metadata
// Both variants point to the same resource: the /mcp endpoint.
const protectedResourceMetadata = {
  resource: `${SITE_URL}/mcp`,
  authorization_servers: [SITE_URL],
  bearer_methods_supported: ['header'],
  scopes_supported: ['claudeai'],
};

router.get('/.well-known/oauth-protected-resource', (_req: Request, res: Response) => {
  res.json(protectedResourceMetadata);
});

router.get('/.well-known/oauth-protected-resource/mcp', (_req: Request, res: Response) => {
  res.json(protectedResourceMetadata);
});

// RFC 8414 — OAuth 2.0 Authorization Server Metadata
router.get('/.well-known/oauth-authorization-server', (_req: Request, res: Response) => {
  res.json({
    issuer: SITE_URL,
    authorization_endpoint: `${SITE_URL}/oauth/authorize`,
    token_endpoint: `${SITE_URL}/oauth/token`,
    registration_endpoint: `${SITE_URL}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  });
});

// RFC 7591 — Dynamic Client Registration
// Claude.ai registers itself before starting the OAuth flow.
// We accept any registration and echo back a client_id — we don't enforce it.
router.post('/oauth/register', (req: Request, res: Response) => {
  const { client_name, redirect_uris } = req.body as Record<string, unknown>;
  const clientId = randomBytes(16).toString('hex');
  log('OAuth', `Client registered: ${client_name ?? 'unknown'} → client_id=${clientId}`);
  res.status(201).json({
    client_id: clientId,
    client_name: client_name ?? 'MCP Client',
    redirect_uris: redirect_uris ?? [],
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  });
});

// GET /oauth/authorize — redirect to the frontend connect page
router.get('/oauth/authorize', (req: Request, res: Response) => {
  const { response_type, redirect_uri, state, code_challenge, code_challenge_method, resource } =
    req.query as Record<string, string>;

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
    resource,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 min to complete
  });
  log(
    'OAuth',
    `Authorize started → request_id=${requestId} resource=${resource ?? 'none'} redirect_uri=${redirect_uri}`
  );

  // Redirect to the frontend connect page — user is already logged in there,
  // so the page can fetch their ingest token and complete the flow automatically.
  const connectUrl = new URL(`${FRONTEND_URL}/connect-mcp`);
  connectUrl.searchParams.set('request_id', requestId);
  res.redirect(302, connectUrl.toString());
});

// POST /oauth/authorize — called by the frontend connect page with the ingest token
router.post('/oauth/authorize', (req: Request, res: Response) => {
  const { request_id, ingest_token } = req.body as Record<string, string>;

  const pending = pendingRequests.get(request_id);
  if (!pending || Date.now() > pending.expiresAt) {
    pendingRequests.delete(request_id);
    logError('OAuth', `Authorize submitted with expired/unknown request_id=${request_id}`);
    res.status(400).json({ error: 'Authorization request expired. Please try again.' });
    return;
  }
  if (!ingest_token?.trim()) {
    logError('OAuth', 'Authorize submitted with empty ingest_token');
    res.status(400).json({ error: 'Ingest token is required.' });
    return;
  }

  pendingRequests.delete(request_id);

  const code = randomBytes(32).toString('hex');
  pendingCodes.set(code, {
    ingestToken: ingest_token.trim(),
    codeChallenge: pending.codeChallenge,
    codeChallengeMethod: pending.codeChallengeMethod,
    resource: pending.resource,
    expiresAt: Date.now() + 5 * 60 * 1000, // code valid for 5 min
  });

  log('OAuth', `Token accepted — code issued, redirecting to Claude.ai callback`);

  const redirectUrl = new URL(pending.redirectUri);
  redirectUrl.searchParams.set('code', code);
  if (pending.state) redirectUrl.searchParams.set('state', pending.state);

  res.json({ redirect_url: redirectUrl.toString() });
});

function respondWithToken(res: Response, ingestToken: string): void {
  // Always bind the token to the exact MCP endpoint URL so Claude.ai sends it
  // on requests to https://mcp.my-finances.site/mcp (not just the base URL)
  const tokenResource = `${SITE_URL}/mcp`;
  res.json({
    access_token: ingestToken,
    token_type: 'Bearer', // capital B required by RFC 6750
    refresh_token: ingestToken,
    scope: 'claudeai',
    resource: tokenResource,
  });
}

async function handleRefreshGrant(refreshToken: string | undefined, res: Response): Promise<void> {
  const token = refreshToken?.trim();
  if (!token) {
    res.status(400).json({ error: 'invalid_request', error_description: 'refresh_token required' });
    return;
  }

  try {
    await exchangeIngestToken(token);
  } catch (err) {
    if (isIngestTokenRejected(err)) {
      logError('OAuth', 'Refresh rejected — ingest token was regenerated', err);
      res
        .status(400)
        .json({ error: 'invalid_grant', error_description: 'Ingest token was revoked' });
      return;
    }
    logError('OAuth', 'Refresh could not be verified — backend unreachable', err);
    res
      .status(503)
      .json({ error: 'temporarily_unavailable', error_description: 'Backend unreachable' });
    return;
  }

  log('OAuth', 'Refresh grant succeeded — reissuing access_token');
  respondWithToken(res, token);
}

// POST /oauth/token — exchange code for access_token
router.post('/oauth/token', async (req: Request, res: Response) => {
  const { grant_type, code, code_verifier, refresh_token } = req.body as Record<string, string>;

  if (grant_type === 'refresh_token') {
    try {
      await handleRefreshGrant(refresh_token, res);
    } catch (err) {
      logError('OAuth', 'Refresh grant unhandled error', err);
      if (!res.headersSent) res.status(500).json({ error: 'server_error' });
    }
    return;
  }

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
    logError('OAuth', `Token exchange failed — code expired or not found`);
    res
      .status(400)
      .json({ error: 'invalid_grant', error_description: 'Code expired or not found' });
    return;
  }

  // Verify PKCE (S256) if code_challenge was provided during authorization
  if (pending.codeChallenge) {
    if (!code_verifier) {
      logError('OAuth', 'Token exchange failed — code_verifier missing');
      res.status(400).json({ error: 'invalid_grant', error_description: 'code_verifier required' });
      return;
    }
    const computed = createHash('sha256').update(code_verifier).digest('base64url');
    if (computed !== pending.codeChallenge) {
      logError('OAuth', 'Token exchange failed — PKCE verification mismatch');
      res
        .status(400)
        .json({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
      return;
    }
  }

  pendingCodes.delete(code);

  log('OAuth', `Token exchange succeeded — issuing access_token bound to ${SITE_URL}/mcp`);

  respondWithToken(res, pending.ingestToken);
});

export default router;
