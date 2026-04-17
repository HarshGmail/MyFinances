import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { epfSchema } from '../schemas/epf';
import { getUserFromRequest } from '../utils/jwtHelpers';
import logger from '../utils/logger';
import { extractTextFromPdf } from '../services/pdfParser';
import { parseEpfPassbook, groupIntoSegments, EpfSegment } from '../services/epfPassbookParser';
import {
  isPdfServiceAvailable,
  submitPdfJob,
  waitForPdfJob,
  warmupPdfService,
} from '../services/pdfParsingClient';

export async function addEpfAccount(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const parsed = epfSchema
      .omit({ userId: true, _id: true, createdAt: true, updatedAt: true })
      .parse(req.body);

    const newEpfAccount = {
      ...parsed,
      userId: new ObjectId(user.userId),
      startDate: new Date(parsed.startDate),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = database.getDb();
    const collection = db.collection('epfAccounts');
    const result = await collection.insertOne(newEpfAccount);

    res.status(201).json({ success: true, message: 'EPF account created', id: result.insertedId });
  } catch (error) {
    logger.error({ err: error }, 'Add EPF account error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getEpfAccounts(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    warmupPdfService();

    const db = database.getDb();
    const collection = db.collection('epfAccounts');
    const epfAccounts = await collection.find({ userId: new ObjectId(user.userId) }).toArray();

    res.status(200).json({ success: true, data: epfAccounts });
  } catch (error) {
    logger.error({ err: error }, 'Fetch EPF accounts error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

interface MonthlyContribution {
  date: Date;
  amount: number;
  organization: string;
}

interface TimelineRow {
  type: 'contribution' | 'interest';
  organization?: string;
  monthlyContribution?: number;
  startDate?: string;
  endDate?: string;
  totalContribution: number;
  financialYear?: string;
  interestCreditDate?: string;
}

interface TimelineSummary {
  totalCurrentBalance: number;
  totalContributions: number;
  totalInterest: number;
  timeline: TimelineRow[];
}

export async function getEpfTimeline(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const db = database.getDb();
    const collection = db.collection('epfAccounts');
    const epfAccounts = await collection.find({ userId: new ObjectId(user.userId) }).toArray();

    if (!epfAccounts || epfAccounts.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          totalCurrentBalance: 0,
          totalContributions: 0,
          totalInterest: 0,
          timeline: [],
        },
      });
      return;
    }

    // Sort accounts by start date
    const sortedData = [...epfAccounts].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    // Generate monthly contributions with proper date handling
    const monthlyContributions: MonthlyContribution[] = [];
    const timeline: TimelineRow[] = [];
    let totalContributions = 0;

    for (let i = 0; i < sortedData.length; i++) {
      const epf = sortedData[i];
      const startDate = new Date(epf.startDate);

      // Calculate end date for this job
      const endDate =
        i < sortedData.length - 1 ? new Date(sortedData[i + 1].startDate) : new Date(); // Current date if it's the last job

      // Generate monthly contributions for this period
      let contributionMonths = 0;
      const currentDate = new Date(startDate);

      while (currentDate < endDate) {
        monthlyContributions.push({
          date: new Date(currentDate),
          amount: epf.epfAmount,
          organization: epf.organizationName,
        });
        contributionMonths++;

        // Move to next month on same date
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      const totalContribution = epf.epfAmount * contributionMonths;
      totalContributions += totalContribution;

      // Add contribution row to timeline
      timeline.push({
        type: 'contribution',
        organization: epf.organizationName,
        monthlyContribution: epf.epfAmount,
        startDate: startDate.toLocaleDateString('en-IN'),
        endDate:
          i < sortedData.length - 1
            ? new Date(sortedData[i + 1].startDate).toLocaleDateString('en-IN')
            : 'Present',
        totalContribution: totalContribution,
      });
    }

    // Calculate interest for each financial year
    const annualRate = 8.25 / 100; // 8.25% annual interest rate
    const monthlyRate = annualRate / 12;

    // Sort monthly contributions by date
    monthlyContributions.sort((a, b) => a.date.getTime() - b.date.getTime());

    const yearlyInterest = new Map<number, number>();
    let runningBalance = 0;
    let totalInterest = 0;

    // Process each contribution month
    for (let i = 0; i < monthlyContributions.length; i++) {
      const contribution = monthlyContributions[i];
      const contributionDate = contribution.date;

      // Financial year (April to March)
      const financialYear =
        contributionDate.getMonth() >= 3
          ? contributionDate.getFullYear()
          : contributionDate.getFullYear() - 1;

      // Calculate interest on closing balance of previous month
      if (i > 0) {
        const monthlyInterest = runningBalance * monthlyRate;
        const currentYearInterest = yearlyInterest.get(financialYear) || 0;
        yearlyInterest.set(financialYear, currentYearInterest + monthlyInterest);
      }

      // Add current month's contribution
      runningBalance += contribution.amount;
    }

    // Add interest rows for completed financial years
    const currentDate = new Date();

    for (const [year, interest] of yearlyInterest.entries()) {
      // Include interest for any FY whose March 31 end date has passed
      const interestCreditDate = new Date(year + 1, 2, 31); // March 31 of next year

      if (interestCreditDate <= currentDate) {
        const roundedInterest = Math.round(interest);
        totalInterest += roundedInterest;

        timeline.push({
          type: 'interest',
          financialYear: `FY ${year}-${year + 1}`,
          interestCreditDate: interestCreditDate.toLocaleDateString('en-IN'),
          totalContribution: roundedInterest,
        });
      }
    }

    const totalCurrentBalance = totalContributions + totalInterest;

    const summary: TimelineSummary = {
      totalCurrentBalance,
      totalContributions,
      totalInterest,
      timeline,
    };

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    logger.error({ err: error }, 'Calculate EPF timeline error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

interface PassbookFile {
  data: string; // base64
  name: string;
}

export async function parseEpfPassbooks(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user?.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const files = req.body?.files as PassbookFile[] | undefined;
    if (!files?.length) {
      res.status(400).json({ success: false, message: 'No files provided' });
      return;
    }

    const db = database.getDb();
    const collection = db.collection('epfAccounts');
    const existingAccounts = await collection.find({ userId: new ObjectId(user.userId) }).toArray();

    let segments: EpfSegment[] = [];
    let establishmentName = '';
    let uan = '';

    let usedRustService = false;

    if (isPdfServiceAvailable()) {
      try {
        // ── Rust service path ────────────────────────────────────────────────
        const buffers = files.map((f) => Buffer.from(f.data, 'base64'));
        const jobId = await submitPdfJob('epf_passbook', buffers, []);
        const result = await waitForPdfJob(jobId);

        const txns = (result?.transactions ?? []) as Array<{
          wage_month: string;
          employee_share: number;
          employer_share: number;
          credit_day: number;
          establishment_name: string;
          uan: string;
        }>;

        if (txns.length) {
          establishmentName = txns[0].establishment_name ?? '';
          uan = txns[0].uan ?? '';

          const MONTH_MAP: Record<string, number> = {
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
          const entryMap = new Map<
            string,
            { date: Date; employeeContribution: number; creditDay: number }
          >();
          for (const t of txns) {
            if (!entryMap.has(t.wage_month)) {
              const [mon, yr] = t.wage_month.split('-');
              entryMap.set(t.wage_month, {
                date: new Date(parseInt(yr), MONTH_MAP[mon] ?? 0, 1),
                employeeContribution: t.employee_share + (t.employer_share ?? 0),
                creditDay: t.credit_day,
              });
            }
          }

          segments = groupIntoSegments(
            Array.from(entryMap.entries()).map(([wageMonth, v]) => ({ wageMonth, ...v })),
            establishmentName
          );
          usedRustService = true;
        }
      } catch (rustErr) {
        logger.warn({ err: rustErr }, 'Rust PDF service failed, falling back to TS parser');
      }
    }

    if (!usedRustService) {
      // ── TypeScript fallback ───────────────────────────────────────────────
      const entryMap = new Map<
        string,
        { date: Date; employeeContribution: number; creditDay: number }
      >();
      for (const file of files) {
        const buffer = Buffer.from(file.data, 'base64');
        const text = await extractTextFromPdf(buffer, []);
        const parsed = parseEpfPassbook(text);
        if (parsed.establishmentName) establishmentName = parsed.establishmentName;
        if (parsed.uan) uan = parsed.uan;
        for (const entry of parsed.entries) {
          if (!entryMap.has(entry.wageMonth)) {
            entryMap.set(entry.wageMonth, {
              date: entry.date,
              employeeContribution: entry.employeeContribution,
              creditDay: entry.creditDay,
            });
          }
        }
      }
      segments = groupIntoSegments(
        Array.from(entryMap.entries()).map(([wageMonth, v]) => ({ wageMonth, ...v })),
        establishmentName
      );
    }

    if (!establishmentName) {
      res
        .status(400)
        .json({ success: false, message: 'Could not extract establishment name from passbook' });
      return;
    }
    const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

    const result = segments.map((seg) => {
      const alreadyExists = existingAccounts.some((acc) => {
        const nameNorm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const nameMatch =
          nameNorm(acc.organizationName).includes(nameNorm(seg.organizationName).slice(0, 8)) ||
          nameNorm(seg.organizationName).includes(nameNorm(acc.organizationName).slice(0, 8));
        const dateDiff = Math.abs(new Date(acc.startDate).getTime() - seg.startDate.getTime());
        return nameMatch && dateDiff < FIFTEEN_DAYS_MS && acc.epfAmount === seg.epfAmount;
      });

      return {
        organizationName: seg.organizationName,
        epfAmount: seg.epfAmount,
        creditDay: seg.creditDay,
        startDate: seg.startDate.toISOString(),
        alreadyExists,
      };
    });

    res.status(200).json({ success: true, data: { segments: result, uan, establishmentName } });
  } catch (error) {
    logger.error({ err: error }, 'Parse EPF passbooks error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

interface BulkEpfPayload {
  organizationName: string;
  epfAmount: number;
  creditDay: number;
  startDate: string;
}

export async function bulkUpdateEpfAccounts(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user?.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const accounts = req.body?.accounts as BulkEpfPayload[] | undefined;
    if (!accounts?.length) {
      res.status(400).json({ success: false, message: 'No accounts provided' });
      return;
    }

    const db = database.getDb();
    const collection = db.collection('epfAccounts');
    const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

    const ops = accounts.map((acc) => {
      const startDate = new Date(acc.startDate);
      return collection.updateOne(
        {
          userId: new ObjectId(user.userId),
          organizationName: acc.organizationName,
          startDate: {
            $gte: new Date(startDate.getTime() - FIFTEEN_DAYS_MS),
            $lte: new Date(startDate.getTime() + FIFTEEN_DAYS_MS),
          },
          epfAmount: acc.epfAmount,
        },
        {
          $setOnInsert: {
            userId: new ObjectId(user.userId),
            organizationName: acc.organizationName,
            epfAmount: acc.epfAmount,
            creditDay: acc.creditDay,
            startDate,
            createdAt: new Date(),
          },
          $set: { updatedAt: new Date() },
        },
        { upsert: true }
      );
    });

    await Promise.all(ops);
    res.status(200).json({ success: true, message: `${accounts.length} records updated` });
  } catch (error) {
    logger.error({ err: error }, 'Bulk update EPF accounts error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteAllUserEpfAccounts(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const result = await db
      .collection('epfAccounts')
      .deleteMany({ userId: new ObjectId(user.userId) });
    res.status(200).json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    logger.error({ err: error }, 'Delete all EPF accounts error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
