'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, CopyCheck } from 'lucide-react';
import { formatCurrency, formatToPercentage } from '@/utils/numbers';
import { getProfitLossColor } from '@/utils/text';
import { useHomePortfolioData } from './useHomePortfolioData';
import AssetPortfolioCard from './AssetPortfolioCard';
import DepositCard from './DepositCard';
import CapitalGainsCard from './CapitalGainsCard';
import DashboardSkeleton from './DashboardSkeleton';

const Chart = dynamic(() => import('./Chart'), { ssr: false });

export default function Home() {
  const [copied, setCopied] = useState(false);
  const {
    userName,
    cgData,
    stockPortfolioData,
    mfPortfolioData,
    goldPortfolioData,
    cryptoPortfolioData,
    epfData,
    epfPortfolioData,
    fdData,
    rdData,
    portfolioSummary,
    stockXirr,
    mfXirr,
    goldXirr,
    cryptoXirr,
    overallXirr,
    polarCategories,
    investedData,
    currentValueData,
    isLoading,
    aiPrompt,
  } = useHomePortfolioData();

  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(aiPrompt);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = aiPrompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [aiPrompt]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-4">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold mb-6 text-center">Portfolio Dashboard</h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label={copied ? 'Copied Portfolio Prompt' : 'Copy Portfolio Prompt'}
          title={copied ? 'Copied!' : 'Copy AI-ready portfolio prompt'}
          onClick={handleCopyPrompt}
          className="rounded-full"
        >
          {copied ? <CopyCheck className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
        </Button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <SummaryStatCard
          label="Total Invested"
          value={formatCurrency(portfolioSummary.total.invested)}
        />
        <SummaryStatCard
          label={
            <>
              Total Current Value{' '}
              <span className={getProfitLossColor(portfolioSummary.total.profitLoss)}>
                ({formatCurrency(portfolioSummary.total.profitLoss)})
              </span>
            </>
          }
          value={
            <span className={getProfitLossColor(portfolioSummary.total.profitLoss)}>
              {formatCurrency(portfolioSummary.total.currentValue)}
            </span>
          }
          valueClassName={getProfitLossColor(portfolioSummary.total.profitLoss)}
        />
        <SummaryStatCard
          label="Total P&L %"
          value={`${formatToPercentage(portfolioSummary.total.profitLossPercentage)}%`}
          valueClassName={getProfitLossColor(portfolioSummary.total.profitLoss)}
        />
        <SummaryStatCard
          label="Overall XIRR %"
          value={overallXirr !== null ? `${overallXirr.toFixed(2)}%` : 'N/A'}
          valueClassName={
            overallXirr !== null && overallXirr >= 0 ? 'text-green-600' : 'text-red-600'
          }
        />
      </div>

      {/* Chart + Stocks/Gold/MF/Crypto cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="flex items-stretch">
          <div className="bg-card rounded-lg p-4 w-full flex items-center justify-center h-full border shadow-sm">
            <Chart
              investedData={investedData}
              currentValueData={currentValueData}
              categories={polarCategories}
            />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <AssetPortfolioCard
            title="Stocks Portfolio"
            summary={portfolioSummary.stocks}
            xirr={stockXirr}
            hasData={stockPortfolioData.length > 0}
            emptyMessage="No stock investments found"
          />
          <AssetPortfolioCard
            title="Gold Portfolio"
            summary={portfolioSummary.gold}
            xirr={goldXirr}
            hasData={goldPortfolioData.length > 0 && goldPortfolioData[0].totalInvested > 0}
            emptyMessage="No gold investments found"
          />
        </div>
        <div className="flex flex-col gap-6">
          <AssetPortfolioCard
            title="Mutual Funds Portfolio"
            summary={portfolioSummary.mutualFunds}
            xirr={mfXirr}
            hasData={mfPortfolioData.length > 0}
            emptyMessage="No mutual fund investments found"
          />
          <AssetPortfolioCard
            title="Crypto Portfolio"
            summary={portfolioSummary.crypto}
            xirr={cryptoXirr}
            hasData={cryptoPortfolioData.length > 0}
            emptyMessage="No crypto investments found"
          />
        </div>
      </div>

      {/* EPF / FD / RD cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-1">EPF Portfolio</h3>
          {epfData && epfData.length > 0 ? (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Total Balance:</span>
                <span className="text-blue-600 font-medium">
                  {formatCurrency(epfPortfolioData.currentValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Monthly Contribution:</span>
                <span>{formatCurrency(epfPortfolioData.monthlyContribution)}</span>
              </div>
              <div className="flex justify-between">
                <span>Annual Contribution:</span>
                <span>{formatCurrency(epfPortfolioData.annualContribution)}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              <p className="text-sm">No EPF accounts found</p>
            </div>
          )}
        </Card>
        <DepositCard
          title="Fixed Deposits Portfolio"
          summary={portfolioSummary.fd}
          items={fdData ?? []}
          emptyMessage="No fixed deposits found"
        />
        <DepositCard
          title="Recurring Deposits Portfolio"
          summary={portfolioSummary.rd}
          items={rdData ?? []}
          emptyMessage="No recurring deposits found"
        />
      </div>

      {/* Capital gains */}
      {cgData && <CapitalGainsCard cgData={cgData} />}

      {/* Footer */}
      <div className="text-center text-muted-foreground">
        <p>Welcome back, {userName}! Your comprehensive portfolio overview is ready.</p>
        <p className="text-sm mt-2">
          Total Assets: {stockPortfolioData.length} Stocks • {mfPortfolioData.length} Mutual Funds •{' '}
          {goldPortfolioData.filter((g) => g.totalInvested > 0).length} Gold •{' '}
          {cryptoPortfolioData.length} Crypto • {epfData?.length || 0} EPF • {fdData?.length || 0}{' '}
          FDs • {rdData?.length || 0} RDs
        </p>
      </div>
    </div>
  );
}
