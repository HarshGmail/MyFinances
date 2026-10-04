import { describe, expect, it } from 'vitest';
import {
  classifyCardLine,
  parseCreditCardStatement,
  parseStatementDate,
  statementMentionsCard,
} from '../creditCardStatementParser';

const utc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day));

const YES_STATEMENT = `
YES BANK
Credit Card Statement
Card Number: 5241 XXXX XXXX 7788
Statement Period 21/08/2026 To 20/09/2026
Statement Date 20/09/2026
Payment Due Date 10/10/2026
Total Amount Due Rs.720.64
Minimum Amount Due Rs.200.00
Credit Limit Rs.1,50,000.00
Available Credit Limit Rs.1,49,279.36
Previous Balance Rs.1,250.00
Transaction Details
Date Transaction Details Merchant Category Amount (Rs.)
22/08/2026 PAYMENT RECEIVED - THANK YOU 1,250.00 Cr
25/08/2026 SWIGGY BANGALORE IN Restaurants 450.00 Dr
02/09/2026 NETFLIX.COM MUMBAI IN Entertainment 199.00 Dr
05/09/2026 AMAZON PAY INDIA PRIVATE BENGALURU 1,000.00 Dr
08/09/2026 REFUND AMAZON PAY INDIA PRIVATE 1,000.00 Cr
12/09/2026 FUEL SURCHARGE WAIVER 10.00 Cr
12/09/2026 HPCL PETROL PUMP KORAMANGALA 81.64 Dr
End of the Statement
`;

const SBI_STATEMENT = `
SBI Card
Credit Card Number XXXX XXXX XXXX 4321
Statement Date 15 Sep 2026
Payment Due Date 05 Oct 2026
Credit Limit Available Credit Limit Available Cash Limit
2,00,000.00 1,77,710.04 40,000.00
Previous Balance Payments/Credits Purchases/Debits Fee, Taxes & Interest Total Outstanding
5,000.00 5,000.00 21,940.00 349.96 22,289.96
Total Amount Due ₹22,289.96
Minimum Amount Due ₹1,120.00
TRANSACTIONS FOR HARSH KUMAR
Date Transaction Details Amount
16 Aug 26 PAYMENT RECEIVED BBPS 5,000.00 C
18 Aug 26 UBER INDIA SYSTEMS PVT LTD 340.00 D
21 Aug 26 SMART EMI PRINCIPAL 03/12 FLIPKART 1,600.00 D
21 Aug 26 SMART EMI INTEREST 03/12 FLIPKART 180.00 D
21 Aug 26 IGST ON EMI INTEREST 32.40 D
02 Sep 26 MAKEMYTRIP INDIA PVT LTD 20,000.00 D
10 Sep 26 LATE PAYMENT FEE 117.46 D
10 Sep 26 IGST @18% ON LATE PAYMENT FEE 20.10 D
Reward Points Summary
Opening 1200 Earned 300
`;

const HDFC_STATEMENT = `
HDFC Bank Credit Cards GSTIN: 33AAACH2702H2Z6
Card No: 4893 77XX XXXX 9012
Statement Date:12/09/2026
Billing Period: 13 Aug 2026 - 12 Sep 2026
Payment Due Date Total Dues Minimum Amount Due
02/10/2026 9,876.50 500.00
Credit Limit Available Credit Limit Available Cash Limit
3,00,000 2,90,123 1,20,000
Opening Balance Payment/Credits Purchase/Debits Finance Charges
4,500.00 4,500.00 9,876.50 0.00
Domestic Transactions
Date Transaction Description Reward Points Amount (in Rs.)
14/08/2026 13:22:10 ZOMATO LTD GURGAON 12 640.00
15/08/2026 NEFT PAYMENT RECEIVED THANK YOU 4,500.00 Cr
20/08/2026 BIGBASKET INNOVATIVE RETAIL BANGALORE 25 2,310.50
03/09/2026 APOLLO PHARMACY CHENNAI 6 426.00
International Transactions
Date Transaction Description Reward Points Amount (in Rs.)
05/09/2026 AIRBNB * HMXYZ123 SAN FRANCISCO 70 6,500.00
Reward Points Summary
`;

