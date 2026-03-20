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

const PORT = parseInt(process.env.PORT ?? '4000', 10);

// Factory: fresh McpServer per session, bound to that user's backend client
function createMcpServer(client: ReturnType<typeof createBackendClient>): McpServer {
  const server = new McpServer({ name: 'ourfinance', version: '1.0.0' });
  registerExpenseTools(server, client);
  registerStockTools(server, client);
  registerGoalTools(server, client);
  return server;
}

// Session map: sessionId → { server, transport }
const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

const app = express();
app.use(express.json());

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
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    // No session ID: must be an InitializeRequest to start a new session
    if (!isInitializeRequest(req.body)) {
      res.status(400).json({ error: 'Bad Request: expected InitializeRequest for new session' });
      return;
    }

    // Exchange the ingest token for a user-specific JWT
    const ingestToken = req.ingestToken!;
    let jwt: string;
    try {
      jwt = await exchangeIngestToken(ingestToken);
    } catch {
      res.status(401).json({ error: 'Invalid ingest token' });
      return;
    }

    const client = createBackendClient(jwt);
    const server = createMcpServer(client);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, { server, transport });
        console.error(`[MCP] Session created: ${id}`);
      },
    });

    transport.onclose = () => {
      const id = transport.sessionId;
      if (id) {
        sessions.delete(id);
        console.error(`[MCP] Session closed: ${id}`);
      }
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('[MCP] POST error:', err);
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
  console.error(`[MCP] Server listening on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  console.error('[MCP] Shutting down...');
  for (const { transport } of sessions.values()) {
    await transport.close().catch(() => {});
  }
  process.exit(0);
});
