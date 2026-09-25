import { MutualFundNavHistoryData } from '@/api/dataInterface';
import { parseNavDate } from './navDates';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;
const MONTH_DAYS = 30;

export interface NavChange {
  change: number;
  changePct: number;
}

export interface FundDailyMove {
  fundName: string;
  units: number;
  currentValue: number;
  latestNav: number;
  latestNavDate: string;
  previousNav: number | null;
  previousNavDate: string | null;
  navChange: NavChange | null;
  valueChange: number;
  weekChange: NavChange | null;
  monthChange: NavChange | null;
  isStale: boolean;
}

export interface MfDailySummary {
  funds: FundDailyMove[];
  totalValue: number;
  totalChange: number;
  totalChangePct: number;
  advancers: number;
  decliners: number;
  latestNavDate: string | null;
  previousNavDate: string | null;
  staleCount: number;
}

export interface FundHolding {
  fundName: string;
  units: number;
  navHistory: MutualFundNavHistoryData[] | undefined;
}

function navChange(current: number, base: number | null): NavChange | null {
  if (base === null || base <= 0) return null;
  const change = current - base;
  return { change, changePct: (change / base) * 100 };
}

function navOnOrBefore(history: MutualFundNavHistoryData[], cutoff: number): number | null {
  const point = history.find((entry) => parseNavDate(entry.date) <= cutoff);
  return point ? parseFloat(point.nav) : null;
}

function buildFundMove(
  { fundName, units, navHistory }: FundHolding,
  latestNavTime: number
): FundDailyMove | null {
  if (!navHistory?.length || units <= 0) return null;
  const [latest, previous] = navHistory;
  const latestNav = parseFloat(latest.nav);
  const latestTime = parseNavDate(latest.date);
  const isStale = latestTime < latestNavTime;
  const previousNav = previous ? parseFloat(previous.nav) : null;
  const dayChange = isStale ? null : navChange(latestNav, previousNav);

  return {
    fundName,
    units,
    currentValue: units * latestNav,
    latestNav,
    latestNavDate: latest.date,
    previousNav,
    previousNavDate: previous?.date ?? null,
    navChange: dayChange,
    valueChange: dayChange ? units * dayChange.change : 0,
    weekChange: navChange(
      latestNav,
      navOnOrBefore(navHistory, latestTime - WEEK_DAYS * MS_PER_DAY)
    ),
    monthChange: navChange(
      latestNav,
      navOnOrBefore(navHistory, latestTime - MONTH_DAYS * MS_PER_DAY)
    ),
    isStale,
  };
}

export function buildMfDailySummary(holdings: FundHolding[]): MfDailySummary {
  const latestNavTime = Math.max(
    0,
    ...holdings
      .filter((holding) => holding.navHistory?.length)
      .map((holding) => parseNavDate(holding.navHistory![0].date))
  );

  const funds = holdings
    .map((holding) => buildFundMove(holding, latestNavTime))
    .filter((fund): fund is FundDailyMove => fund !== null)
    .sort((a, b) => b.valueChange - a.valueChange);

  const current = funds.find((fund) => fund.navChange !== null);
  const totalValue = funds.reduce((sum, fund) => sum + fund.currentValue, 0);
  const totalChange = funds.reduce((sum, fund) => sum + fund.valueChange, 0);
  const previousValue = totalValue - totalChange;

  return {
    funds,
    totalValue,
    totalChange,
    totalChangePct: previousValue > 0 ? (totalChange / previousValue) * 100 : 0,
    advancers: funds.filter((fund) => fund.valueChange > 0).length,
    decliners: funds.filter((fund) => fund.valueChange < 0).length,
    latestNavDate: current?.latestNavDate ?? null,
    previousNavDate: current?.previousNavDate ?? null,
    staleCount: funds.filter((fund) => fund.isStale).length,
  };
}
