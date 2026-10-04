import type {
  CardTransactionDirection,
  CardTransactionKind,
  CreditCardIssuer,
  EmiInstallment,
} from '../schemas/creditCard';

export interface ParsedCardStatementSummary {
  periodStart: Date | null;
  periodEnd: Date | null;
  statementDate?: Date;
  dueDate?: Date;
  totalDue: number | null;
  minimumDue?: number;
  previousBalance?: number;
  creditLimit?: number;
  availableLimit?: number;
}

export interface ParsedCardTransaction {
  date: Date;
  description: string;
  amount: number;
  direction: CardTransactionDirection;
  kind: CardTransactionKind;
  category: string;
  emiInstallment?: EmiInstallment;
}

export interface ParsedCardStatement {
  summary: ParsedCardStatementSummary;
  transactions: ParsedCardTransaction[];
  warnings: string[];
  reconciled: boolean;
}

export interface CardLineClassification {
  kind: CardTransactionKind;
  category: string;
  emiInstallment?: EmiInstallment;
}

interface IssuerProfile {
  sectionStart?: RegExp[];
  sectionEnd?: RegExp[];
  creditMarkers: RegExp;
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const RECONCILIATION_TOLERANCE = 1;
const MAX_CONTINUATION_LINES = 3;
const TWO_DIGIT_YEAR_BASE = 2000;
const OTHERS_CATEGORY = 'Others';

const MONTH_SRC = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';
const DATE_SRC =
  `(?:\\d{1,2}[/\\-.]\\d{1,2}[/\\-.](?:\\d{4}|\\d{2})` +
  `|\\d{1,2}[\\s\\-]?${MONTH_SRC}[\\s\\-,]*(?:\\d{4}|\\d{2})(?!\\d)` +
  `|${MONTH_SRC}\\s+\\d{1,2},?\\s+\\d{4})`;
const CURRENCY_SRC = '(?:Rs\\.?|INR|₹|`|[\\uE000-\\uF8FF])';
const SIGN_MARKER_SRC = '(?:Cr|CR|Dr|DR)';
const AMOUNT_SRC = `${CURRENCY_SRC}?\\s*(-?[\\d,]*\\d(?:\\.\\d{1,2})?)\\s*(${SIGN_MARKER_SRC})?(?![\\w/]|\\.\\d)`;
const TIME_SRC = '(?:[\\s|]+\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\s*[AP]M)?)?';

const LEADING_DATE_RE = new RegExp(`^\\s*(${DATE_SRC})`, 'i');
const COMPACT_DATE_RE = new RegExp(`^\\s*\\d{1,2}\\s*${MONTH_SRC}[\\s|]`, 'i');
const VALUE_TOKEN_RE = new RegExp(`(${DATE_SRC})|${AMOUNT_SRC}`, 'gi');
const LABEL_VALUE_GAP_SRC = `^[\\s:=\\-–|]*(?:\\(\\s*(?:${CURRENCY_SRC}|in\\s+${CURRENCY_SRC})\\s*\\)[\\s:=\\-|]*)?`;
const SAME_LINE_AMOUNT_RE = new RegExp(`${LABEL_VALUE_GAP_SRC}${AMOUNT_SRC}`, 'i');
const SAME_LINE_DATE_RE = new RegExp(`${LABEL_VALUE_GAP_SRC}(${DATE_SRC})`, 'i');
const TRANSACTION_ROW_RE = new RegExp(
  `^\\s*(${DATE_SRC})${TIME_SRC}[\\s|]+(.+?)[\\s|]+(?:(Cr|Dr)\\s*|([+\\-]))?${CURRENCY_SRC}?\\s*([\\d,]+\\.\\d{2})\\s*(Cr|CR|Dr|DR|C|D|\\+|-)?[\\s|]*$`,
  'i'
);
const PERIOD_LABEL_RE = new RegExp(
  `(?:Statement|Billing)\\s+(?:Period|Cycle)[^\\d\\n]{0,15}?(${DATE_SRC})\\s*(?:to|-|–|till|through)\\s*(${DATE_SRC})`,
  'i'
);
const BARE_PERIOD_RE = new RegExp(`(${DATE_SRC})\\s+to\\s+(${DATE_SRC})`, 'i');
const NAMED_DATE_SRC =
  `(?:\\d{1,2}[\\s\\-]?${MONTH_SRC}[\\s\\-,]*(?:\\d{4}|\\d{2})` +
  `|${MONTH_SRC}\\s+\\d{1,2},?\\s+\\d{4})`;
const DASH_PERIOD_RE = new RegExp(`(${NAMED_DATE_SRC})\\s*[-–]\\s*(${NAMED_DATE_SRC})`, 'i');

type SummaryField =
  | 'totalDue'
  | 'minimumDue'
  | 'previousBalance'
  | 'creditLimit'
  | 'availableLimit'
  | 'statementDate'
  | 'dueDate'
  | 'cashLimit'
  | 'paymentsCredits'
  | 'purchasesDebits'
  | 'financeCharges';

const FIELD_LABELS: Record<SummaryField, RegExp[]> = {
  totalDue: [
    /Total\s+Amount\s+Due/i,
    /Total\s+Payment\s+Due/i,
    /Total\s+Dues?\b/i,
    /Total\s+Outstanding/i,
    /Net\s+Outstanding\s+Balance/i,
  ],
  minimumDue: [
    /Minimum\s+Amount\s+Due/i,
    /Minimum\s+Payment\s+Due/i,
    /Min\.?\s*Amt\.?\s*Due/i,
    /Minimum\s+Due/i,
  ],
  previousBalance: [/Previous\s+(?:Statement\s+)?Balance/i, /Opening\s+Balance/i],
  creditLimit: [/(?<!Available\s)(?:Total\s+)?Credit\s+Limit/i, /Card\s+Limit/i],
  availableLimit: [/Available\s+Credit\s+Limit/i, /Available\s+Limit/i],
  statementDate: [/Statement\s+Date/i, /Statement\s+Generation\s+Date/i],
  dueDate: [/Payment\s+Due\s+Date/i, /(?<!Payment\s)Due\s+Date/i, /Pay\s+by\s+Date/i],
  cashLimit: [/(?:Available\s+)?Cash\s+(?:Withdrawal\s+)?Limit/i],
  paymentsCredits: [/Payments?\s*(?:\/|&|and)\s*(?:Other\s+)?Credits?/i],
  purchasesDebits: [/Purchases?\s*(?:\/|&|and)\s*(?:Other\s+)?(?:Debits?|Charges)/i],
  financeCharges: [/Finance\s+Charges?/i, /Fees?,?\s*Taxes?\s*(?:&|and)\s*Interest/i],
};

const SUMMARY_REGION_END_MARKERS = [
  /minimum amount due calculation/i,
  /finance charge(?:s)? calculation/i,
  /most important terms/i,
  /illustration/i,
  /in the table given below/i,
  /assumed that (?:the|you)/i,
  /revised mad computation/i,
];

function summaryRegion(lines: string[]): string[] {
  const endIndex = lines.findIndex((line) =>
    SUMMARY_REGION_END_MARKERS.some((marker) => marker.test(line))
  );
  return endIndex === -1 ? lines : lines.slice(0, endIndex);
}

const ALL_LABELS = Object.values(FIELD_LABELS).flat();
const SUMMARY_ROW_FIELDS: SummaryField[] = [
  'totalDue',
  'minimumDue',
  'previousBalance',
  'creditLimit',
  'availableLimit',
  'statementDate',
  'dueDate',
  'cashLimit',
];
const SUMMARY_ROW_LABELS = SUMMARY_ROW_FIELDS.flatMap((field) => FIELD_LABELS[field]);
const SUMMARY_DESCRIPTION_RE =
  /^(?:total\b|opening balance|closing balance|previous balance|statement (?:date|period)|payment due|minimum amount|credit limit|available)/i;

const DEFAULT_SECTION_START = [
  /transaction details/i,
  /domestic transactions/i,
  /international transactions/i,
  /your transactions/i,
];
const DEFAULT_SECTION_END = [
  /reward points summary/i,
  /reward summary/i,
  /important information/i,
  /terms and conditions/i,
  /schedule of charges/i,
];
const DEFAULT_CREDIT_MARKERS =
  /PAYMENT RECEIVED|THANK YOU|\bREFUND|REVERSAL|REVERSED|CASH ?BACK|WAIVER/i;

const ISSUER_PROFILES: Record<CreditCardIssuer, IssuerProfile> = {
  sbi: {
    sectionStart: [/transactions? for/i, ...DEFAULT_SECTION_START],
    sectionEnd: DEFAULT_SECTION_END,
    creditMarkers: DEFAULT_CREDIT_MARKERS,
  },
  hdfc: {
    sectionStart: [...DEFAULT_SECTION_START],
    sectionEnd: DEFAULT_SECTION_END,
    creditMarkers: DEFAULT_CREDIT_MARKERS,
  },
  icici: {
    sectionStart: [/transaction details/i, /date\s+serno/i],
    sectionEnd: [/earnings summary/i, ...DEFAULT_SECTION_END],
    creditMarkers: DEFAULT_CREDIT_MARKERS,
  },
  axis: {
    sectionStart: [/account summary.*transaction/i, ...DEFAULT_SECTION_START],
    sectionEnd: [/end of statement/i, ...DEFAULT_SECTION_END],
    creditMarkers: DEFAULT_CREDIT_MARKERS,
  },
  hsbc: {
    sectionStart: [
      /purchases?\s*(?:&|and)\s*installments?/i,
      /your transaction details/i,
      ...DEFAULT_SECTION_START,
    ],
    sectionEnd: [/total purchase outstanding/i, /net outstanding balance/i, ...DEFAULT_SECTION_END],
    creditMarkers: DEFAULT_CREDIT_MARKERS,
  },
  yes: {
    sectionStart: [...DEFAULT_SECTION_START],
    sectionEnd: [/end of the statement/i, ...DEFAULT_SECTION_END],
    creditMarkers: DEFAULT_CREDIT_MARKERS,
  },
  other: {
    sectionStart: DEFAULT_SECTION_START,
    sectionEnd: DEFAULT_SECTION_END,
    creditMarkers: DEFAULT_CREDIT_MARKERS,
  },
};

const MERCHANT_CATEGORIES: { category: string; pattern: RegExp }[] = [
  {
    category: 'Entertainment',
    pattern: /NETFLIX|SPOTIFY|HOTSTAR|PRIME VIDEO|BOOKMYSHOW|\bPVR\b|\bINOX\b|YOUTUBE/,
  },
  {
    category: 'Travel',
    pattern:
      /MAKEMYTRIP|GOIBIBO|IRCTC|INDIGO|AIR INDIA|VISTARA|AIRBNB|\bOYO\b|HOTEL|CLEARTRIP|AKASA/,
  },
  {
    category: 'Food & Dining',
    pattern: /SWIGGY|ZOMATO|RESTAURANT|\bCAFE|DOMINOS|MCDONALD|STARBUCKS|\bKFC\b/,
  },
  {
    category: 'Transportation',
    pattern:
      /\bUBER\b|\bOLA\b|RAPIDO|\bFUEL\b|PETROL|\bHPCL\b|\bBPCL\b|\bIOCL\b|INDIAN OIL|\bSHELL\b|FASTAG|\bMETRO\b/,
  },
  {
    category: 'Bills & Utilities',
    pattern:
      /ELECTRICITY|AIRTEL|\bJIO\b|VODAFONE|\bVI\b|BESCOM|BROADBAND|\bGAS\b|\bWATER\b|RECHARGE/,
  },
  {
    category: 'Healthcare',
    pattern: /PHARMACY|APOLLO|MEDPLUS|HOSPITAL|CLINIC|\b1MG\b|PHARMEASY/,
  },
  { category: 'Education', pattern: /UDEMY|COURSERA|SCHOOL|COLLEGE/ },
  { category: 'Personal Care', pattern: /SALON|\bSPA\b|URBAN COMPANY/ },
  { category: 'Insurance', pattern: /INSURANCE|\bLIC\b|POLICYBAZAAR/ },
  {
    category: 'Shopping',
    pattern:
      /AMAZON|FLIPKART|MYNTRA|\bAJIO\b|NYKAA|BLINKIT|ZEPTO|BIGBASKET|INSTAMART|DMART|RELIANCE/,
  },
];

const PAYMENT_RE = /PAYMENT RECEIVED|THANK YOU|\bBBPS\b|\bNEFT\b|\bIMPS\b|AUTOPAY|PAYMENT - /;
const REFUND_RE = /REFUND|REVERSAL|REVERSED|WAIVER/;
const CASHBACK_RE = /CASH ?BACK/;
const TAX_RE = /\bIGST\b|\bCGST\b|\bSGST\b|\bGST\b|SERVICE TAX/;
const EMI_INTEREST_RE = /\bEMI\b.*INTEREST|INTEREST.*\bEMI\b/;
const EMI_PRINCIPAL_RE = /\bEMI\b.*PRINCIPAL|PRINCIPAL.*\bEMI\b|EMI AMOUNT|\bEMI\b/;
const FEE_RE =
  /LATE PAYMENT|ANNUAL FEE|JOINING FEE|RENEWAL FEE|OVER ?LIMIT|SURCHARGE|PROCESSING FEE|\bFEES?\b|\bCHARGES?\b/;
const INTEREST_RE = /FINANCE CHARGE|\bINTEREST\b/;
const INSTALLMENT_LABEL_RE = /INST(?:ALLMENT)?\s*(?:NO\.?)?\s*(\d+)\s*(?:\/|OF)\s*(\d+)/;
const INSTALLMENT_FRACTION_RE = /(?<![\d/])(\d{1,2})\s*(?:\/|OF)\s*(\d{1,2})(?![\d/])/;
const CREDIT_SIGN_MARKERS = new Set(['CR', 'C', '+', '-']);
const LEADING_REFERENCE_NUMBER_RE = /^\s*\d{6,}\s+/;
const MASK_CHARACTER_SRC = '[Xx*•#]';

function twoDigitYearToFull(year: number): number {
  return year < 100 ? TWO_DIGIT_YEAR_BASE + year : year;
}

function utcDate(year: number, monthIndex: number, day: number): Date | null {
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(twoDigitYearToFull(year), monthIndex, day));
  return date.getUTCDate() === day ? date : null;
}

