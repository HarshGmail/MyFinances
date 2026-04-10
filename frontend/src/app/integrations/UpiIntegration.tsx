'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Mail, MessageSquare, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface UpiIntegrationProps {
  ingestToken?: string;
  isLoadingToken?: boolean;
}

export default function UpiIntegration({
  ingestToken,
  isLoadingToken = false,
}: UpiIntegrationProps) {
  const emailAddress = 'transactions-ingest@my-finances.site';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">UPI Auto-Track</h2>
        <p className="text-muted-foreground">
          Automatically log UPI payment SMS messages as expense transactions using an iPhone
          Shortcut.
        </p>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            How it works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            When you receive a UPI payment SMS, an iPhone Shortcut automatically sends the message
            to our inbox. We parse it and log it as an expense transaction. When you open the app
            and navigate to the tracker, all synced transactions appear automatically.
          </p>
          <ol className="space-y-2 list-decimal list-inside">
            <li>You make a UPI payment and receive an SMS from your bank</li>
            <li>The iPhone Shortcut triggers on the SMS notification</li>
            <li>It emails the SMS text to our transaction inbox</li>
            <li>When you open the app, transactions sync to your tracker</li>
          </ol>
        </CardContent>
      </Card>

      {/* Getting Your Token */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Ingest Token</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingToken ? (
            <>
              <Skeleton className="h-10 w-full" />
              <p className="text-xs text-muted-foreground text-center">
                <Loader2 className="inline h-3 w-3 mr-1 animate-spin" />
                Loading your token...
              </p>
            </>
          ) : ingestToken ? (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                Copy this token and include it in your shortcut email:
              </p>
              <div className="flex gap-2 items-center">
                <code className="flex-1 bg-muted px-3 py-2 rounded-lg text-sm font-mono break-all">
                  {ingestToken}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(ingestToken);
                    toast.success('Token copied!');
                  }}
                  className="p-2 hover:bg-muted rounded transition-colors"
                  title="Copy token"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Token unavailable. Please refresh the page.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Email Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground mb-2">
            Your iPhone Shortcut will send UPI SMS messages to this email address:
          </p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 bg-muted px-3 py-2 rounded-lg text-sm font-mono break-all">
              {emailAddress}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(emailAddress);
                toast.success('Email copied!');
              }}
              className="p-2 hover:bg-muted rounded transition-colors"
              title="Copy email address"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* iPhone Shortcut Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            iPhone Shortcut Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Create Automation */}
          <div>
            <h3 className="font-medium text-sm mb-2">Step 1: Create a New Automation</h3>
            <div className="bg-muted p-3 rounded-lg text-sm space-y-2 text-muted-foreground">
              <ol className="space-y-1 list-decimal list-inside">
                <li>
                  Open the <strong>Shortcuts</strong> app on your iPhone
                </li>
                <li>
                  Go to the <strong>Automation</strong> tab
                </li>
                <li>
                  Tap <strong>+ Create Personal Automation</strong>
                </li>
                <li>
                  Select <strong>Messages</strong> as the trigger
                </li>
                <li>
                  Choose <strong>&quot;Is from&quot;</strong> and add your bank&apos;s sender ID
                  (e.g., your bank code)
                </li>
                <li>
                  Tap <strong>Next</strong>
                </li>
              </ol>
            </div>
          </div>

          {/* Step 2: Add Actions */}
          <div>
            <h3 className="font-medium text-sm mb-2">Step 2: Add Shortcut Actions</h3>
            <div className="bg-muted p-3 rounded-lg text-sm space-y-2 text-muted-foreground">
              <p className="text-xs">In the automation editor, add these actions in order:</p>
              <ol className="space-y-2 list-decimal list-inside">
                <li>
                  <strong>Get Message Details</strong> — extracts the SMS text
                </li>
                <li>
                  <strong>Get Your Ingest Token</strong> — copy your token from above (or from
                  Settings &gt; Integrations)
                </li>
                <li>
                  <strong>Send Email</strong> — configure as:
                  <div className="ml-4 mt-1 space-y-1 text-xs font-mono bg-background p-2 rounded">
                    <div>
                      <strong>To:</strong> {emailAddress}
                    </div>
                    <div>
                      <strong>Subject:</strong> UPI Transaction
                    </div>
                    <div className="whitespace-pre-wrap">
                      <strong>Body:</strong>
                      <br />
                      {`Token: [Your ingest token]
[SMS text from Message Details]`}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 ml-4">
                    Example:
                    <br />
                    <code className="text-blue-600 dark:text-blue-400">
                      {`Token: abc123xyz789abc
UPI/P2M/123456/Amazon - Rs.500 debit from HDFC Bank`}
                    </code>
                  </p>
                </li>
                <li>
                  <strong>Show Result</strong> — optional, shows &quot;Sent&quot; confirmation
                </li>
              </ol>
            </div>
          </div>

          {/* Step 3: Testing */}
          <div>
            <h3 className="font-medium text-sm mb-2">Step 3: Test It</h3>
            <div className="bg-muted p-3 rounded-lg text-sm space-y-2 text-muted-foreground">
              <ol className="space-y-1 list-decimal list-inside">
                <li>Make a test UPI payment from your phone</li>
                <li>When you receive the SMS, the shortcut will automatically trigger</li>
                <li>The SMS will be emailed to our system</li>
                <li>Open ourFinance app → go to Expense Tracker</li>
                <li>Your UPI transaction will appear automatically ✓</li>
              </ol>
            </div>
          </div>

          {/* Important Note */}
          <div className="p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-300">
            <p className="font-medium mb-1">💡 Pro Tips</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>
                <strong>Don&apos;t forget the token</strong> — include it on the first line of the
                email body
              </li>
              <li>
                Make sure the shortcut is <strong>enabled</strong> in Automation settings
              </li>
              <li>Test with a small UPI payment first</li>
              <li>Check your spam folder if emails don&apos;t arrive</li>
              <li>Transactions sync when you open the Expense Tracker tab</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
