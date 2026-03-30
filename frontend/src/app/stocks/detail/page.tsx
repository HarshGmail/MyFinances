'use client';

import { useRouter } from 'next/navigation';
import { useStocksPortfolioQuery } from '@/api/query/stocks';
import CompanySearchBar from './[symbol]/CompanySearchBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from 'lucide-react';

export default function StockSearchLandingPage() {
  const router = useRouter();
  const { data: portfolioData } = useStocksPortfolioQuery();
  const portfolioStocks = portfolioData?.portfolio ?? [];

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-8 min-h-screen flex flex-col items-center justify-center">
      <div className="text-center space-y-2 mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-muted">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">Stock Research</h1>
        <p className="text-muted-foreground">
          Search for any company to view detailed financial metrics and analysis
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">Find a Stock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CompanySearchBar
            currentSymbol=""
            portfolioStocks={portfolioStocks}
            onSelect={(sym) => router.push(`/stocks/detail/${encodeURIComponent(sym)}`)}
          />
          <p className="text-xs text-muted-foreground">
            Type a company name or ticker symbol (e.g., "Reliance", "RELIANCE", or "RELIANCE.NS")
          </p>
        </CardContent>
      </Card>

      {portfolioStocks.length > 0 && (
        <div className="w-full">
          <p className="text-sm text-muted-foreground mb-3">Or browse your portfolio:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {portfolioStocks.slice(0, 6).map((stock) => (
              <button
                key={stock.stockName}
                onClick={() => router.push(`/stocks/detail/${encodeURIComponent(stock.stockName)}`)}
                className="p-2 text-sm font-medium border rounded-lg hover:bg-muted transition text-left"
              >
                {stock.stockName}
              </button>
            ))}
            {portfolioStocks.length > 6 && (
              <button
                onClick={() => router.push('/stocks/portfolio')}
                className="p-2 text-sm font-medium border rounded-lg hover:bg-muted transition text-left"
              >
                +{portfolioStocks.length - 6} more
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