function monthFromName(name: string): number | undefined {
  return MONTH_INDEX[name.slice(0, 3).toLowerCase()];
}

export function parseStatementDate(raw: string): Date | null {
  const value = raw.trim();
  const numeric = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (numeric) return utcDate(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1]));

  const dayFirst = value.match(/^(\d{1,2})[\s-]?([A-Za-z]+)\.?[\s\-,]*(\d{2,4})$/);
  if (dayFirst) {
    const month = monthFromName(dayFirst[2]);
    return month === undefined ? null : utcDate(Number(dayFirst[3]), month, Number(dayFirst[1]));
  }

  const monthFirst = value.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthFirst) {
    const month = monthFromName(monthFirst[1]);
    return month === undefined
      ? null
      : utcDate(Number(monthFirst[3]), month, Number(monthFirst[2]));
  }

  return null;
}

function parseSignedAmount(digits: string, marker?: string): number | null {
  const value = Number(digits.replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;
  return marker?.toUpperCase() === 'CR' ? -Math.abs(value) : value;
}

const RUPEE_GLYPH_RE = /(^|[\s|+=])C(?=\s*[\d,]*\d)/g;
const TRAILING_INDICATOR_RE = /\s[a-z•·](?=\s*$)/i;

function normaliseLine(line: string): string {
  return line
    .replace(/\s+/g, ' ')
    .replace(RUPEE_GLYPH_RE, '$1₹')
    .replace(TRAILING_INDICATOR_RE, '')
    .trim();
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/).map(normaliseLine).filter(Boolean);
}

