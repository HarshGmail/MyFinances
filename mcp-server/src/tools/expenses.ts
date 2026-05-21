import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';
import { okResponse, toCSV } from '../compact.js';

export function registerExpenseTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'expenses_get_transactions',
    {
      description:
        'Fetch daily expense log entries (individual purchases/payments). Supports optional date range filtering. Returns date, name, amount, category, and reason for each entry. If this tool fails or times out, retry it once.',
      inputSchema: z.object({
        startDate: z.string().optional().describe('Start date in ISO format e.g. 2025-01-01'),
        endDate: z.string().optional().describe('End date in ISO format e.g. 2025-03-31'),
      }),
    },
    async ({ startDate, endDate }) => {
      const params: Record<string, unknown> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await client.get('/expense-transactions', params);
      return { content: [{ type: 'text' as const, text: toCSV(data) }] };
    }
  );

  server.registerTool(
    'expenses_add_transaction',
    {
      description:
        'Log a new daily expense transaction (individual purchase or payment). If this tool fails or times out, retry it once.',
      inputSchema: z.object({
        date: z.string().describe('Date in ISO format e.g. 2025-03-20'),
        name: z.string().describe('Name/description of the expense e.g. "Coffee at Starbucks"'),
        amount: z.number().positive().describe('Amount in INR'),
        category: z.string().describe('Category e.g. "Food & Dining", "Transport", "Shopping"'),
        reason: z.string().optional().describe('Optional notes or reason'),
      }),
    },
    async (input) => {
      const result = await client.post('/expense-transactions', input);
      return {
        content: [{ type: 'text' as const, text: okResponse(result) }],
      };
    }
  );

  server.registerTool(
    'expenses_get_recurring',
    {
      description:
        'Fetch all recurring expense categories (rent, insurance, subscriptions, utilities etc.). These are fixed/regular expenses with a frequency field (daily, weekly, monthly, yearly, one-time). Different from daily expense transactions. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/expenses');
      return { content: [{ type: 'text' as const, text: toCSV(data) }] };
    }
  );
}
