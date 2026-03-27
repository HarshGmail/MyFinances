import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';

export function registerMutualFundTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'get_mutual_fund_transactions',
    {
      description:
        'Fetch all mutual fund buy and sell transactions. Returns fund name, type (credit=buy/debit=sell), date, NAV, units, and amount for each transaction. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/mutual-funds/transactions');
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    'add_mutual_fund_transaction',
    {
      description:
        'Log a new mutual fund buy (credit) or sell (debit) transaction. If this tool fails or times out, retry it once.',
      inputSchema: z.object({
        type: z.enum(['credit', 'debit']).describe('"credit" = buy, "debit" = sell'),
        fundName: z.string().describe('Full mutual fund name e.g. "Parag Parikh Flexi Cap Fund"'),
        date: z.string().describe('Transaction date in ISO format e.g. "2025-03-20"'),
        nav: z
          .number()
          .positive()
          .describe('NAV (Net Asset Value) per unit at time of transaction in INR'),
        numOfUnits: z.number().positive().describe('Number of units bought or sold'),
        amount: z.number().positive().describe('Total transaction value in INR'),
      }),
    },
    async (input) => {
      const result = await client.post('/mutual-funds/transaction', input);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Mutual fund transaction added successfully.\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    }
  );
}
