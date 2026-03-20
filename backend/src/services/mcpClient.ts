import axios from 'axios';

const MCP_URL = process.env.MCP_URL || 'https://mcp.my-finances.site';

/**
 * Calls an MCP tool by opening a one-shot session (init → call → close).
 * Auth is the user's ingest token forwarded as Bearer.
 */
export async function callMcpTool(
  ingestToken: string,
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  // 1. Initialize session
  const initRes = await axios.post(
    `${MCP_URL}/mcp`,
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'ourfinance-chatgpt-proxy', version: '1.0' },
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ingestToken}`,
      },
      timeout: 10000,
    }
  );

  const sessionId = initRes.headers['mcp-session-id'];
  if (!sessionId) throw new Error('MCP server did not return a session ID');

  try {
    // 2. Call the tool
    const toolRes = await axios.post(
      `${MCP_URL}/mcp`,
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ingestToken}`,
          'Mcp-Session-Id': sessionId,
        },
        timeout: 35000, // portfolio calls hit Yahoo Finance
      }
    );

    const result = toolRes.data?.result;
    if (result?.isError) {
      throw new Error(result.content?.[0]?.text || 'MCP tool returned an error');
    }

    const text = result?.content?.[0]?.text;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } finally {
    // 3. Close session — best effort
    await axios
      .delete(`${MCP_URL}/mcp`, {
        headers: {
          Authorization: `Bearer ${ingestToken}`,
          'Mcp-Session-Id': sessionId,
        },
        timeout: 5000,
      })
      .catch(() => {});
  }
}