interface LabelMatch {
  start: number;
  end: number;
}

function findHeaderLabels(line: string): LabelMatch[] {
  const matches: LabelMatch[] = [];
  for (const label of ALL_LABELS) {
    const globalLabel = new RegExp(label.source, 'gi');
    for (const match of line.matchAll(globalLabel)) {
      matches.push({ start: match.index ?? 0, end: (match.index ?? 0) + match[0].length });
    }
  }
  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  return matches.filter(
    (match, index) => !matches.slice(0, index).some((earlier) => match.start < earlier.end)
  );
}

interface ValueToken {
  date?: Date;
  amount?: number;
}

function tokenizeValues(line: string): ValueToken[] {
  const tokens: ValueToken[] = [];
  for (const match of line.matchAll(VALUE_TOKEN_RE)) {
    if (match[1]) {
      const date = parseStatementDate(match[1]);
      if (date) tokens.push({ date });
      continue;
    }
    const amount = parseSignedAmount(match[2], match[3]);
    if (amount !== null) tokens.push({ amount });
  }
  return tokens;
}

type ValueKind = 'amount' | 'date';

function readSameLineValue(rest: string, kind: ValueKind): ValueToken | null {
  if (kind === 'date') {
    const match = rest.match(SAME_LINE_DATE_RE);
    const date = match ? parseStatementDate(match[1]) : null;
    return date ? { date } : null;
  }
  if (SAME_LINE_DATE_RE.test(rest)) return null;
  const match = rest.match(SAME_LINE_AMOUNT_RE);
  if (!match) return null;
  const amount = parseSignedAmount(match[1], match[2]);
  return amount === null ? null : { amount };
}

