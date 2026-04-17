export interface ParsedEpfEntry {
  wageMonth: string;
  date: Date;
  employeeContribution: number;
  creditDay: number;
}

export interface ParsedEpfPassbook {
  establishmentName: string;
  uan: string;
  financialYear: string;
  entries: ParsedEpfEntry[];
}

export interface EpfSegment {
  organizationName: string;
  epfAmount: number;
  startDate: Date;
  creditDay: number;
}

const MONTH_ABBR_TO_INDEX: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

export function parseEpfPassbook(text: string): ParsedEpfPassbook {
  // Extract establishment name — appears after "Establishment ID/Name CODE / NAME"
  const estabMatch = text.match(/Establishment ID\/Name\s+[A-Z0-9]+\s*\/\s*(.+)/);
  const establishmentName = estabMatch ? estabMatch[1].trim().replace(/,\s*$/, '').trim() : '';

  const uanMatch = text.match(/\bUAN\s+(\d{10,12})\b/);
  const uan = uanMatch?.[1] ?? '';

  const fyMatch = text.match(/Financial Year.*?(\d{4}-\d{4})/);
  const financialYear = fyMatch?.[1] ?? '';

  // Transaction row pattern:
  // WageMonth  CreditDate  CR  Cont. For Due-Month DUEREF  WagesEPF  WagesEPS  Employee  Employer  Pension
  // Example: Oct-2024 13-11-2024 CR Cont. For Due-Month 112024 33,250 0 3,990 3,990 0
  const txnRegex =
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})\s+(\d{1,2})-\d{2}-\d{4}\s+CR\s+Cont\.\s*For\s+Due-Month\s+\d+\s+[\d,]+\s+[\d,]+\s+([\d,]+)\s+([\d,]+)\s+[\d,]+/g;

  const entries: ParsedEpfEntry[] = [];
  let match: RegExpExecArray | null;

  while ((match = txnRegex.exec(text)) !== null) {
    const monthAbbr = match[1];
    const year = parseInt(match[2], 10);
    const creditDay = parseInt(match[3], 10);
    const employeeContribution = parseInt(match[4].replace(/,/g, ''), 10);
    const employerContribution = parseInt(match[5].replace(/,/g, ''), 10);
    const date = new Date(year, MONTH_ABBR_TO_INDEX[monthAbbr], 1);

    entries.push({
      wageMonth: `${monthAbbr}-${year}`,
      date,
      employeeContribution: employeeContribution + employerContribution,
      creditDay,
    });
  }

  return { establishmentName, uan, financialYear, entries };
}

export function groupIntoSegments(
  entries: ParsedEpfEntry[],
  organizationName: string
): EpfSegment[] {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
  const segments: EpfSegment[] = [];

  let currentAmount = sorted[0].employeeContribution;
  let segmentStart = sorted[0].date;
  let creditDay = sorted[0].creditDay;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].employeeContribution !== currentAmount) {
      segments.push({
        organizationName,
        epfAmount: currentAmount,
        startDate: segmentStart,
        creditDay,
      });
      currentAmount = sorted[i].employeeContribution;
      segmentStart = sorted[i].date;
      creditDay = sorted[i].creditDay;
    }
  }
  segments.push({ organizationName, epfAmount: currentAmount, startDate: segmentStart, creditDay });

  return segments;
}
