import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';

export function registerStockTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'get_stock_transactions',
    {
      description: 'Fetch all stock buy and sell transactions. Returns symbol, type (credit=buy/debit=sell), date, price, shares, and amount for each transaction. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/stocks/transactions');
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    'get_portfolio_summary',
    {
      description:
        'Fetch current stock portfolio with live NSE prices, P&L, and 1-day change for each holding. WARNING: This calls Yahoo Finance in real-time and may take 10-30 seconds depending on portfolio size. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/stocks/portfolio');
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    'add_stock_transaction',
    {
      description: 'Log a stock buy (credit) or sell (debit) transaction. If this tool fails or times out, retry it once.',
      inputSchema: z.object({
        type: z.enum(['credit', 'debit']).describe('"credit" = buy, "debit" = sell'),
        stockName: z.string().describe('NSE stock symbol e.g. "RELIANCE", "TCS", "INFY"'),
        date: z.string().describe('Transaction date in ISO format e.g. "2025-03-20"'),
        marketPrice: z.number().positive().describe('Price per share at time of transaction in INR'),
        numOfShares: z.number().positive().describe('Number of shares bought or sold'),
        amount: z.number().nonnegative().describe('Total transaction value in INR (marketPrice × numOfShares)'),
      }),
    },
    async (input) => {
      const result = await client.post('/stocks/transaction', input);
      return {
        content: [{ type: 'text' as const, text: `Stock transaction added successfully.\n${JSON.stringify(result, null, 2)}` }],
      };
    }
  );
}
