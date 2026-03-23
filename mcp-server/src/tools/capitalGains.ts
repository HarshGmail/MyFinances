import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';

export function registerCapitalGainsTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'get_capital_gains_summary',
    {
      description:
        'Returns realized capital gains grouped by Indian financial year (FY) for stocks, gold, crypto, and mutual funds, using FIFO cost-basis matching. Also returns current (unrealized) lot holdings with purchase date, cost per unit, and holding days. Includes estimated Indian capital gains tax: equity STCG 20%, LTCG 12.5% (threshold 365 days); gold LTCG 12.5% (threshold 730 days), STCG at income slab (not computed); crypto 30% flat. All based on Finance Act 2024 (effective July 23, 2024). Note: ₹1.25L annual LTCG exemption across equity+equity MF is NOT auto-applied. FD/RD are interest income, not capital gains. If this tool fails, retry once.',
      inputSchema: z.object({
        fy: z
          .string()
          .optional()
          .describe('Filter to a specific financial year e.g. "2024-25". Omit for all years.'),
      }),
    },
    async ({ fy }) => {
      const data = await client.get('/capital-gains');
      // If a specific FY is requested, filter the response
      if (fy && data?.summary?.byFY) {
        const filtered = {
          ...data,
          byAsset: {
            stocks: {
              realizedByFY: { [fy]: data.byAsset?.stocks?.realizedByFY?.[fy] ?? null },
              currentLots: data.byAsset?.stocks?.currentLots ?? [],
            },
            gold: {
              realizedByFY: { [fy]: data.byAsset?.gold?.realizedByFY?.[fy] ?? null },
              currentLots: data.byAsset?.gold?.currentLots ?? [],
            },
            crypto: {
              realizedByFY: { [fy]: data.byAsset?.crypto?.realizedByFY?.[fy] ?? null },
              currentLots: data.byAsset?.crypto?.currentLots ?? [],
            },
            mutualFunds: {
              realizedByFY: { [fy]: data.byAsset?.mutualFunds?.realizedByFY?.[fy] ?? null },
              currentLots: data.byAsset?.mutualFunds?.currentLots ?? [],
            },
          },
          summary: {
            ...data.summary,
            byFY: { [fy]: data.summary.byFY[fy] ?? null },
          },
        };
        return { content: [{ type: 'text' as const, text: JSON.stringify(filtered, null, 2) }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
