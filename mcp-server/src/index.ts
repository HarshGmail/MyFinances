import 'dotenv/config';
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import { exchangeIngestToken, createBackendClient } from './backendClient.js';
import { mcpAuthMiddleware } from './auth.js';
import { registerExpenseTools } from './tools/expenses.js';
import { registerStockTools } from './tools/stocks.js';
import { registerGoalTools } from './tools/goals.js';
import { registerGoldTools } from './tools/gold.js';
import { registerCryptoTools } from './tools/crypto.js';
import { registerMutualFundTools } from './tools/mutualFunds.js';
import { registerSavingsTools } from './tools/savings.js';
import { registerCapitalGainsTools } from './tools/capitalGains.js';
import oauthRouter from './oauth.js';
import { requestLogger, log, logError } from './logger.js';

const PORT = parseInt(process.env.PORT ?? '4000', 10);

// Factory: fresh McpServer per session, bound to that user's backend client
function createMcpServer(client: ReturnType<typeof createBackendClient>): McpServer {
  const server = new McpServer({ name: 'ourfinance', version: '1.0.0' });
  registerExpenseTools(server, client);
  registerStockTools(server, client);
  registerGoalTools(server, client);
  registerGoldTools(server, client);
  registerCryptoTools(server, client);
  registerMutualFundTools(server, client);
  registerSavingsTools(server, client);
  registerCapitalGainsTools(server, client);
  return server;
}

// Session map: sessionId → { server, transport }
const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

const app = express();

// CORS — Claude.ai browser and backend both need to reach this server
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false })); // for OAuth form POST
app.use(requestLogger);

// OAuth 2.0 endpoints (no auth required — these ARE the auth)
app.use(oauthRouter);

// Health check — no auth required
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', activeSessions: sessions.size });
});

// All /mcp routes: extract ingest token from Authorization header
app.use('/mcp', mcpAuthMiddleware);

// POST /mcp — initialize new session or route message to existing session
app.post('/mcp', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId) {
      const session = sessions.get(sessionId);
      if (!session) {
        log('MCP', `Session not found: ${sessionId}`);
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    // No session ID: must be an InitializeRequest to start a new session
    if (!isInitializeRequest(req.body)) {
      log('MCP', 'Rejected non-InitializeRequest on new session', req.body?.method);
      res.status(400).json({ error: 'Bad Request: expected InitializeRequest for new session' });
      return;
    }

    log('MCP', 'New session initializing — exchanging ingest token with backend...');

    // Exchange the ingest token for a user-specific JWT
    const ingestToken = req.ingestToken!;
    let jwt: string;
    try {
      jwt = await exchangeIngestToken(ingestToken);
      log('MCP', 'Ingest token exchange succeeded');
    } catch (err) {
      logError('MCP', 'Ingest token exchange failed', err);
      res.status(401).json({ error: 'Invalid ingest token' });
      return;
    }

    const client = createBackendClient(jwt);
    const server = createMcpServer(client);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, { server, transport });
        log('MCP', `Session created: ${id} (active: ${sessions.size})`);
      },
    });

    transport.onclose = () => {
      const id = transport.sessionId;
      if (id) {
        sessions.delete(id);
        log('MCP', `Session closed: ${id} (active: ${sessions.size})`);
      }
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    logError('MCP', 'POST /mcp unhandled error', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /mcp — open SSE stream for server-to-client messages
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId) {
    res.status(400).json({ error: 'Missing Mcp-Session-Id header' });
    return;
  }
  const session = sessions.get(sessionId);
  if (!session) {
    log('MCP', `SSE request for unknown session: ${sessionId}`);
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  await session.transport.handleRequest(req, res);
});

// DELETE /mcp — client terminates session
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId) {
    res.status(400).json({ error: 'Missing Mcp-Session-Id header' });
    return;
  }
  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  await session.transport.handleRequest(req, res);
});

app.listen(PORT, () => {
  log('MCP', `Server listening on port ${PORT}`);
  log('MCP', `Backend URL: ${process.env.BACKEND_URL ?? 'http://localhost:5000/api (default)'}`);
  log('MCP', `Site URL: ${process.env.SITE_URL ?? 'https://mcp.my-finances.site (default)'}`);
});

process.on('SIGTERM', async () => {
  log('MCP', 'Shutting down...');
  for (const { transport } of sessions.values()) {
    await transport.close().catch(() => {});
  }
  process.exit(0);
});