const ICICI_STATEMENT = `
ICICI Bank Credit Card Statement
Card Number 4375 XXXX XXXX 5566
STATEMENT DATE
September 18, 2026
PAYMENT DUE DATE
October 6, 2026
Statement period : Aug 19, 2026 to Sep 18, 2026
Total Amount due
\`3,349.99
Minimum Amount due
\`170.00
Previous Balance Purchases / Charges Cash Advances Payments / Credits
2,000.00 3,349.99 0.00 2,000.00
Credit Limit (Including cash) Available Credit (Including cash)
\`75,000.00 \`71,650.01
Transaction Details
Date SerNo. Transaction Details Reward Points Intl.# amount Amount (in\`)
20/08/2026 9876543210 BBPS Payment received 0 2,000.00 CR
22/08/2026 9876543211 AIRTEL PAYMENTS BANK MUMBAI IN 5 599.00
25/08/2026 9876543212 BOOKMYSHOW MUMBAI IN 10 850.99
01/09/2026 9876543213 ANNUAL FEE 1,500.00
01/09/2026 9876543214 CGST @ 9% 135.00
01/09/2026 9876543215 SGST @ 9% 135.00
05/09/2026 9876543216 CASHBACK ON BOOKMYSHOW 50.00 CR
08/09/2026 9876543217 URBAN COMPANY GURGAON 180.00
Earnings Summary
`;

const AXIS_STATEMENT = `
Axis Bank LIC Signature Credit Card
Card No. 5xxxxxxxxxxx2468
Statement Period 05/08/2026 - 04/09/2026
Payment Due Date 24/09/2026
Statement Generation Date 04/09/2026
Total Payment Due Minimum Payment Due
Total Amount Due 15,540.00 Dr
Minimum Amount Due 780.00 Dr
Previous Balance 0.00
Account Summary & Transaction Details
DATE TRANSACTION DETAILS MERCHANT CATEGORY AMOUNT (Rs.) CASHBACK EARNED
06/08/2026 LIC OF INDIA PREMIUM MUMBAI INSURANCE 12,000.00 Dr
10/08/2026 RELIANCE SMART BAZAAR PUNE RETAIL 2,540.00 Dr
15/08/2026 COURSERA ONLINE EDUCATION 1,000.00 Dr
End of Statement
`;

const HSBC_STATEMENT = `
HSBC Visa Platinum Credit Card
Card number 4214 **** **** 3579
Statement From 21 JUL 2026 to 20 AUG 2026
Statement Date 20 AUG 2026
Payment Due Date 06 SEP 2026
Opening Balance Rs. 3,000.00
Total Amount Due Rs. 4,107.80
Minimum Amount Due Rs. 205.39
Your Transaction Details
Date Transaction details Amount
22JUL CONSOLIDATED PAYMENT
22 JUL 26 PAYMENT - THANK YOU 3,000.00 CR
25 JUL 26 STARBUCKS COFFEE BANGALORE 380.00
28 JUL 26 INDIGO AIRLINES GURGAON 3,500.00
02 AUG 26 FINANCE CHARGES 150.00
02 AUG 26 GST 27.00
05 AUG 26 PVR CINEMAS
FORUM MALL BANGALORE 50.80
Net outstanding balance 4,107.80
`;

describe('parseStatementDate', () => {
  it('reads every supported layout', () => {
    expect(parseStatementDate('21/08/2026')).toEqual(utc(2026, 8, 21));
    expect(parseStatementDate('21-08-26')).toEqual(utc(2026, 8, 21));
    expect(parseStatementDate('21 Aug 2026')).toEqual(utc(2026, 8, 21));
    expect(parseStatementDate('21-AUG-26')).toEqual(utc(2026, 8, 21));
    expect(parseStatementDate('Aug 21, 2026')).toEqual(utc(2026, 8, 21));
    expect(parseStatementDate('September 18, 2026')).toEqual(utc(2026, 9, 18));
    expect(parseStatementDate('31/02/2026')).toBeNull();
  });
});

describe('YES Bank statement', () => {
  const parsed = parseCreditCardStatement(YES_STATEMENT, 'yes');

  it('reads the summary from the emailed example', () => {
    expect(parsed.summary).toMatchObject({
      periodStart: utc(2026, 8, 21),
      periodEnd: utc(2026, 9, 20),
      statementDate: utc(2026, 9, 20),
      dueDate: utc(2026, 10, 10),
      totalDue: 720.64,
      minimumDue: 200,
      previousBalance: 1250,
      creditLimit: 150000,
      availableLimit: 149279.36,
    });
  });

  it('classifies payments, refunds, waivers and purchases', () => {
    expect(parsed.transactions.map((row) => [row.kind, row.direction, row.category])).toEqual([
      ['payment', 'credit', 'Others'],
      ['purchase', 'debit', 'Food & Dining'],
      ['purchase', 'debit', 'Entertainment'],
      ['purchase', 'debit', 'Shopping'],
      ['refund', 'credit', 'Others'],
      ['refund', 'credit', 'Others'],
      ['purchase', 'debit', 'Transportation'],
    ]);
    expect(parsed.transactions[0]).toMatchObject({
      date: utc(2026, 8, 22),
      description: 'PAYMENT RECEIVED - THANK YOU',
      amount: 1250,
    });
  });

  it('reconciles against previous balance', () => {
    expect(parsed.reconciled).toBe(true);
    expect(parsed.warnings).toEqual([]);
  });
});

