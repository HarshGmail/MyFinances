import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';
import { compactJSON } from '../compact.js';

export function registerGoalTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'goals_list',
    {
      description:
        'Fetch all investment goals with target amount, target date, planned monthly contribution and asset allocations (the percent of each linked holding — stock, mutual fund, crypto, gold, EPF, FD or RD — earmarked for the goal). Current progress is not returned; it is computed in the app from live holding values. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/goals');
      return { content: [{ type: 'text' as const, text: compactJSON(data) }] };
    }
  );
}
