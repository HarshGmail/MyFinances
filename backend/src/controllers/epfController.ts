import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { epfSchema } from '../schemas/epf';
import { getUserFromRequest } from '../utils/jwtHelpers';

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
    console.error('Add EPF account error:', error);
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

    const db = database.getDb();
    const collection = db.collection('epfAccounts');
    const epfAccounts = await collection.find({ userId: new ObjectId(user.userId) }).toArray();

    res.status(200).json({ success: true, data: epfAccounts });
  } catch (error) {
    console.error('Fetch EPF accounts error:', error);
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
      // Only show interest for completed financial years or current year if past March 31
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
    console.error('Calculate EPF timeline error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
