import { Request, Response } from 'express';
import { callMcpTool } from '../services/mcpClient';

function getIngestToken(req: Request): string | null {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.split(' ')[1];
}

async function wrapTool(
  req: Request,
  res: Response,
  toolName: string,
  args: Record<string, unknown>
) {
  const token = getIngestToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header. Use your ingest token as Bearer token.' });
    return;
  }
  try {
    const data = await callMcpTool(token, toolName, args);
    res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Invalid ingest token') || msg.includes('401')) {
      res.status(401).json({ error: 'Invalid ingest token' });
    } else {
      res.status(502).json({ error: `MCP call failed: ${msg}` });
    }
  }
}

// ─── Expense transactions ────────────────────────────────────────────────────

export async function getExpenseTransactions(req: Request, res: Response) {
  const { startDate, endDate, limit } = req.query;
  await wrapTool(req, res, 'get_expense_transactions', {
    ...(startDate && { startDate: String(startDate) }),
    ...(endDate && { endDate: String(endDate) }),
    ...(limit && { limit: Number(limit) }),
  });
}

export async function addExpenseTransaction(req: Request, res: Response) {
  const { name, amount, category, date } = req.body;
  await wrapTool(req, res, 'add_expense_transaction', {
    name,
    amount,
    category,
    ...(date && { date }),
  });
}

export async function getRecurringExpenses(req: Request, res: Response) {
  await wrapTool(req, res, 'get_recurring_expenses', {});
}

// ─── Stocks ──────────────────────────────────────────────────────────────────

export async function getStockTransactions(req: Request, res: Response) {
  const { symbol } = req.query;
  await wrapTool(req, res, 'get_stock_transactions', {
    ...(symbol && { symbol: String(symbol) }),
  });
}

export async function getPortfolioSummary(req: Request, res: Response) {
  await wrapTool(req, res, 'get_portfolio_summary', {});
}

export async function addStockTransaction(req: Request, res: Response) {
  const { symbol, type, numOfUnits, price, date } = req.body;
  await wrapTool(req, res, 'add_stock_transaction', {
    symbol,
    type,
    numOfUnits,
    price,
    ...(date && { date }),
  });
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export async function getGoals(req: Request, res: Response) {
  await wrapTool(req, res, 'get_goals', {});
}

// ─── OpenAI tool definitions (for GPT Actions schema) ────────────────────────

export function getToolDefinitions(_req: Request, res: Response) {
  res.json({
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_expense_transactions',
          description: 'Fetch the user\'s daily expense log. Optionally filter by date range or limit count.',
          parameters: {
            type: 'object',
            properties: {
              startDate: { type: 'string', description: 'ISO date string (YYYY-MM-DD)' },
              endDate: { type: 'string', description: 'ISO date string (YYYY-MM-DD)' },
              limit: { type: 'number', description: 'Max number of records to return' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'add_expense_transaction',
          description: 'Log a new daily expense transaction.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Expense description' },
              amount: { type: 'number', description: 'Amount in INR' },
              category: { type: 'string', description: 'Expense category (e.g. Food, Transport)' },
              date: { type: 'string', description: 'ISO date string (defaults to today)' },
            },
            required: ['name', 'amount', 'category'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_recurring_expenses',
          description: 'Get the user\'s recurring expense categories (rent, subscriptions, etc.) with frequency and amount.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_stock_transactions',
          description: 'Fetch the user\'s stock transactions. Optionally filter by symbol.',
          parameters: {
            type: 'object',
            properties: {
              symbol: { type: 'string', description: 'Stock symbol to filter by (e.g. RELIANCE.NS)' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_portfolio_summary',
          description: 'Get live portfolio summary with current values and P&L for all held stocks. May take a few seconds as it fetches live prices.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'add_stock_transaction',
          description: 'Record a new stock buy or sell transaction.',
          parameters: {
            type: 'object',
            properties: {
              symbol: { type: 'string', description: 'Stock symbol (e.g. RELIANCE.NS)' },
              type: { type: 'string', enum: ['credit', 'debit'], description: 'credit = buy, debit = sell' },
              numOfUnits: { type: 'number', description: 'Number of shares' },
              price: { type: 'number', description: 'Price per share in INR' },
              date: { type: 'string', description: 'ISO date string (defaults to today)' },
            },
            required: ['symbol', 'type', 'numOfUnits', 'price'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_goals',
          description: 'Get the user\'s investment goals with target amounts and current progress.',
          parameters: { type: 'object', properties: {} },
        },
      },
    ],
  });
}
