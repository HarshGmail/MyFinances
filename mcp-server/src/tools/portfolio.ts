import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';
import { toCSV } from '../compact.js';
import {
  CryptoTx,
  GoldTx,
  MutualFundTx,
  StockTx,
  summarizeCryptoTransactions,
  summarizeGoldTransactions,
  summarizeMutualFundTransactions,
  summarizeStockTransactions,
} from '../aggregations.js';

// Cross-domain "everything" tool — one round trip, labelled CSV sections per asset.
// If one section's backend call fails, that section emits an ERROR line and the
// others still return; partial data beats total failure.

async function safeGet<T>(client: BackendClient, path: string): Promise<T | { __error: string }> {
  try {
    return await client.get<T>(path);
  } catch (err) {
    return { __error: err instanceof Error ? err.message : String(err) };
  }
}

function sectionCSV<T>(
  title: string,
  result: T[] | { __error: string },
  asCSV: (rows: T[]) => string
): string {
  if (Array.isArray(result)) {
    return `== ${title} ==\n${asCSV(result)}`;
  }
  return `== ${title} ==\nERROR: ${result.__error}`;
}

export function registerPortfolioTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'portfolio_get_all',
    {
      description:
        'One-shot snapshot of EVERY asset class: stocks, gold, crypto, mutual funds, EPF, FDs, RDs. Returns labelled CSV/JSON sections separated by "== SECTION ==" headers. Each investable asset section is per-symbol/fund/coin/platform aggregation (units_held, total_invested, net_invested, avg_buy_price). Savings sections (EPF/FD/RD) are returned as compact JSON since they have nested structure. No live prices — pure transaction-side metrics. Use this for "give me a full portfolio overview" questions to avoid 7 separate tool calls. If a single section fails, that section shows ERROR while the rest still return.',
      inputSchema: z.object({}),
    },
    async () => {
      const [stocks, gold, crypto, mf, epf, fd, rd] = await Promise.all([
        safeGet<StockTx[]>(client, '/stocks/transactions'),
        safeGet<GoldTx[]>(client, '/gold/transactions'),
        safeGet<CryptoTx[]>(client, '/crypto/transactions'),
        safeGet<MutualFundTx[]>(client, '/mutual-funds/transactions'),
        safeGet<unknown[]>(client, '/epf/getInfo'),
        safeGet<unknown[]>(client, '/fixed-deposit/getDeposits'),
        safeGet<unknown[]>(client, '/recurring-deposit/getDeposits'),
      ]);

      const sections = [
        sectionCSV('STOCKS', stocks, (rows) => toCSV(summarizeStockTransactions(rows))),
        sectionCSV('GOLD', gold, (rows) => toCSV(summarizeGoldTransactions(rows))),
        sectionCSV('CRYPTO', crypto, (rows) => toCSV(summarizeCryptoTransactions(rows))),
        sectionCSV('MUTUAL_FUNDS', mf, (rows) => toCSV(summarizeMutualFundTransactions(rows))),
        sectionCSV('EPF', epf, toCSV),
        sectionCSV('FIXED_DEPOSITS', fd, toCSV),
        sectionCSV('RECURRING_DEPOSITS', rd, toCSV),
      ];

      return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
    }
  );
}
