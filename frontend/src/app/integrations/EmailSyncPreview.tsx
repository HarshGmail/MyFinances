'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { EmailSyncPreview } from '@/api/dataInterface';

function PreviewTable({
  title,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors text-sm font-medium"
        onClick={onToggle}
      >
        <span>
          {title} ({count})
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && <div className="overflow-x-auto">{children}</div>}
    </div>
  );
}

export default function EmailSyncPreviewCard({
  preview,
  onImport,
  isImporting,
}: {
  preview: EmailSyncPreview;
  onImport: () => void;
  isImporting: boolean;
}) {
  const [mfExpanded, setMfExpanded] = useState(true);
  const [goldExpanded, setGoldExpanded] = useState(true);
  const [stocksExpanded, setStocksExpanded] = useState(true);
  const [cryptoExpanded, setCryptoExpanded] = useState(true);

  const totalNew =
    preview.mutualFunds.length +
    preview.gold.length +
    (preview.stocks?.length ?? 0) +
    (preview.crypto?.length ?? 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Preview</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalNew} new transaction{totalNew !== 1 ? 's' : ''} found
              {preview.duplicatesSkipped > 0 &&
                `, ${preview.duplicatesSkipped} duplicate${preview.duplicatesSkipped !== 1 ? 's' : ''} skipped`}
            </p>
          </div>
          {totalNew > 0 && (
            <Button onClick={onImport} disabled={isImporting} className="gap-2">
              <Download className="h-4 w-4" />
              {isImporting ? 'Importing…' : `Import All (${totalNew})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {preview.mutualFunds.length > 0 && (
          <PreviewTable
            title="Mutual Fund Transactions"
            count={preview.mutualFunds.length}
            expanded={mfExpanded}
            onToggle={() => setMfExpanded(!mfExpanded)}
          >
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-2 font-medium">Date</th>
                  <th className="text-left p-2 font-medium">Fund</th>
                  <th className="text-right p-2 font-medium">Units</th>
                  <th className="text-right p-2 font-medium">Amount</th>
                  <th className="text-center p-2 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {preview.mutualFunds.map((tx, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-2 whitespace-nowrap text-muted-foreground">
                      {format(new Date(tx.date), 'dd MMM yy')}
                    </td>
                    <td className="p-2 max-w-[200px] truncate" title={tx.fundName}>
                      {tx.fundName}
                    </td>
                    <td className="p-2 text-right">{tx.numOfUnits.toFixed(3)}</td>
                    <td className="p-2 text-right">₹{tx.amount.toLocaleString('en-IN')}</td>
                    <td className="p-2 text-center">
                      <Badge
                        variant={tx.type === 'credit' ? 'default' : 'secondary'}
                        className="text-xs px-1.5 py-0"
                      >
                        {tx.type === 'credit' ? 'Buy' : 'Sell'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PreviewTable>
        )}

        {preview.gold.length > 0 && (
          <PreviewTable
            title="Gold Transactions"
            count={preview.gold.length}
            expanded={goldExpanded}
            onToggle={() => setGoldExpanded(!goldExpanded)}
          >
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-2 font-medium">Date</th>
                  <th className="text-right p-2 font-medium">Qty (g)</th>
                  <th className="text-right p-2 font-medium">Rate/g</th>
                  <th className="text-right p-2 font-medium">Amount</th>
                  <th className="text-center p-2 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {preview.gold.map((tx, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-2 whitespace-nowrap text-muted-foreground">
                      {format(new Date(tx.date), 'dd MMM yy')}
                    </td>
                    <td className="p-2 text-right">{tx.quantity.toFixed(4)}</td>
                    <td className="p-2 text-right">₹{tx.goldPrice.toLocaleString('en-IN')}</td>
                    <td className="p-2 text-right">₹{tx.amount.toLocaleString('en-IN')}</td>
                    <td className="p-2 text-center">
                      <Badge
                        variant={tx.type === 'credit' ? 'default' : 'secondary'}
                        className="text-xs px-1.5 py-0"
                      >
                        {tx.type === 'credit' ? 'Buy' : 'Sell'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PreviewTable>
        )}

        {preview.stocks && preview.stocks.length > 0 && (
          <PreviewTable
            title="Stock Holdings"
            count={preview.stocks.length}
            expanded={stocksExpanded}
            onToggle={() => setStocksExpanded(!stocksExpanded)}
          >
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-2 font-medium">Date</th>
                  <th className="text-left p-2 font-medium">Stock</th>
                  <th className="text-right p-2 font-medium">Shares</th>
                  <th className="text-right p-2 font-medium">Price</th>
                  <th className="text-right p-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {preview.stocks.map((h, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-2 whitespace-nowrap text-muted-foreground">
                      {format(new Date(h.date), 'dd MMM yy')}
                    </td>
                    <td className="p-2 max-w-[180px] truncate" title={h.stockName}>
                      {h.stockName}
                    </td>
                    <td className="p-2 text-right">{h.numOfShares}</td>
                    <td className="p-2 text-right">₹{h.marketPrice.toLocaleString('en-IN')}</td>
                    <td className="p-2 text-right">₹{h.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PreviewTable>
        )}

        {preview.crypto && preview.crypto.length > 0 && (
          <PreviewTable
            title="Crypto Trades"
            count={preview.crypto.length}
            expanded={cryptoExpanded}
            onToggle={() => setCryptoExpanded(!cryptoExpanded)}
          >
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-2 font-medium">Date</th>
                  <th className="text-left p-2 font-medium">Coin</th>
                  <th className="text-right p-2 font-medium">Qty</th>
                  <th className="text-right p-2 font-medium">Price</th>
                  <th className="text-right p-2 font-medium">Amount</th>
                  <th className="text-center p-2 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {preview.crypto.map((tx, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-2 whitespace-nowrap text-muted-foreground">
                      {format(new Date(tx.date), 'dd MMM yy')}
                    </td>
                    <td className="p-2 font-medium">{tx.coinSymbol}</td>
                    <td className="p-2 text-right">{tx.quantity}</td>
                    <td className="p-2 text-right">₹{tx.coinPrice.toLocaleString('en-IN')}</td>
                    <td className="p-2 text-right">₹{tx.amount.toLocaleString('en-IN')}</td>
                    <td className="p-2 text-center">
                      <Badge
                        variant={tx.type === 'credit' ? 'default' : 'secondary'}
                        className="text-xs px-1.5 py-0"
                      >
                        {tx.type === 'credit' ? 'Buy' : 'Sell'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PreviewTable>
        )}

        {totalNew === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No new transactions to import. All found transactions are already in your records.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
