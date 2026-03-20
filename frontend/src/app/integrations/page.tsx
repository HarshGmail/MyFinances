'use client';

import { useState } from 'react';
import { useUserProfileQuery } from '@/api/query';
import { useRegenerateIngestTokenMutation } from '@/api/mutations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Smartphone,
  Bot,
  Copy,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';

const INTEGRATIONS = [
  {
    id: 'upi',
    name: 'UPI Auto-Track',
    icon: Smartphone,
    description: 'Auto-log UPI payments via iPhone Shortcuts',
    badge: 'iOS',
  },
  {
    id: 'mcp',
    name: 'Claude MCP',
    icon: Bot,
    description: 'Connect your finances to Claude AI',
    badge: 'AI',
  },
];

function UpiSection({ ingestToken, onRegenerate, isRegenerating }: {
  ingestToken: string | undefined;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">UPI Auto-Track</h2>
        <p className="text-muted-foreground">
          Automatically log UPI payment SMS messages as expense transactions using an iPhone Shortcut.
        </p>
      </div>

      {/* Token Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Ingest Token</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input readOnly value={ingestToken ?? ''} className="font-mono text-xs" />
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(ingestToken ?? '');
                toast.success('Token copied!');
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Keep this secret. Regenerate if compromised.</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="gap-1.5 text-muted-foreground"
            >
              <RefreshCw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>When you receive a UPI payment SMS, an iPhone Shortcut picks it up and sends the message to this app for parsing. The app extracts the amount, merchant, and type then logs it as an expense transaction automatically.</p>
          <ol className="space-y-2 list-decimal list-inside">
            <li>You make a UPI payment and receive an SMS</li>
            <li>The iPhone Shortcut triggers on the SMS notification</li>
            <li>It sends the SMS text + your token to the API</li>
            <li>The app parses and logs the expense automatically</li>
          </ol>
        </CardContent>
      </Card>

      {/* iPhone Shortcut Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">iPhone Shortcut Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg text-sm space-y-3">
            <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-2 text-sm">
              <span className="font-medium text-foreground">Method</span>
              <code className="bg-background px-2 py-0.5 rounded text-xs">POST</code>

              <span className="font-medium text-foreground">URL</span>
              <code className="bg-background px-2 py-0.5 rounded text-xs break-all">
                {API_BASE}/api/ingest/upi
              </code>

              <span className="font-medium text-foreground">Headers</span>
              <code className="bg-background px-2 py-0.5 rounded text-xs">Content-Type: application/json</code>

              <span className="font-medium text-foreground">Body fields</span>
              <div className="space-y-1">
                <div><code className="bg-background px-1 rounded text-xs">token</code> — your ingest token above</div>
                <div><code className="bg-background px-1 rounded text-xs">smsText</code> — the SMS text (Shortcut Input)</div>
                <div><code className="bg-background px-1 rounded text-xs">reason</code> — Ask Each Time (e.g. "Reason for expense")</div>
                <div><code className="bg-background px-1 rounded text-xs">timestamp</code> — Current Date (ISO format)</div>
              </div>
            </div>
          </div>

          <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Trigger: Notification received from Messages</p>
            <p className="text-xs">Set the shortcut automation to run when a message notification arrives from your bank&apos;s sender ID. Filter by the UPI payment keywords.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function McpSection({ ingestToken }: { ingestToken: string | undefined }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Claude MCP Integration</h2>
        <p className="text-muted-foreground">
          Connect your financial data to Claude AI and interact with it in natural language — ask questions, log transactions, and analyse your portfolio.
        </p>
      </div>

      {/* What you can do */}
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

      {/* Setup Steps */}
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
                content: <span className="text-sm text-muted-foreground">Click <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Add MCP Server</code></span>,
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
                content: <span className="text-sm text-muted-foreground">Claude will redirect you here to authorize. Make sure you&apos;re logged in — the connection happens automatically.</span>,
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

      {/* Token Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Your <strong className="text-foreground">ingest token</strong> is your MCP key — the same token used for UPI auto-tracking authenticates you with the MCP server.
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
            <a href="/integrations" className="text-primary underline">Integrations page</a>{' '}
            under UPI Auto-Track, then reconnect Claude.
          </p>
        </CardContent>
      </Card>

      {/* Available tools */}
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

export default function IntegrationsPage() {
  const [selected, setSelected] = useState<'upi' | 'mcp'>('upi');
  const { data: profile, isLoading, refetch } = useUserProfileQuery();
  const { mutateAsync: regenerateToken, isPending: isRegenerating } = useRegenerateIngestTokenMutation();

  const handleRegenerate = async () => {
    try {
      await regenerateToken();
      toast.success('Token regenerated successfully');
      await refetch();
    } catch {
      toast.error('Failed to regenerate token');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="flex gap-6">
          <div className="w-56 space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="flex-1 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-1">Connect external services to automate and enhance your finance tracking.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Sidebar */}
        <div className="w-full md:w-56 shrink-0">
          <nav className="space-y-1">
            {INTEGRATIONS.map(({ id, name, icon: Icon, description, badge }) => (
              <button
                key={id}
                onClick={() => setSelected(id as 'upi' | 'mcp')}
                className={`w-full text-left p-3 rounded-lg border transition-colors group ${
                  selected === id
                    ? 'bg-primary/10 border-primary/30 text-foreground'
                    : 'border-transparent hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">{badge}</Badge>
                    <ChevronRight className={`h-3 w-3 transition-opacity ${selected === id ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-tight">{description}</p>
              </button>
            ))}
          </nav>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          {selected === 'upi' && (
            <UpiSection
              ingestToken={profile?.ingestToken}
              onRegenerate={handleRegenerate}
              isRegenerating={isRegenerating}
            />
          )}
          {selected === 'mcp' && (
            <McpSection ingestToken={profile?.ingestToken} />
          )}
        </div>
      </div>
    </div>
  );
}