function readColumnarValue(
  lines: string[],
  lineIndex: number,
  labelStart: number,
  kind: ValueKind
): ValueToken | null {
  const headerLabels = findHeaderLabels(lines[lineIndex]);
  const column = headerLabels.findIndex((label) => label.start === labelStart);
  if (column < 0) return null;
  const valueLine = lines[lineIndex + 1];
  if (!valueLine || findHeaderLabels(valueLine).length > 0) return null;
  const token = tokenizeValues(valueLine)[column];
  if (!token) return null;
  return (kind === 'date' ? token.date : token.amount) !== undefined ? token : null;
}

function findLabelledValue(
  lines: string[],
  field: SummaryField,
  kind: ValueKind
): ValueToken | null {
  for (const label of FIELD_LABELS[field]) {
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const match = lines[lineIndex].match(label);
      if (!match || match.index === undefined) continue;
      const rest = lines[lineIndex].slice(match.index + match[0].length);
      const value =
        readSameLineValue(rest, kind) ?? readColumnarValue(lines, lineIndex, match.index, kind);
      if (value) return value;
    }
  }
  return null;
}

function findAmount(lines: string[], field: SummaryField): number | undefined {
  return findLabelledValue(lines, field, 'amount')?.amount;
}

function findDate(lines: string[], field: SummaryField): Date | undefined {
  return findLabelledValue(lines, field, 'date')?.date;
}