describe('SBI Card statement', () => {
  const parsed = parseCreditCardStatement(SBI_STATEMENT, 'sbi');

  it('reads columnar summary values', () => {
    expect(parsed.summary).toMatchObject({
      periodStart: null,
      periodEnd: utc(2026, 9, 15),
      statementDate: utc(2026, 9, 15),
      dueDate: utc(2026, 10, 5),
      totalDue: 22289.96,
      minimumDue: 1120,
      previousBalance: 5000,
      creditLimit: 200000,
      availableLimit: 177710.04,
    });
  });

  it('splits EMI principal, EMI interest, GST and fees', () => {
    expect(
      parsed.transactions.map((row) => [row.kind, row.category, row.emiInstallment ?? null])
    ).toEqual([
      ['payment', 'Others', null],
      ['purchase', 'Transportation', null],
      ['emi_principal', 'Shopping', { number: 3, of: 12 }],
      ['emi_interest', 'Others', { number: 3, of: 12 }],
      ['tax', 'Others', null],
      ['purchase', 'Travel', null],
      ['fee', 'Others', null],
      ['tax', 'Others', null],
    ]);
  });

  it('stops at the reward points summary and reconciles', () => {
    expect(parsed.transactions).toHaveLength(8);
    expect(parsed.reconciled).toBe(true);
  });
});

describe('HDFC statement', () => {
  const parsed = parseCreditCardStatement(HDFC_STATEMENT, 'hdfc');

  it('reads the billing period and columnar dues', () => {
    expect(parsed.summary).toMatchObject({
      periodStart: utc(2026, 8, 13),
      periodEnd: utc(2026, 9, 12),
      statementDate: utc(2026, 9, 12),
      dueDate: utc(2026, 10, 2),
      totalDue: 9876.5,
      minimumDue: 500,
      previousBalance: 4500,
      creditLimit: 300000,
      availableLimit: 290123,
    });
  });

  it('parses domestic and international rows, dropping reward points and times', () => {
    expect(parsed.transactions.map((row) => [row.description, row.amount, row.kind])).toEqual([
      ['ZOMATO LTD GURGAON', 640, 'purchase'],
      ['NEFT PAYMENT RECEIVED THANK YOU', 4500, 'payment'],
      ['BIGBASKET INNOVATIVE RETAIL BANGALORE', 2310.5, 'purchase'],
      ['APOLLO PHARMACY CHENNAI', 426, 'purchase'],
      ['AIRBNB * HMXYZ123 SAN FRANCISCO', 6500, 'purchase'],
    ]);
    expect(parsed.transactions.map((row) => row.category)).toEqual([
      'Food & Dining',
      'Others',
      'Shopping',
      'Healthcare',
      'Travel',
    ]);
    expect(parsed.reconciled).toBe(true);
  });
});

describe('ICICI statement', () => {
  const parsed = parseCreditCardStatement(ICICI_STATEMENT, 'icici');

  it('reads month-first dates and rupee glyph amounts on following lines', () => {
    expect(parsed.summary).toMatchObject({
      periodStart: utc(2026, 8, 19),
      periodEnd: utc(2026, 9, 18),
      statementDate: utc(2026, 9, 18),
      dueDate: utc(2026, 10, 6),
      previousBalance: 2000,
      creditLimit: 75000,
    });
  });

  it('classifies fees, GST and cashback and strips serial numbers', () => {
    expect(parsed.transactions.map((row) => [row.description, row.kind, row.category])).toEqual([
      ['BBPS Payment received', 'payment', 'Others'],
      ['AIRTEL PAYMENTS BANK MUMBAI IN', 'purchase', 'Bills & Utilities'],
      ['BOOKMYSHOW MUMBAI IN', 'purchase', 'Entertainment'],
      ['ANNUAL FEE', 'fee', 'Others'],
      ['CGST @ 9%', 'tax', 'Others'],
      ['SGST @ 9%', 'tax', 'Others'],
      ['CASHBACK ON BOOKMYSHOW', 'cashback', 'Others'],
      ['URBAN COMPANY GURGAON', 'purchase', 'Personal Care'],
    ]);
  });
});

