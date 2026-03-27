'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';

export default function UpiIntegration({
  ingestToken,
  onRegenerate,
  isRegenerating,
}: {
  ingestToken: string | undefined;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">UPI Auto-Track</h2>
        <p className="text-muted-foreground">
          Automatically log UPI payment SMS messages as expense transactions using an iPhone
          Shortcut.
        </p>
      </div>

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
            <p className="text-xs text-muted-foreground">
              Keep this secret. Regenerate if compromised.
            </p>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            When you receive a UPI payment SMS, an iPhone Shortcut picks it up and sends the message
            to this app for parsing. The app extracts the amount, merchant, and type then logs it as
            an expense transaction automatically.
          </p>
          <ol className="space-y-2 list-decimal list-inside">
            <li>You make a UPI payment and receive an SMS</li>
            <li>The iPhone Shortcut triggers on the SMS notification</li>
            <li>It sends the SMS text + your token to the API</li>
            <li>The app parses and logs the expense automatically</li>
          </ol>
        </CardContent>
      </Card>

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
              <code className="bg-background px-2 py-0.5 rounded text-xs">
                Content-Type: application/json
              </code>

              <span className="font-medium text-foreground">Body fields</span>
              <div className="space-y-1">
                <div>
                  <code className="bg-background px-1 rounded text-xs">token</code> — your ingest
                  token above
                </div>
                <div>
                  <code className="bg-background px-1 rounded text-xs">smsText</code> — the SMS text
                  (Shortcut Input)
                </div>
                <div>
                  <code className="bg-background px-1 rounded text-xs">reason</code> — Ask Each Time
                  (e.g. "Reason for expense")
                </div>
                <div>
                  <code className="bg-background px-1 rounded text-xs">timestamp</code> — Current
                  Date (ISO format)
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Trigger: Notification received from Messages</p>
            <p className="text-xs">
              Set the shortcut automation to run when a message notification arrives from your
              bank&apos;s sender ID. Filter by the UPI payment keywords.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