function findPeriod(text: string): { start: Date | null; end: Date | null } {
  const match =
    text.match(PERIOD_LABEL_RE) ?? text.match(BARE_PERIOD_RE) ?? text.match(DASH_PERIOD_RE);
  if (!match) return { start: null, end: null };
  return { start: parseStatementDate(match[1]), end: parseStatementDate(match[2]) };
}

const AMOUNT_TOKEN_RE = /-?[\d,]+\.\d{2}/g;

function amountsOnLine(line: string): number[] {
  return (line.match(AMOUNT_TOKEN_RE) ?? []).map((token) => Number(token.replace(/,/g, '')));
}

const DEFAULT_LABEL_VALUE_WINDOW = 2;

function amountsAfterLabel(
  lines: string[],
  labelPattern: RegExp,
  window = DEFAULT_LABEL_VALUE_WINDOW,
  minCount = 1
): number[] | null {
  const labelIndex = lines.findIndex((line) => labelPattern.test(line));
  if (labelIndex === -1) return null;
  for (let offset = 0; offset <= window && labelIndex + offset < lines.length; offset += 1) {
    const amounts = amountsOnLine(lines[labelIndex + offset]);
    if (amounts.length >= minCount) return amounts;
  }
  return null;
}

const AXIS_EQUATION_LABEL_RE = /Previous\s+Balance\s*-\s*Payments.*=\s*Total\s+Payment\s+Due/i;
const ICICI_BOX_LABEL_RE =
  /Previous\s+Balance\s+Purchases\s*\/\s*Charges\s+Cash\s+Advances\s+Payments\s*\/\s*Credits/i;

