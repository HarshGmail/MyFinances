import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';
import { compactJSON } from '../compact.js';

export function registerPriceTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'prices_get_stock_prices',
    {
      description:
        'Fetch current live NSE stock prices for specific symbols. Returns current price, 1-day change, change %, and last update time for each symbol. These are the same prices shown on the frontend dashboard. Use this instead of web search for accurate pricing. WARNING: calls Yahoo Finance and may take 5-10 seconds depending on symbols. If this tool fails or times out, retry it once.',
      inputSchema: z.object({
        symbols: z
          .array(z.string())
          .describe(
            'List of NSE ticker symbols e.g. ["RELIANCE", "TCS", "INFY"]. Do NOT include exchange suffixes (.NS, .BO).'
          ),
      }),
    },
    async (input) => {
      const queryString = input.symbols.map((s) => `symbol=${encodeURIComponent(s)}`).join('&');
      const data = await client.get(`/stocks/prices?${queryString}`);
      return { content: [{ type: 'text' as const, text: compactJSON(data) }] };
    }
  );

  server.registerTool(
    'prices_get_mf_navs',
    {
      description:
        'Fetch current NAV (Net Asset Value) for mutual funds. Returns current NAV, NAV date, and 1-day change for each fund. These are the same NAVs shown on the frontend dashboard. Call mf_get_tracked first to get scheme numbers. WARNING: calls MFAPI and may take a few seconds. If this tool fails or times out, retry it once.',
      inputSchema: z.object({
        schemeNumbers: z
          .array(z.number())
          .describe('List of MFAPI scheme numbers e.g. [100048, 100050]. Get from mf_get_tracked.'),
      }),
    },
    async (input) => {
      const data = await client.post('/funds/nav-batch', { schemeNumbers: input.schemeNumbers });
      return { content: [{ type: 'text' as const, text: compactJSON(data) }] };
    }
  );

  server.registerTool(
    'prices_get_crypto_prices',
    {
      description:
        'Fetch current live crypto prices for specific coins. Returns current price in INR, 1-day change, change %, and exchange from CoinDCX. These are the same prices shown on the frontend dashboard. WARNING: calls CoinDCX API and may take a few seconds. If this tool fails or times out, retry it once.',
      inputSchema: z.object({
        coinNames: z
          .array(z.string())
          .describe(
            'List of coin names e.g. ["Bitcoin", "Ethereum", "Ripple"]. Use the exact names as they appear in your portfolio.'
          ),
      }),
    },
    async (input) => {
      const data = await client.post('/crypto/prices', { coinNames: input.coinNames });
      return { content: [{ type: 'text' as const, text: compactJSON(data) }] };
    }
  );

  server.registerTool(
    'prices_get_gold_rates',
    {
      description:
        'Fetch current gold rates in INR per gram for a date range. Returns date, rate (₹/gram), and whether it is a trading day. These are the same gold rates shown on the frontend dashboard. Rates are from Yahoo Finance (GC=F commodity). Weekend/holiday gaps are filled by carrying forward the last known trading day close.',
      inputSchema: z.object({
        startDate: z.string().describe('Start date in ISO format e.g. "2025-03-01"'),
        endDate: z.string().describe('End date in ISO format e.g. "2025-03-31"'),
      }),
    },
    async (input) => {
      const queryString = new URLSearchParams({
        startDate: input.startDate,
        endDate: input.endDate,
      }).toString();
      const data = await client.get(`/gold/rates?${queryString}`);
      return { content: [{ type: 'text' as const, text: compactJSON(data) }] };
    }
  );
}
