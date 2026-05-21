import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';
import { toCSV } from '../compact.js';

export function registerSavingsTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'savings_get_epf',
    {
      description:
        'Fetch all EPF (Employee Provident Fund) accounts with contribution history and current balance. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/epf/getInfo');
      return { content: [{ type: 'text' as const, text: toCSV(data) }] };
    }
  );

  server.registerTool(
    'savings_get_fd',
    {
      description:
        'Fetch all fixed deposits (FDs) with principal, interest rate, tenure, maturity date, and maturity amount. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/fixed-deposit/getDeposits');
      return { content: [{ type: 'text' as const, text: toCSV(data) }] };
    }
  );

  server.registerTool(
    'savings_get_rd',
    {
      description:
        'Fetch all recurring deposits (RDs) with monthly installment, interest rate, tenure, and maturity details. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/recurring-deposit/getDeposits');
      return { content: [{ type: 'text' as const, text: toCSV(data) }] };
    }
  );
}