function deriveTotalFromEquation(lines: string[]): number | null {
  const values = amountsAfterLabel(lines, AXIS_EQUATION_LABEL_RE);
  if (!values || values.length < 2) return null;
  return values[values.length - 1];
}

function deriveTotalFromBalanceBox(
  lines: string[]
): { totalDue: number; previousBalance: number } | null {
  const values = amountsAfterLabel(lines, ICICI_BOX_LABEL_RE);
  if (!values || values.length < 4) return null;
  const [previousBalance, purchases, cashAdvances, payments] = values;
  return {
    previousBalance,
    totalDue: roundToPaise(previousBalance + purchases + cashAdvances - payments),
  };
}

const HDFC_DUES_LABEL_RE = /PREVIOUS\s+STATEMENT\s+DUES/i;
const HDFC_DUES_VALUE_COUNT = 4;

const HDFC_DUES_VALUE_WINDOW = 5;

function deriveTotalFromHdfcDues(
  lines: string[]
): { totalDue: number; previousBalance: number } | null {
  const values = amountsAfterLabel(
    lines,
    HDFC_DUES_LABEL_RE,
    HDFC_DUES_VALUE_WINDOW,
    HDFC_DUES_VALUE_COUNT
  );
  if (!values || values.length < HDFC_DUES_VALUE_COUNT) return null;
  const [previousBalance, payments, purchases, financeCharges] = values;
  return {
    previousBalance,
    totalDue: roundToPaise(previousBalance - payments + purchases + financeCharges),
  };
}

interface SummaryParseResult {
  summary: ParsedCardStatementSummary;
  balancesFromBox: boolean;
}

function parseSummary(text: string, allLines: string[]): SummaryParseResult {
  const lines = summaryRegion(allLines);
  const period = findPeriod(text);
  const statementDate = findDate(lines, 'statementDate');
  const balanceBox = deriveTotalFromBalanceBox(lines) ?? deriveTotalFromHdfcDues(lines);
  const labelledTotal = findAmount(lines, 'totalDue');
  const totalDue = deriveTotalFromEquation(lines) ?? labelledTotal ?? balanceBox?.totalDue ?? null;
  const balancesFromBox =
    balanceBox !== null && labelledTotal !== undefined
      ? Math.abs(balanceBox.totalDue - labelledTotal) <= RECONCILIATION_TOLERANCE
      : balanceBox !== null;
  return {
    summary: {
      periodStart: period.start,
      periodEnd: period.end ?? statementDate ?? null,
      statementDate,
      dueDate: findDate(lines, 'dueDate'),
      totalDue,
      minimumDue: findAmount(lines, 'minimumDue'),
      previousBalance: findAmount(lines, 'previousBalance') ?? balanceBox?.previousBalance,
      creditLimit: findAmount(lines, 'creditLimit'),
      availableLimit: findAmount(lines, 'availableLimit'),
    },
    balancesFromBox,
  };
}

function selectTransactionLines(lines: string[], profile: IssuerProfile): string[] {
  const startMarkers = profile.sectionStart ?? [];
  const endMarkers = profile.sectionEnd ?? [];
  const matchesAny = (line: string, markers: RegExp[]) =>
    markers.some((marker) => marker.test(line));
  if (!lines.some((line) => matchesAny(line, startMarkers))) return lines;

  const selected: string[] = [];
  let insideSection = false;
  for (const line of lines) {
    if (matchesAny(line, startMarkers)) {
      insideSection = true;
      continue;
    }
    if (matchesAny(line, endMarkers)) {
      insideSection = false;
      continue;
    }
    if (insideSection) selected.push(line);
  }
  return selected;
}

function cleanDescription(raw: string): string {
  const collapsed = raw
    .replace(/\|/g, ' ')
    .replace(LEADING_REFERENCE_NUMBER_RE, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s\-–:]+$/, '');
  const withoutTrailingNumbers = collapsed.replace(/(?:\s+-?\d+)+$/, '');
  return /[A-Za-z]/.test(withoutTrailingNumbers) ? withoutTrailingNumbers : collapsed;
}

