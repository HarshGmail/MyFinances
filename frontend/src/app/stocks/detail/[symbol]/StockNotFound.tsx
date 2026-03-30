import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface Props {
  symbol: string;
}

export default function StockNotFound({ symbol }: Props) {
  const router = useRouter();

  return (
    <div className="p-4 max-w-2xl mx-auto min-h-screen flex items-center justify-center">
      <Card className="w-full border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            Stock Not Found
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-red-600 dark:text-red-300">
              We couldn't find financial data for <strong>{symbol}</strong>.
            </p>
            <p className="text-xs text-muted-foreground">This could happen if:</p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li>The ticker symbol doesn't exist</li>
              <li>Yahoo Finance is temporarily unavailable or rate-limiting</li>
              <li>The symbol is not listed on NSE (Indian stocks)</li>
            </ul>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Button onClick={() => router.push('/stocks/detail')}>Search Another Stock</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
