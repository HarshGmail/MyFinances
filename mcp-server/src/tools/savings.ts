import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';

export function registerSavingsTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'get_epf_accounts',
    {
      description: 'Fetch all EPF (Employee Provident Fund) accounts with contribution history and current balance. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/epf/getInfo');
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    'get_fixed_deposits',
    {
      description: 'Fetch all fixed deposits (FDs) with principal, interest rate, tenure, maturity date, and maturity amount. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/fixed-deposit/getDeposits');
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    'get_recurring_deposits',
    {
      description: 'Fetch all recurring deposits (RDs) with monthly installment, interest rate, tenure, and maturity details. If this tool fails or times out, retry it once.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get('/recurring-deposit/getDeposits');
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
