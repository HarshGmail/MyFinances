import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';

type ParserType = 'cdsl_cas' | 'safe_gold' | 'epf_passbook';

interface PdfInput {
  data: string; // base64
  passwords: string[];
}

interface JobPayload {
  parser_type: ParserType;
  pdfs: PdfInput[];
}

interface RustJobResult {
  parser_type: ParserType;
  transactions: unknown[];
}

interface RustJobStatus {
  job_id: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  result?: RustJobResult;
  error?: string;
}

/** Returns true when a PDF parsing service URL is configured. */
export function isPdfServiceAvailable(): boolean {
  return !!config.PDF_PARSING_SERVICE_URL;
}

/** Fire-and-forget: wakes the Render instance from sleep. Never throws. */
export function warmupPdfService(): void {
  if (!config.PDF_PARSING_SERVICE_URL) return;
  axios.get(`${config.PDF_PARSING_SERVICE_URL}/jobs/warmup`).catch(() => {});
}

/**
 * Submits a batch of PDFs to the Rust parsing service.
 * Returns the job ID to poll with `waitForPdfJob`.
 */
export async function submitPdfJob(
  parserType: ParserType,
  buffers: Buffer[],
  passwords: string[]
): Promise<string> {
  const base = config.PDF_PARSING_SERVICE_URL!;
  const pdfs: PdfInput[] = buffers.map((buf) => ({
    data: buf.toString('base64'),
    passwords,
  }));

  const totalSizeKb = Math.round(pdfs.reduce((s, p) => s + p.data.length, 0) / 1024);
  logger.info(
    { parserType, pdfCount: buffers.length, payloadSizeKb: totalSizeKb, url: `${base}/jobs` },
    '[PdfClient] Submitting job'
  );

  try {
    const res = await axios.post<{ job_id: string }>(`${base}/jobs`, {
      parser_type: parserType,
      pdfs,
    } satisfies JobPayload);
    logger.info({ parserType, jobId: res.data.job_id }, '[PdfClient] Job submitted successfully');
    return res.data.job_id;
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    logger.error({ err, parserType, payloadSizeKb: totalSizeKb, status }, '[PdfClient] Job submission failed');
    throw err;
  }
}

/**
 * Polls the Rust service until the job is done or failed.
 * Throws if polling exceeds the timeout or the job reports failure.
 */
export async function waitForPdfJob(
  jobId: string,
  timeoutMs = 5 * 60 * 1000
): Promise<RustJobResult | null> {
  const base = config.PDF_PARSING_SERVICE_URL!;
  const deadline = Date.now() + timeoutMs;

  logger.info({ jobId }, '[PdfClient] Waiting for job result');

  while (Date.now() < deadline) {
    try {
      const res = await axios.get<RustJobStatus>(`${base}/jobs/${jobId}`);
      const { status, result, error } = res.data;

      if (status === 'done') {
        logger.info({ jobId, transactionCount: result?.transactions?.length ?? 0 }, '[PdfClient] Job done');
        return result ?? null;
      }
      if (status === 'failed') {
        logger.error({ jobId, error }, '[PdfClient] Job failed');
        throw new Error(`PDF parsing job failed: ${error ?? 'unknown'}`);
      }

      logger.info({ jobId, status }, '[PdfClient] Job still processing, polling again');
    } catch (err) {
      if ((err as Error).message.startsWith('PDF parsing job')) throw err;
      logger.error({ err, jobId }, '[PdfClient] Error polling job status');
      throw err;
    }

    await sleep(1500);
  }

  logger.error({ jobId, timeoutMs }, '[PdfClient] Job timed out');
  throw new Error(`PDF parsing job timed out after ${timeoutMs / 1000}s`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
