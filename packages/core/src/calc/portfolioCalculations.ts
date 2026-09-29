/**
 * Shared portfolio calculation functions.
 * These are the single source of truth for all asset-class calculations.
 * Both the home dashboard and individual portfolio pages should use these.
 */

import { MutualFundTransaction, MutualFundInfo, EpfTimelineSummary, EpfAccount } from '../types';
import groupBy from 'lodash/groupBy';
import { differenceInMonths } from 'date-fns';
import { holdingXirrPercent } from './holdingXirr';

// ── Mutual Funds ─────────────────────────────────────────────────────────────

export interface MFNavDataMap {
  [schemeNumber: string]: { nav: number; navDate: string } | null;
}

export interface MFFundData {
  fundName: string;
  totalUnits: number;
  totalInvested: number;
  currentNav: number | null;
  currentValue: number | null;
  profitLoss: number | null;
  profitLossPercentage: number | null;
}

export interface MFPortfolioSummary {
  fundData: MFFundData[];
  totalInvested: number;
  totalCurrentValue: number;
}

/**
 * Calculates mutual fund portfolio data per fund and overall summary.
 * Correctly handles both credit (buy) and debit (sell) transactions.
 */
export function calcMFPortfolio(
  transactions: MutualFundTransaction[],
  mfInfoData: MutualFundInfo[],
  navDataMap: MFNavDataMap
): MFPortfolioSummary {
  const grouped = groupBy(transactions, 'fundName');

  const fundData: MFFundData[] = Object.entries(grouped).map(([fundName, txs]) => {
    const totalCreditUnits = txs
      .filter((tx) => tx.type === 'credit')
      .reduce((s, tx) => s + tx.numOfUnits, 0);
    const totalCreditAmount = txs
      .filter((tx) => tx.type === 'credit')
      .reduce((s, tx) => s + tx.amount, 0);
    const avgCostPerUnit = totalCreditUnits > 0 ? totalCreditAmount / totalCreditUnits : 0;

    const totalUnits = txs.reduce(
      (sum, tx) => sum + (tx.type === 'credit' ? tx.numOfUnits : -tx.numOfUnits),
      0
    );
    // Amount invested = cost basis of remaining units (avg cost method).
    // Subtracting sale proceeds instead of cost was causing negative invested values.
    const remainingUnits = Math.max(0, totalUnits);
    const totalInvested = remainingUnits * avgCostPerUnit;

    const info = mfInfoData.find((i) => i.fundName === fundName);
    const schemeNumber = info?.schemeNumber;
    const navInfo = schemeNumber ? navDataMap[schemeNumber] : null;
    const currentNav = navInfo ? navInfo.nav : null;
    const currentValue = currentNav !== null ? remainingUnits * currentNav : null;
    const profitLoss = currentValue !== null ? currentValue - totalInvested : null;
    const profitLossPercentage =
      profitLoss !== null && totalInvested > 0 ? (profitLoss / totalInvested) * 100 : null;

    return {
      fundName,
      totalUnits,
      totalInvested,
      currentNav,
      currentValue,
      profitLoss,
      profitLossPercentage,
    };
  });

  const totalInvested = fundData.reduce((sum, f) => sum + f.totalInvested, 0);
  const totalCurrentValue = fundData.reduce((sum, f) => sum + (f.currentValue ?? 0), 0);

  return { fundData, totalInvested, totalCurrentValue };
}

// ── EPF ──────────────────────────────────────────────────────────────────────

export interface EPFPortfolioSummary {
  invested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

/**
 * Calculates EPF portfolio summary from timeline data.
 * - invested   = totalContributions (employee + employer deposits, excluding interest)
 * - currentValue = totalCurrentBalance (contributions + interest credited so far)
 */
export function calcEPFPortfolio(epfTimelineData: EpfTimelineSummary): EPFPortfolioSummary {
  const invested = epfTimelineData.totalContributions ?? 0;
  const currentValue = epfTimelineData.totalCurrentBalance ?? 0;
  const profitLoss = currentValue - invested;
  const profitLossPercentage = invested > 0 ? (profitLoss / invested) * 100 : 0;

  return { invested, currentValue, profitLoss, profitLossPercentage };
}

export function epfContributionFlows(
  accounts: EpfAccount[],
  now: Date = new Date()
): { amount: number; when: Date }[] {
  const flows: { amount: number; when: Date }[] = [];
  accounts.forEach((account, index) => {
    const accountStart = new Date(account.startDate);
    const nextStart = index < accounts.length - 1 ? new Date(accounts[index + 1].startDate) : now;
    const months = differenceInMonths(nextStart, accountStart);
    for (let month = 0; month < months; month++) {
      const creditDate = new Date(accountStart);
      creditDate.setMonth(creditDate.getMonth() + month);
      creditDate.setDate(account.creditDay);
      if (creditDate <= now) flows.push({ amount: account.epfAmount, when: creditDate });
    }
  });
  return flows;
}

export interface MFFundRow extends MFFundData {
  schemeNumber: number | null;
  fundXirr: number | null;
}

export function buildMfFundRows(
  transactions: MutualFundTransaction[],
  mfInfoData: MutualFundInfo[],
  navDataMap: MFNavDataMap,
  asOf: Date = new Date()
): MFFundRow[] {
  const byFund = groupBy(transactions, 'fundName');
  return calcMFPortfolio(transactions, mfInfoData, navDataMap).fundData.map((fund) => ({
    ...fund,
    schemeNumber: mfInfoData.find((info) => info.fundName === fund.fundName)?.schemeNumber ?? null,
    fundXirr:
      fund.currentValue === null
        ? null
        : holdingXirrPercent(byFund[fund.fundName] ?? [], fund.currentValue, asOf),
  }));
}

export function latestNavMap(
  schemeNumbers: (string | number)[],
  navHistory: Record<string, { data?: { date: string; nav: string }[] } | undefined> | undefined
): MFNavDataMap {
  const map: MFNavDataMap = {};
  schemeNumbers.forEach((schemeNumber) => {
    const latest = navHistory?.[schemeNumber]?.data?.[0];
    map[schemeNumber] = latest ? { nav: parseFloat(latest.nav), navDate: latest.date } : null;
  });
  return map;
}

export interface MFRowsSummary {
  invested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  xirr: number | null;
}

export function summariseMfRows(
  rows: MFFundRow[],
  transactions: MutualFundTransaction[]
): MFRowsSummary {
  const invested = rows.reduce((sum, row) => sum + row.totalInvested, 0);
  const currentValue = rows.reduce((sum, row) => sum + (row.currentValue ?? 0), 0);
  const profitLoss = currentValue - invested;
  return {
    invested,
    currentValue,
    profitLoss,
    profitLossPercentage: invested > 0 ? (profitLoss / invested) * 100 : 0,
    xirr: rows.length ? holdingXirrPercent(transactions, currentValue) : null,
  };
}