describe('ICICI statement with labels above values', () => {
  const parsed = parseCreditCardStatement(ICICI_STATEMENT, 'icici');

  it('reads total and minimum due written on the next line', () => {
    expect(parsed.summary.totalDue).toBe(3349.99);
    expect(parsed.summary.minimumDue).toBe(170);
    expect(parsed.reconciled).toBe(true);
  });
});

describe('Axis statement', () => {
  const parsed = parseCreditCardStatement(AXIS_STATEMENT, 'axis');

  it('reads Dr suffixed summary amounts', () => {
    expect(parsed.summary).toMatchObject({
      periodStart: utc(2026, 8, 5),
      periodEnd: utc(2026, 9, 4),
      statementDate: utc(2026, 9, 4),
      dueDate: utc(2026, 9, 24),
      totalDue: 15540,
      minimumDue: 780,
      previousBalance: 0,
    });
  });

  it('categorises insurance, shopping and education spends', () => {
    expect(parsed.transactions.map((row) => row.category)).toEqual([
      'Insurance',
      'Shopping',
      'Education',
    ]);
    expect(parsed.reconciled).toBe(true);
  });
});

describe('HSBC statement', () => {
  const parsed = parseCreditCardStatement(HSBC_STATEMENT, 'hsbc');

  it('reads the summary', () => {
    expect(parsed.summary).toMatchObject({
      periodStart: utc(2026, 7, 21),
      periodEnd: utc(2026, 8, 20),
      dueDate: utc(2026, 9, 6),
      totalDue: 4107.8,
      minimumDue: 205.39,
      previousBalance: 3000,
    });
  });

  it('joins continuation lines and classifies finance charges', () => {
    expect(parsed.transactions.map((row) => [row.description, row.kind])).toEqual([
      ['PAYMENT - THANK YOU', 'payment'],
      ['STARBUCKS COFFEE BANGALORE', 'purchase'],
      ['INDIGO AIRLINES GURGAON', 'purchase'],
      ['FINANCE CHARGES', 'interest'],
      ['GST', 'tax'],
      ['PVR CINEMAS FORUM MALL BANGALORE', 'purchase'],
    ]);
    expect(parsed.transactions[5].category).toBe('Entertainment');
    expect(parsed.reconciled).toBe(true);
  });
});

describe('reconciliation warnings', () => {
  it('flags a statement whose totals do not add up', () => {
    const parsed = parseCreditCardStatement(
      'Total Amount Due Rs.999.00\n01/09/2026 SWIGGY ORDER 100.00',
      'other'
    );
    expect(parsed.reconciled).toBe(false);
    expect(parsed.warnings[0]).toMatch(/does not reconcile/);
  });

  it('warns when nothing could be read', () => {
    const parsed = parseCreditCardStatement('Nothing useful here', 'other');
    expect(parsed.reconciled).toBe(false);
    expect(parsed.warnings).toEqual([
      'No transactions could be read from the statement',
      'Total amount due was not found on the statement',
    ]);
  });
});

describe('classifyCardLine', () => {
  it('prefers EMI interest over EMI principal and plain interest', () => {
    expect(classifyCardLine('EMI INTEREST 4 OF 6 CROMA', 'debit')).toEqual({
      kind: 'emi_interest',
      category: 'Others',
      emiInstallment: { number: 4, of: 6 },
    });
    expect(classifyCardLine('EMI INST NO 2/6 AMAZON', 'debit')).toEqual({
      kind: 'emi_principal',
      category: 'Shopping',
      emiInstallment: { number: 2, of: 6 },
    });
    expect(classifyCardLine('INTEREST ON RETAIL BALANCE', 'debit').kind).toBe('interest');
  });

  it('treats GST on a fee as tax, not fee', () => {
    expect(classifyCardLine('GST ON ANNUAL FEE', 'debit').kind).toBe('tax');
  });

  it('ignores installment-like fractions that are out of range', () => {
    expect(classifyCardLine('EMI PRINCIPAL 13/12', 'debit').emiInstallment).toBeUndefined();
  });

  it('does not attach installments to non-EMI rows', () => {
    expect(classifyCardLine('AMAZON 03/12 ORDER', 'debit')).toEqual({
      kind: 'purchase',
      category: 'Shopping',
    });
  });
});

