import type { Request, Response } from 'express';
import inflationService from '../services/inflationService';

export async function getIndiaInflation(req: Request, res: Response) {
  try {
    const raw = (req.query.numOfYears ?? '5') as string;
    const parsed = Number.parseInt(raw, 10);
    const numOfYears = Number.isFinite(parsed) ? parsed : 5;

    const result = await inflationService.getIndiaInflationYears(numOfYears);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch inflation data';
    res.status(500).json({ error: message });
  }
}
