import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';

export function registerGoalTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'get_goals',
    {
      description:
        'Fetch all investment goals with their target amounts, current progress, and linked assets (stocks, mutual funds, etc.).',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/goals');
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
