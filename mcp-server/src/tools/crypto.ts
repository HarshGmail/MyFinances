import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';

export function registerCryptoTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'get_crypto_transactions',
    {
      description: 'Fetch all cryptocurrency buy and sell transactions. Returns coin name, symbol, type (credit=buy/debit=sell), date, price, quantity, and amount for each transaction. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/crypto/transactions');
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    'add_crypto_transaction',
    {
      description: 'Log a new cryptocurrency buy (credit) or sell (debit) transaction. If this tool fails or times out, retry it once.',
      inputSchema: z.object({
        type: z.enum(['credit', 'debit']).describe('"credit" = buy, "debit" = sell'),
        coinName: z.string().describe('Full coin name e.g. "Bitcoin", "Ethereum"'),
        coinSymbol: z.string().describe('Coin symbol e.g. "BTC", "ETH"'),
        date: z.string().describe('Transaction date in ISO format e.g. "2025-03-20"'),
        pricePerCoin: z.number().positive().describe('Price per coin in INR at time of transaction'),
        numOfCoins: z.number().positive().describe('Number of coins bought or sold'),
        amount: z.number().positive().describe('Total transaction value in INR'),
      }),
    },
    async (input) => {
      const result = await client.post('/crypto/transaction', input);
      return {
        content: [{ type: 'text' as const, text: `Crypto transaction added successfully.\n${JSON.stringify(result, null, 2)}` }],
      };
    }
  );
}
