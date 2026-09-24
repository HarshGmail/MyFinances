import {
  ParserType,
  isPdfServiceAvailable,
  submitPdfJobByIds,
  uploadPdfsSequentially,
  waitForPdfJob,
} from './pdfParsingClient';
import { extractTextFromPdf, PdfPasswordError } from './pdfParser';
import logger from '../utils/logger';

export interface PdfBatchResult<T> {
  transactions: T[];
  parsedBy: 'rust' | 'local';
  rustError?: unknown;
  lockedPdfCount: number;
  failedPdfCount: number;
}

interface LocalPdfBatchRequest<T> {
  parserType: ParserType;
  buffers: Buffer[];
  passwords: string[];
  parseText: (text: string) => T[];
}

interface PdfBatchRequest<TRust, T> extends LocalPdfBatchRequest<T> {
  fromRust: (tx: TRust) => T;
}

export async function parsePdfBatch<TRust, T>(
  request: PdfBatchRequest<TRust, T>
): Promise<PdfBatchResult<T>> {
  let rustError: unknown;

  if (isPdfServiceAvailable()) {
    try {
      const fileIds = await uploadPdfsSequentially(request.buffers, request.passwords);
      const jobId = await submitPdfJobByIds(request.parserType, fileIds);
      const result = await waitForPdfJob(jobId);
      const rustTransactions = (result?.transactions ?? []) as TRust[];
      return {
        transactions: rustTransactions.map(request.fromRust),
        parsedBy: 'rust',
        lockedPdfCount: 0,
        failedPdfCount: 0,
      };
    } catch (err) {
      rustError = err;
      logger.warn(
        { err, parserType: request.parserType },
        '[EmailPdf] Rust service failed, falling back to local parser'
      );
    }
  }

  return { ...(await parsePdfBatchLocally(request)), rustError };
}

export async function parsePdfBatchLocally<T>(
  request: LocalPdfBatchRequest<T>
): Promise<PdfBatchResult<T>> {
  const transactions: T[] = [];
  let lockedPdfCount = 0;
  let failedPdfCount = 0;

  for (const buffer of request.buffers) {
    try {
      const text = await extractTextFromPdf(buffer, request.passwords);
      transactions.push(...request.parseText(text));
    } catch (err) {
      if (err instanceof PdfPasswordError) {
        lockedPdfCount++;
      } else {
        failedPdfCount++;
        logger.warn({ err, parserType: request.parserType }, '[EmailPdf] Local parse failed');
      }
    }
  }

  logger.info(
    {
      parserType: request.parserType,
      pdfCount: request.buffers.length,
      transactionCount: transactions.length,
      lockedPdfCount,
      failedPdfCount,
    },
    '[EmailPdf] Parsed locally'
  );

  return { transactions, parsedBy: 'local', lockedPdfCount, failedPdfCount };
}
