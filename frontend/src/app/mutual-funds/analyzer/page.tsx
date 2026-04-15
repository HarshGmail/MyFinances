'use client';

import { useRouter } from 'next/navigation';
import { useMutualFundInfoFetchQuery } from '@/api/query/mutual-funds-info';
import MFSearchBar from './[schemeCode]/MFSearchBar';

export default function MFSearchLandingPage() {
  const router = useRouter();
  const { data: portfolioFunds } = useMutualFundInfoFetchQuery();

  const handleSelect = (schemeCode: number) => {
    router.push(`/mutual-funds/analyzer/${schemeCode}`);
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Analyze Mutual Funds</h1>
        <p className="text-muted-foreground">
          Search for any mutual fund to view detailed performance metrics, risk analysis, and
          historical returns.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Search for a Fund</h2>
        <div className="max-w-xl">
          <MFSearchBar portfolioFunds={portfolioFunds} onSelect={handleSelect} />
        </div>
      </div>

      {portfolioFunds && portfolioFunds.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Portfolio Funds</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {portfolioFunds.map((fund) => (
              <button
                key={fund.schemeNumber}
                onClick={() => handleSelect(fund.schemeNumber)}
                className="p-4 border rounded-lg hover:bg-muted transition-colors text-left"
              >
                <p className="font-medium">{fund.fundName}</p>
                <p className="text-xs text-muted-foreground">Scheme #{fund.schemeNumber}</p>
                {fund.sipAmount && (
                  <p className="text-xs text-muted-foreground mt-1">SIP: ₹{fund.sipAmount}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
