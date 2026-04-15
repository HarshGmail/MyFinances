'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSingleMFNavHistoryQuery } from '@/api/query/mutual-funds-info';
import { useMutualFundInfoFetchQuery } from '@/api/query/mutual-funds-info';
import MFSearchBar from './MFSearchBar';
import MFHeader from './MFHeader';
import MFNavChart from './MFNavChart';
import MFSnapshotVerdict from './MFSnapshotVerdict';
import MFFundamentalsGrid from './MFFundamentalsGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { computeMFMetrics } from './mfVerdicts';

export default function MFDetailPage() {
  const params = useParams();
  const router = useRouter();
  const schemeCode = parseInt(params.schemeCode as string, 10);

  const {
    data: navHistoryData,
    isLoading: isNavLoading,
    error: navError,
  } = useSingleMFNavHistoryQuery(schemeCode);
  const { data: portfolioFunds } = useMutualFundInfoFetchQuery();

  const isInPortfolio = portfolioFunds?.some((f) => f.schemeNumber === schemeCode) ?? false;

  // Extract nav data and meta
  const navData = navHistoryData?.data || [];
  const meta = navHistoryData?.meta || null;
  const fundName = meta?.scheme_name || `Scheme ${schemeCode}`;

  // Compute metrics
  const metrics = navData.length > 0 ? computeMFMetrics(navData, meta) : null;

  // Check if we have no data
  const hasNoData = !isNavLoading && navError && (!navData || navData.length === 0);

  if (hasNoData) {
    return (
      <div className="p-4 max-w-5xl mx-auto space-y-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Fund Not Found</h1>
          <p className="text-muted-foreground mb-4">
            Unable to find data for scheme code {schemeCode}
          </p>
          <button
            onClick={() => router.push('/mutual-funds/analyzer')}
            className="text-primary hover:underline"
          >
            ← Back to search
          </button>
        </div>
      </div>
    );
  }

  // Show skeleton while loading
  if (isNavLoading || !metrics) {
    return (
      <div className="p-4 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <MFSearchBar
        currentSchemeCode={schemeCode}
        portfolioFunds={portfolioFunds}
        onSelect={(code) => router.push(`/mutual-funds/analyzer/${code}`)}
      />

      <MFHeader
        fundName={fundName}
        fundHouse={metrics.fundHouse || undefined}
        currentNAV={metrics.currentNAV}
        change1D={metrics.change1D}
        changePct1D={metrics.changePct1D}
        isInPortfolio={isInPortfolio}
        isLoading={isNavLoading}
      />

      <MFNavChart navData={navData} isLoading={isNavLoading} />

      <MFSnapshotVerdict metrics={metrics} isLoading={isNavLoading} />

      <MFFundamentalsGrid metrics={metrics} navData={navData} isLoading={isNavLoading} />
    </div>
  );
}