function directionFor(
  description: string,
  markers: (string | undefined)[],
  profile: IssuerProfile
): CardTransactionDirection {
  const marker = markers.find(Boolean)?.toUpperCase();
  if (marker) return CREDIT_SIGN_MARKERS.has(marker) ? 'credit' : 'debit';
  return profile.creditMarkers.test(description) ? 'credit' : 'debit';
}

const COMPACT_ROW_RE = new RegExp(
  `^\\s*(\\d{1,2})\\s*(${MONTH_SRC})[\\s|]+(.+?)[\\s|]+${CURRENCY_SRC}?\\s*([\\d,]+\\.\\d{2})\\s*(Cr|CR|Dr|DR)?[\\s|]*$`,
  'i'
);

function compactRowFromLine(
  line: string,
  profile: IssuerProfile,
  fallbackYear: number | null
): ParsedCardTransaction | null {
  if (fallbackYear === null) return null;
  const match = line.match(COMPACT_ROW_RE);
  if (!match) return null;
  const [, rawDay, rawMonth, rawDescription, rawAmount, trailingMarker] = match;
  const month = monthFromName(rawMonth);
  if (month === undefined) return null;
  const date = utcDate(fallbackYear, month, Number(rawDay));
  const description = cleanDescription(rawDescription);
  if (!date || (description.match(/[A-Za-z]/g) ?? []).length < 2) return null;
  if (SUMMARY_DESCRIPTION_RE.test(description)) return null;
  if (SUMMARY_ROW_LABELS.some((label) => label.test(description))) return null;
  const amount = Number(rawAmount.replace(/,/g, ''));
  if (!Number.isFinite(amount)) return null;
  const direction = directionFor(description, [trailingMarker], profile);
  return { date, description, amount, direction, ...classifyCardLine(description, direction) };
}

function rowFromLine(
  line: string,
  profile: IssuerProfile,
  fallbackYear: number | null
): ParsedCardTransaction | null {
  const match = line.match(TRANSACTION_ROW_RE);
  if (!match) return compactRowFromLine(line, profile, fallbackYear);
  const [, rawDate, rawDescription, leadingWord, leadingSign, rawAmount, trailingMarker] = match;
  const date = parseStatementDate(rawDate);
  const description = cleanDescription(rawDescription);
  if (!date || (description.match(/[A-Za-z]/g) ?? []).length < 2) return null;
  if (SUMMARY_DESCRIPTION_RE.test(description)) return null;
  if (SUMMARY_ROW_LABELS.some((label) => label.test(description))) return null;
  const amount = Number(rawAmount.replace(/,/g, ''));
  if (!Number.isFinite(amount)) return null;
  const direction = directionFor(description, [trailingMarker, leadingWord, leadingSign], profile);
  return { date, description, amount, direction, ...classifyCardLine(description, direction) };
}

function parseTransactions(
  lines: string[],
  profile: IssuerProfile,
  fallbackYear: number | null
): ParsedCardTransaction[] {
  const transactions: ParsedCardTransaction[] = [];
  let pendingRow: string | null = null;
  let continuationCount = 0;

  for (const line of lines) {
    if (LEADING_DATE_RE.test(line) || COMPACT_DATE_RE.test(line)) {
      const row = rowFromLine(line, profile, fallbackYear);
      if (row) {
        transactions.push(row);
        pendingRow = null;
      } else {
        pendingRow = line;
        continuationCount = 0;
      }
      continue;
    }
    if (pendingRow === null) continue;
    const joined: string = `${pendingRow} ${line}`;
    const row = rowFromLine(joined, profile, fallbackYear);
    if (row) {
      transactions.push(row);
      pendingRow = null;
      continue;
    }
    continuationCount += 1;
    pendingRow = continuationCount < MAX_CONTINUATION_LINES ? joined : null;
  }

  return transactions;
}

function merchantCategory(upperDescription: string): string {
  return (
    MERCHANT_CATEGORIES.find(({ pattern }) => pattern.test(upperDescription))?.category ??
    OTHERS_CATEGORY
  );
}