describe('statementMentionsCard', () => {
  it('matches masked numbers ending in the card digits', () => {
    expect(statementMentionsCard(YES_STATEMENT, '7788')).toBe(true);
    expect(statementMentionsCard(AXIS_STATEMENT, '2468')).toBe(true);
    expect(statementMentionsCard(HSBC_STATEMENT, '123579')).toBe(true);
    expect(statementMentionsCard(HDFC_STATEMENT, '9012')).toBe(true);
    expect(statementMentionsCard('Your card ending 4321 statement', '4321')).toBe(true);
  });

  it('rejects a statement for a different card', () => {
    expect(statementMentionsCard(YES_STATEMENT, '1234')).toBe(false);
    expect(statementMentionsCard('Total Amount Due 7788.00', '7788')).toBe(false);
  });
});

const AXIS_EQUATION_STATEMENT = `
PAYMENT SUMMARY
Total Payment Due Minimum Payment Due Statement Period Payment Due Date Statement Generation Date
24/08/2026 - 22/09/2026 12/10/2026 22/09/2026 6,231.84 Dr 1,953.65 Dr
Previous Balance - Payments - Credits + Purchase + Cash Advance + Other Debit & Charges = Total Payment Due
11,996.42 Dr 11,996.42 118.00 6,069.00 0.00 280.84 6,231.84 Dr
Account Summary
DATE TRANSACTION DETAILS MERCHANT CATEGORY AMOUNT (Rs.)
01/09/2026 BBPS PAYMENT RECEIVED 11,996.42 Cr
02/09/2026 EMI INTEREST - 3/3 MISC STORE 66.00 Dr
02/09/2026 GST 11.88 Dr
02/09/2026 EMI PRINCIPAL - 3/3 MISC STORE 4,970.00 Dr
**** End of Statement ****
Minimum Amount Due Calculation
Total Amount Due 8813.65
Minimum Amount Due 1953.65
`;

const ICICI_BOX_STATEMENT = `
STATEMENT SUMMARY
Total Amount due
Minimum Amount due
13/08/2026 13974205550 ZOMATO GURGAON IN 1 170.20
31/08/2026 14077398325 BBPS Payment received 0 3,295.11 CR
06/09/2026 14123228358 SWIGGY NEWDELHI IN 0 300.00
Statement period : August 13, 2026 to September 12, 2026
Previous Balance Purchases / Charges Cash Advances Payments / Credits
3,295.11 470.20 0.00 3,295.11
In the table given below
Total Amount Due on statement dated Oct 08, 2023 2,000.00
`;

const HSBC_COMPACT_STATEMENT = `
MR CARDHOLDER NAME
10 OCT 2026 100.00
23 AUG 2026 To 22 SEP 2026 2,011.60
OPENING BALANCE 0.00
PURCHASES & INSTALLMENTS
48xx xxxx xxxx 3420 CARDHOLDER NAME
09SEP IAP IIL*Indian Railways Se NewDelhi 1,167.40
09SEP IAP IIL*Indian Railways Se NewDelhi 844.20
TOTAL PURCHASE OUTSTANDING 2,011.60
22SEP NET OUTSTANDING BALANCE 2,011.60
TARIFF SHEET
`;

describe('real-layout summary derivations', () => {
  it('Axis: reads the total from the equation row, not the reflowed box or the MAD illustration', () => {
    const parsed = parseCreditCardStatement(AXIS_EQUATION_STATEMENT, 'axis');
    expect(parsed.summary.totalDue).toBe(6231.84);
    expect(parsed.summary.previousBalance).toBe(11996.42);
    expect(parsed.transactions.map((transaction) => transaction.kind)).toEqual([
      'payment',
      'emi_interest',
      'tax',
      'emi_principal',
    ]);
  });

  it('ICICI: derives the total from the four-column balance box', () => {
    const parsed = parseCreditCardStatement(ICICI_BOX_STATEMENT, 'icici');
    expect(parsed.summary.previousBalance).toBe(3295.11);
    expect(parsed.summary.totalDue).toBe(470.2);
    expect(parsed.reconciled).toBe(true);
  });

  it('HSBC: reads compact day-month rows with the year taken from the period', () => {
    const parsed = parseCreditCardStatement(HSBC_COMPACT_STATEMENT, 'hsbc');
    expect(parsed.summary.totalDue).toBe(2011.6);
    expect(parsed.transactions).toHaveLength(2);
    expect(parsed.transactions[0].date).toEqual(utc(2026, 9, 9));
    expect(parsed.transactions[0].amount).toBe(1167.4);
    expect(parsed.reconciled).toBe(true);
  });
});
