import { differenceInYears } from 'date-fns';
import { EpfAccount } from '@/api/dataInterface';

export interface EpfYearlyDataPoint {
  year: number;
  balance: number;
  realBalance: number;
  contribution: number;
  monthlyContribution: number;
  interestEarned: number;
  interestEarnedReal: number;
}

export interface EpfSummary {
  finalBalance: number;
  finalBalanceReal: number;
  totalContributed: number;
  totalContributedReal: number;
  totalInterest: number;
  totalInterestReal: number;
  yearsToRetirement: number;
  inflationAnnualPct: number;
}

export interface EpfCalculationResult {
  yearlyData: EpfYearlyDataPoint[];
  summary: EpfSummary | null;
}

const EPF_RATE = 8.25 / 100;
const RETIREMENT_AGE = 58;

export function calculateEPFGrowth(
  accounts: EpfAccount[],
  userDob: string | undefined,
  inflationAnnualPct: number
): EpfCalculationResult {
  if (accounts.length === 0) return { yearlyData: [], summary: null };

  const INF = inflationAnnualPct / 100;
  const sortedAccounts = [...accounts].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const currentYear = new Date().getFullYear();
  const currentAge = userDob ? differenceInYears(new Date(), new Date(userDob)) : 25;
  const safeAge = Math.max(0, Math.min(RETIREMENT_AGE, currentAge));
  const retirementYear = currentYear + (RETIREMENT_AGE - safeAge);

  let totalBalanceNominal = 0;
  let totalContributedNominal = 0;
  let totalContributedRealPV = 0;

  const yearlyData: EpfYearlyDataPoint[] = [];

  for (let year = currentYear; year <= Math.min(retirementYear, 2060); year++) {
    let monthlyContribution = 0;

    for (let i = 0; i < sortedAccounts.length; i++) {
      const account = sortedAccounts[i];
      const accountStartYear = new Date(account.startDate).getFullYear();
      const nextAccountStartYear =
        i < sortedAccounts.length - 1
          ? new Date(sortedAccounts[i + 1].startDate).getFullYear()
          : retirementYear + 1;

      if (year >= accountStartYear && year < nextAccountStartYear) {
        monthlyContribution = account.epfAmount;
        break;
      }
    }

    const yearlyContribution = monthlyContribution * 12;
    totalBalanceNominal += yearlyContribution;
    totalContributedNominal += yearlyContribution;
    totalBalanceNominal = totalBalanceNominal * (1 + EPF_RATE);

    const yearsFromNow = year - currentYear + 1;
    const realBalance = totalBalanceNominal / Math.pow(1 + INF, yearsFromNow);
    const pvContribution = yearlyContribution / Math.pow(1 + INF, yearsFromNow);
    totalContributedRealPV += pvContribution;

    const interestNominal = totalBalanceNominal - totalContributedNominal;
    const interestReal = realBalance - totalContributedRealPV;

    yearlyData.push({
      year,
      balance: Math.round(totalBalanceNominal),
      realBalance: Math.round(realBalance),
      contribution: yearlyContribution,
      monthlyContribution,
      interestEarned: Math.round(interestNominal),
      interestEarnedReal: Math.round(interestReal),
    });
  }

  const finalNominal = yearlyData.at(-1)?.balance ?? 0;
  const finalReal = yearlyData.at(-1)?.realBalance ?? 0;

  return {
    yearlyData,
    summary: {
      finalBalance: finalNominal,
      finalBalanceReal: finalReal,
      totalContributed: totalContributedNominal,
      totalContributedReal: Math.round(totalContributedRealPV),
      totalInterest: finalNominal - totalContributedNominal,
      totalInterestReal: Math.round(finalReal - totalContributedRealPV),
      yearsToRetirement: retirementYear - currentYear,
      inflationAnnualPct,
    },
  };
}
