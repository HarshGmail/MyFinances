import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';
import { compactJSON, okResponse, toCSV } from '../compact.js';
import { StockTx, summarizeStockTransactions } from '../aggregations.js';

export function registerStockTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'stocks_get_transactions',
    {
      description:
        'Fetch all stock buy and sell transactions (raw audit trail). Returns symbol, type (credit=buy/debit=sell), date, price, shares, and amount per transaction. Prefer stocks_get_summary if you only need per-symbol holdings/P&L. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/stocks/transactions');
      return { content: [{ type: 'text' as const, text: toCSV(data) }] };
    }
  );

  server.registerTool(
    'stocks_get_summary',
    {
      description:
        'Per-symbol summary aggregated from raw transactions: units_held, total_invested, total_proceeds, net_invested, avg_buy_price, txn_count. Does NOT include live prices or current value — use stocks_get_portfolio for that. This is the cheapest tool token-wise; prefer it for "how much did I invest in X" or "how many shares of Y do I hold" questions.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get<StockTx[]>('/stocks/transactions');
      const summary = summarizeStockTransactions(data ?? []);
      return { content: [{ type: 'text' as const, text: toCSV(summary) }] };
    }
  );

  server.registerTool(
    'stocks_get_portfolio',
    {
      description:
        'Current stock portfolio with LIVE NSE prices, current value, P&L, and 1-day change for each holding. WARNING: calls Yahoo Finance in real-time and may take 10-30 seconds. Use stocks_get_summary instead if you only need transaction-side metrics. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/stocks/portfolio');
      return { content: [{ type: 'text' as const, text: compactJSON(data) }] };
    }
  );

  server.registerTool(
    'stocks_add_transaction',
    {
      description:
        'Log a stock buy (credit) or sell (debit) transaction. Use the exact NSE ticker symbol — call stocks_get_summary first to see existing symbols. Do NOT include exchange suffixes (.NS, .BO). The backend will resolve full company names to tickers via Yahoo Finance search as a fallback. If this tool fails or times out, retry it once.',
      inputSchema: z.object({
        type: z.enum(['credit', 'debit']).describe('"credit" = buy, "debit" = sell'),
        stockName: z
          .string()
          .describe('NSE ticker symbol e.g. "RELIANCE", "TCS", "INFY" — no .NS suffix'),
        date: z.string().describe('Transaction date in ISO format e.g. "2025-03-20"'),
        marketPrice: z
          .number()
          .positive()
          .describe('Price per share at time of transaction in INR'),
        numOfShares: z.number().positive().describe('Number of shares bought or sold'),
        amount: z
          .number()
          .nonnegative()
          .describe('Total transaction value in INR (marketPrice × numOfShares)'),
      }),
    },
    async (input) => {
      const result = await client.post('/stocks/transaction', input);
      return { content: [{ type: 'text' as const, text: okResponse(result) }] };
    }
  );
}