function extractInstallment(upperDescription: string): EmiInstallment | undefined {
  const match =
    upperDescription.match(INSTALLMENT_LABEL_RE) ?? upperDescription.match(INSTALLMENT_FRACTION_RE);
  if (!match) return undefined;
  const number = Number(match[1]);
  const of = Number(match[2]);
  return number >= 1 && of >= 1 && number <= of ? { number, of } : undefined;
}

function classifyKind(upper: string, direction: CardTransactionDirection): CardTransactionKind {
  if (direction === 'credit') {
    if (PAYMENT_RE.test(upper)) return 'payment';
    if (REFUND_RE.test(upper)) return 'refund';
    if (CASHBACK_RE.test(upper)) return 'cashback';
    return 'other';
  }
  if (TAX_RE.test(upper)) return 'tax';
  if (EMI_INTEREST_RE.test(upper)) return 'emi_interest';
  if (EMI_PRINCIPAL_RE.test(upper) && !FEE_RE.test(upper)) return 'emi_principal';
  if (INTEREST_RE.test(upper)) return 'interest';
  if (FEE_RE.test(upper)) return 'fee';
  return 'purchase';
}

const EMI_KINDS: CardTransactionKind[] = ['emi_principal', 'emi_interest'];
const MERCHANT_CATEGORISED_KINDS: CardTransactionKind[] = ['purchase', 'emi_principal'];

export function classifyCardLine(
  description: string,
  direction: CardTransactionDirection
): CardLineClassification {
  const upper = description.toUpperCase();
  const kind = classifyKind(upper, direction);
  const category = MERCHANT_CATEGORISED_KINDS.includes(kind)
    ? merchantCategory(upper)
    : OTHERS_CATEGORY;
  const emiInstallment = EMI_KINDS.includes(kind) ? extractInstallment(upper) : undefined;
  return emiInstallment ? { kind, category, emiInstallment } : { kind, category };
}

const roundToPaise = (value: number) => Math.round(value * 100) / 100;

function sumByDirection(transactions: ParsedCardTransaction[], direction: string): number {
  return roundToPaise(
    transactions
      .filter((transaction) => transaction.direction === direction)
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  );
}

function reconcile(
  summary: ParsedCardStatementSummary,
  transactions: ParsedCardTransaction[]
): boolean {
  if (summary.totalDue === null || transactions.length === 0) return false;
  const debits = sumByDirection(transactions, 'debit');
  const credits = sumByDirection(transactions, 'credit');
  const openingBalance = summary.previousBalance ?? 0;
  const expectedDue = roundToPaise(openingBalance + debits - credits);
  return Math.abs(expectedDue - summary.totalDue) <= RECONCILIATION_TOLERANCE;
}

export function parseCreditCardStatement(
  text: string,
  issuer: CreditCardIssuer
): ParsedCardStatement {
  const profile = ISSUER_PROFILES[issuer] ?? ISSUER_PROFILES.other;
  const lines = splitLines(text);
  const { summary, balancesFromBox } = parseSummary(text, lines);
  const fallbackYear =
    summary.periodEnd?.getUTCFullYear() ?? summary.statementDate?.getUTCFullYear() ?? null;
  const transactions = parseTransactions(
    selectTransactionLines(lines, profile),
    profile,
    fallbackYear
  );
  const warnings: string[] = [];

  if (transactions.length === 0) warnings.push('No transactions could be read from the statement');
  if (summary.totalDue === null) warnings.push('Total amount due was not found on the statement');
  const reconciled = balancesFromBox || reconcile(summary, transactions);

  return { summary, transactions, warnings, reconciled };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function statementMentionsCard(text: string, lastDigits: string): boolean {
  const digits = lastDigits.replace(/\D/g, '');
  const last4 = escapeRegExp(digits.slice(-4));
  if (!last4) return false;
  const maskedRun = new RegExp(
    `(?:${MASK_CHARACTER_SRC}[\\s-]*){2,}(?:\\d{0,2}[\\s-]*)?${last4}(?!\\d)`
  );
  const endingWith = new RegExp(`ending\\s*(?:with|in)?\\s*:?\\s*${last4}(?!\\d)`, 'i');
  return maskedRun.test(text) || endingWith.test(text);
}
