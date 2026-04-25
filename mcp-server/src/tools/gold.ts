import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';

export function registerGoldTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'get_gold_transactions',
    {
      description:
        'Fetch all digital gold buy and sell transactions. Returns date, type (credit=buy/debit=sell), grams, price per gram, and amount for each transaction. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/gold/transactions');
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    'add_gold_transaction',
    {
      description:
        'Log a new digital gold buy (credit) or sell (debit) transaction. If this tool fails or times out, retry it once.',
      inputSchema: z.object({
        type: z.enum(['credit', 'debit']).describe('"credit" = buy, "debit" = sell'),
        date: z.string().describe('Transaction date in ISO format e.g. "2025-03-20"'),
        quantity: z.number().positive().describe('Weight of gold in grams'),
        goldPrice: z.number().positive().describe('Price per gram in INR at time of transaction'),
        amount: z
          .number()
          .nonnegative()
          .describe('Total transaction value in INR including 3% GST'),
        tax: z
          .number()
          .nonnegative()
          .optional()
          .describe('GST in INR — auto-calculated as 3% of amount if omitted'),
        platform: z.string().optional().describe('Platform — defaults to "SafeGold"'),
      }),
    },
    async (input) => {
      const tax = input.tax ?? Math.round(((input.amount * 3) / 103) * 100) / 100;
      const platform = input.platform ?? 'SafeGold';
      const result = await client.post('/gold/transaction', { ...input, tax, platform });
      return {
        content: [
          {
            type: 'text' as const,
            text: `Gold transaction added successfully.\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    }
  );
}
