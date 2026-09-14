'use client';

import Link from 'next/link';
import { StocksPortfolioItem } from '@/api/dataInterface';
import { formatCurrency, formatToPercentage, formatToTwoDecimals } from '@/utils/numbers';
import { getProfitLossColor } from '@/utils/text';
import { MobileDataCard, MobileDataMetric } from '@/components/custom/MobileDataCard';

interface StockPortfolioCardProps {
  row: StocksPortfolioItem;
  stockXirr: number | null | undefined;
  unrealized?: { stcg: number; ltcg: number };
}

export function StockPortfolioCard({ row, stockXirr, unrealized }: StockPortfolioCardProps) {
  const hasPrice = row.isDataAvailable;

  return (
    <MobileDataCard
      title={
        <Link
          href={`/stocks/detail/${encodeURIComponent(row.stockName)}`}
          className="underline hover:text-primary"
        >
          {row.stockName || '-'}
        </Link>
      }
      headline={hasPrice ? formatCurrency(formatToTwoDecimals(row.currentValuation)) : '-'}
      subline={
        <span className={getProfitLossColor(row.profitLoss)}>
          {hasPrice ? formatToPercentage(row.profitLossPercentage) : '-'}
        </span>
      }
    >
      <MobileDataMetric label="Shares">{row.numOfShares}</MobileDataMetric>
      <MobileDataMetric label="Avg Price">
        {formatCurrency(formatToTwoDecimals(row.avgPrice))}
      </MobileDataMetric>
      <MobileDataMetric label="Invested">
        {formatCurrency(formatToTwoDecimals(row.investedAmount))}
      </MobileDataMetric>

      <MobileDataMetric label="Price">
        {hasPrice ? formatCurrency(formatToTwoDecimals(row.currentPrice)) : '-'}
      </MobileDataMetric>
      <MobileDataMetric label="P/L">
        <span className={getProfitLossColor(row.profitLoss)}>
          {hasPrice ? formatCurrency(formatToTwoDecimals(row.profitLoss)) : '-'}
        </span>
      </MobileDataMetric>
      <MobileDataMetric label="XIRR">
        {stockXirr !== null && stockXirr !== undefined ? (
          <span className={getProfitLossColor(row.profitLoss)}>{stockXirr.toFixed(2)}%</span>
        ) : (
          'N/A'
        )}
      </MobileDataMetric>

      <MobileDataMetric label="1 Day">
        <span className={getProfitLossColor(row.oneDayChange)}>
          {hasPrice ? formatCurrency(formatToTwoDecimals(row.oneDayChange)) : '-'}
        </span>
      </MobileDataMetric>
      <MobileDataMetric label="STCG">
        {unrealized ? (
          <span className={getProfitLossColor(unrealized.stcg)}>
            {formatCurrency(unrealized.stcg)}
          </span>
        ) : (
          '-'
        )}
      </MobileDataMetric>
      <MobileDataMetric label="LTCG">
        {unrealized ? (
          <span className={getProfitLossColor(unrealized.ltcg)}>
            {formatCurrency(unrealized.ltcg)}
          </span>
        ) : (
          '-'
        )}
      </MobileDataMetric>
    </MobileDataCard>
  );
}
