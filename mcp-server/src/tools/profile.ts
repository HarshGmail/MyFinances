import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BackendClient } from '../backendClient.js';
import { compactJSON, okResponse } from '../compact.js';

interface SalaryRecord {
  baseSalary: number;
  effectiveDate: string | Date;
  notes?: string;
}

interface MonthlyPayment {
  month: string | Date;
  baseAmount: number;
  bonus?: number;
  arrears?: number;
  totalPaid: number;
  notes?: string;
}

interface ProfileResponse {
  userName?: string;
  userEmail?: string;
  dob?: string | Date | null;
  phone?: string | null;
  panNumber?: string | null;
  joined?: string | Date;
  monthlySalary?: number | null;
  currentBaseSalary?: number | null;
  salaryHistory?: SalaryRecord[];
  paymentHistory?: MonthlyPayment[];
}

export function registerProfileTools(server: McpServer, client: BackendClient): void {
  server.registerTool(
    'profile_get',
    {
      description:
        'Fetch the current user profile: name, email, dob, phone, masked PAN, current base salary, salaryHistory, paymentHistory, and account-creation date. ALWAYS call this FIRST before profile_update or profile_add_salary_record / profile_add_payment_record so you can show the user what is currently stored and confirm what specifically they want to change. The PAN is returned masked (e.g. "ABCDE****F") — the full value is never exposed. Sensitive fields not shown here (password, MongoDB _id, ingestToken) are NOT editable from MCP.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await client.get<ProfileResponse>('/auth/profile');
      return { content: [{ type: 'text' as const, text: compactJSON(data) }] };
    }
  );

  server.registerTool(
    'profile_update',
    {
      description:
        'Update editable personal details on the user profile. Performs a partial update — only pass fields the user explicitly asked to change. WORKFLOW: (1) call profile_get first to read current values, (2) confirm with the user which fields and what new values, (3) call profile_update with ONLY those fields. Email changes are allowed but the user will need to log in with the new email going forward. The MongoDB _id and password CANNOT be changed via MCP. Salary history is managed by separate dedicated tools (profile_add_salary_record, profile_add_payment_record). If this tool fails or times out, retry it once.',
      inputSchema: z.object({
        userName: z.string().min(2).max(50).optional().describe('Display name (2-50 chars)'),
        userEmail: z
          .string()
          .email()
          .optional()
          .describe(
            'New login email. After this change the user must log in with this email going forward.'
          ),
        dob: z.string().optional().describe('Date of birth in ISO format e.g. "1995-08-14"'),
        phone: z
          .string()
          .regex(/^\d{10}$/)
          .optional()
          .describe('10-digit phone number, no country code or spaces'),
        panNumber: z
          .string()
          .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i)
          .optional()
          .describe(
            'PAN in format ABCDE1234F. Stored AES-256-GCM encrypted; only the masked form is ever returned.'
          ),
      }),
    },
    async (input) => {
      const result = await client.put('/auth/profile', input);
      return { content: [{ type: 'text' as const, text: okResponse(result) }] };
    }
  );

  server.registerTool(
    'profile_add_salary_record',
    {
      description:
        'Append a new base-salary record to salaryHistory — use this for hikes, promotions, or any change in the recurring base salary. Fetches the current salaryHistory and appends the new record before saving (does NOT overwrite). WORKFLOW: (1) call profile_get to confirm current base salary and timeline with the user, (2) confirm the new amount and effective date, (3) call this tool. effectiveDate is the date the new salary STARTED applying (not the date it was announced).',
      inputSchema: z.object({
        baseSalary: z.number().positive().describe('New monthly base salary in INR'),
        effectiveDate: z
          .string()
          .describe('ISO date when the new base salary started applying e.g. "2025-04-01"'),
        notes: z
          .string()
          .optional()
          .describe('Free-text context e.g. "36% hike", "Promotion to Senior", "Annual revision"'),
      }),
    },
    async (input) => {
      const profile = await client.get<ProfileResponse>('/auth/profile');
      const existing = Array.isArray(profile.salaryHistory) ? profile.salaryHistory : [];
      const updated = [
        ...existing,
        {
          baseSalary: input.baseSalary,
          effectiveDate: input.effectiveDate,
          ...(input.notes ? { notes: input.notes } : {}),
        },
      ];
      const result = await client.put('/auth/profile', { salaryHistory: updated });
      return { content: [{ type: 'text' as const, text: okResponse(result) }] };
    }
  );

  server.registerTool(
    'profile_add_payment_record',
    {
      description:
        'Append a monthly payment row to paymentHistory — use this to log what was actually credited in a given month (regular salary + any bonus + any arrears). Different from profile_add_salary_record: salary records track base structure changes, payment records track what hit the bank account. Fetches current paymentHistory and appends without overwriting. WORKFLOW: (1) call profile_get to see existing months, (2) confirm month and amounts with the user, (3) call this tool.',
      inputSchema: z.object({
        month: z
          .string()
          .describe('First day of the month in ISO format e.g. "2025-10-01" for October 2025'),
        baseAmount: z
          .number()
          .positive()
          .describe('Regular salary component for that month in INR'),
        bonus: z
          .number()
          .nonnegative()
          .optional()
          .describe('Bonus paid that month in INR (default 0)'),
        arrears: z
          .number()
          .nonnegative()
          .optional()
          .describe('Arrears from previous months paid in this month (default 0)'),
        totalPaid: z
          .number()
          .positive()
          .describe('Total amount actually credited that month in INR'),
        notes: z
          .string()
          .optional()
          .describe('Free-text context e.g. "Includes Sept arrears", "Diwali bonus"'),
      }),
    },
    async (input) => {
      const profile = await client.get<ProfileResponse>('/auth/profile');
      const existing = Array.isArray(profile.paymentHistory) ? profile.paymentHistory : [];
      const updated = [
        ...existing,
        {
          month: input.month,
          baseAmount: input.baseAmount,
          bonus: input.bonus ?? 0,
          arrears: input.arrears ?? 0,
          totalPaid: input.totalPaid,
          ...(input.notes ? { notes: input.notes } : {}),
        },
      ];
      const result = await client.put('/auth/profile', { paymentHistory: updated });
      return { content: [{ type: 'text' as const, text: okResponse(result) }] };
    }
  );
}
