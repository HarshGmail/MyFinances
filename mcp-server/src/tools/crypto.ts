import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';
import { okResponse, toCSV } from '../compact.js';
import { CryptoTx, summarizeCryptoTransactions } from '../aggregations.js';

export function registerCryptoTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'crypto_get_transactions',
    {
      description:
        'Fetch all cryptocurrency buy and sell transactions (raw audit trail). Returns coin name, symbol, type (credit=buy/debit=sell), date, price, quantity, and amount per transaction. Prefer crypto_get_summary for per-coin holdings. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/crypto/transactions');
      return { content: [{ type: 'text' as const, text: toCSV(data) }] };
    }
  );

  server.registerTool(
    'crypto_get_summary',
    {
      description:
        'Per-coin summary aggregated from raw transactions: coins_held, total_invested, total_proceeds, net_invested, avg_buy_price, txn_count. Does NOT include live prices — does not call CoinDCX. Cheapest tool for "how much did I invest in BTC" or "how many ETH do I hold" questions.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get<CryptoTx[]>('/crypto/transactions');
      const summary = summarizeCryptoTransactions(data ?? []);
      return { content: [{ type: 'text' as const, text: toCSV(summary) }] };
    }
  );

  server.registerTool(
    'crypto_add_transaction',
    {
      description:
        'Log a new cryptocurrency buy (credit) or sell (debit) transaction. If this tool fails or times out, retry it once.',
      inputSchema: z.object({
        type: z.enum(['credit', 'debit']).describe('"credit" = buy, "debit" = sell'),
        coinName: z.string().describe('Full coin name e.g. "Bitcoin", "Ethereum"'),
        coinSymbol: z.string().describe('Coin symbol e.g. "BTC", "ETH"'),
        date: z.string().describe('Transaction date in ISO format e.g. "2025-03-20"'),
        pricePerCoin: z
          .number()
          .positive()
          .describe('Price per coin in INR at time of transaction'),
        numOfCoins: z.number().positive().describe('Number of coins bought or sold'),
        amount: z.number().positive().describe('Total transaction value in INR'),
      }),
    },
    async (input) => {
      const result = await client.post('/crypto/transaction', input);
      return { content: [{ type: 'text' as const, text: okResponse(result) }] };
    }
  );
}
