import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';
import { okResponse, toCSV } from '../compact.js';
import { MutualFundTx, summarizeMutualFundTransactions } from '../aggregations.js';

export function registerMutualFundTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'mf_get_tracked',
    {
      description:
        'Fetch the list of mutual funds the user is tracking (from mutualFundsInfo). Returns fundName and schemeNumber for each. ALWAYS call this before mf_add_transaction to get the exact canonical fundName — even a small mismatch will break NAV lookups on the dashboard. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/funds/infoFetch');
      return { content: [{ type: 'text' as const, text: toCSV(data) }] };
    }
  );

  server.registerTool(
    'mf_get_transactions',
    {
      description:
        'Fetch all mutual fund buy and sell transactions (raw audit trail). Returns fund name, type (credit=buy/debit=sell), date, units, and amount per transaction. Prefer mf_get_summary for per-fund holdings. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/mutual-funds/transactions');
      return { content: [{ type: 'text' as const, text: toCSV(data) }] };
    }
  );

  server.registerTool(
    'mf_get_summary',
    {
      description:
        'Per-fund mutual fund summary aggregated from raw transactions: units_held, total_invested, total_proceeds, net_invested, avg_buy_nav, txn_count. Does NOT include current NAV or market value — pure transaction math. Cheapest tool for "how much have I invested in fund X" or "how many units do I hold" questions.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get<MutualFundTx[]>('/mutual-funds/transactions');
      const summary = summarizeMutualFundTransactions(data ?? []);
      return { content: [{ type: 'text' as const, text: toCSV(summary) }] };
    }
  );

  server.registerTool(
    'mf_add_transaction',
    {
      description:
        'Log a new mutual fund buy (credit) or sell (debit) transaction. IMPORTANT: Call mf_get_tracked first and use the exact fundName from that list — the backend will attempt fuzzy-matching as a fallback, but exact names are always safer. If the fund is not in the tracked list at all, the transaction will be rejected. If this tool fails or times out, retry it once.',
      inputSchema: z.object({
        type: z.enum(['credit', 'debit']).describe('"credit" = buy, "debit" = sell'),
        fundName: z
          .string()
          .describe(
            'Exact fund name from mf_get_tracked e.g. "Parag Parikh Flexi Cap Fund Direct Growth"'
          ),
        date: z.string().describe('Transaction date in ISO format e.g. "2025-03-20"'),
        numOfUnits: z.number().positive().describe('Number of units bought or sold'),
        amount: z.number().positive().describe('Total transaction value in INR'),
      }),
    },
    async (input) => {
      const result = await client.post('/mutual-funds/transaction', input);
      return { content: [{ type: 'text' as const, text: okResponse(result) }] };
    }
  );
}
