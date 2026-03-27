'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function McpIntegration({ ingestToken }: { ingestToken: string | undefined }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Claude MCP Integration</h2>
        <p className="text-muted-foreground">
          Connect your financial data to Claude AI and interact with it in natural language — ask
          questions, log transactions, and analyse your portfolio.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What you can do with Claude</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {[
              'Ask "How much did I spend on food this month?"',
              'Say "Log ₹450 expense for dinner at Zomato"',
              'Ask "What\'s my stock portfolio P&L?"',
              'Ask "Show me my mutual fund XIRR"',
              'Say "Add 10 shares of HDFC Bank at ₹1800"',
              'Ask "What are my active investment goals?"',
              'Ask "How much gold do I hold and what\'s its value?"',
            ].map((example, i) => (
              <li key={i} className="flex items-start gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                {example}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup in Claude.ai</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-4">
            {[
              {
                step: 1,
                title: 'Open Claude.ai Settings',
                content: (
                  <a
                    href="https://claude.ai/settings/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline text-sm"
                  >
                    Go to claude.ai → Settings → Integrations
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ),
              },
              {
                step: 2,
                title: 'Add MCP Server',
                content: (
                  <span className="text-sm text-muted-foreground">
                    Click{' '}
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Add MCP Server</code>
                  </span>
                ),
              },
              {
                step: 3,
                title: 'Enter the MCP URL',
                content: (
                  <div
                    className="inline-flex items-center gap-2 cursor-pointer group"
                    onClick={() => {
                      navigator.clipboard.writeText('https://mcp.my-finances.site/mcp');
                      toast.success('MCP URL copied!');
                    }}
                  >
                    <code className="bg-muted px-2 py-1 rounded text-xs group-hover:bg-accent transition-colors">
                      https://mcp.my-finances.site/mcp
                    </code>
                    <Copy className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                  </div>
                ),
              },
              {
                step: 4,
                title: 'Complete OAuth',
                content: (
                  <span className="text-sm text-muted-foreground">
                    Claude will redirect you here to authorize. Make sure you&apos;re logged in —
                    the connection happens automatically.
                  </span>
                ),
              },
            ].map(({ step, title, content }) => (
              <li key={step} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                  {step}
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">{title}</div>
                  <div>{content}</div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Your <strong className="text-foreground">ingest token</strong> is your MCP key — the
            same token used for UPI auto-tracking authenticates you with the MCP server.
          </p>
          {ingestToken && (
            <div className="flex gap-2">
              <Input readOnly value={ingestToken} className="font-mono text-xs" />
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(ingestToken);
                  toast.success('Token copied!');
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className="text-xs">
            Each user gets their own isolated data. If compromised, regenerate it on the{' '}
            <a href="/integrations" className="text-primary underline">
              Integrations page
            </a>{' '}
            under UPI Auto-Track, then reconnect Claude.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {[
              ['get_expense_transactions', 'Read daily expenses'],
              ['add_expense_transaction', 'Log a new expense'],
              ['get_recurring_expenses', 'Read recurring expenses'],
              ['get_stock_transactions', 'Read stock trades'],
              ['add_stock_transaction', 'Log a new stock trade'],
              ['get_portfolio_summary', 'Get live portfolio (slow)'],
              ['get_gold_transactions', 'Read gold transactions'],
              ['add_gold_transaction', 'Log a gold transaction'],
              ['get_crypto_transactions', 'Read crypto trades'],
              ['add_crypto_transaction', 'Log a crypto trade'],
              ['get_mutual_fund_transactions', 'Read MF transactions'],
              ['add_mutual_fund_transaction', 'Log an MF transaction'],
              ['get_epf_accounts', 'Read EPF accounts'],
              ['get_fixed_deposits', 'Read fixed deposits'],
              ['get_recurring_deposits', 'Read recurring deposits'],
              ['get_goals', 'Read investment goals'],
            ].map(([tool, desc]) => (
              <div key={tool} className="flex flex-col p-2 rounded-lg bg-muted/50">
                <code className="text-xs font-mono text-primary">{tool}</code>
                <span className="text-xs text-muted-foreground mt-0.5">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
