import axios from 'axios';
import config from '../config';

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

  const res = await axios.post<{ job_id: string }>(`${base}/jobs`, {
    parser_type: parserType,
    pdfs,
  } satisfies JobPayload);

  return res.data.job_id;
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

  while (Date.now() < deadline) {
    const res = await axios.get<RustJobStatus>(`${base}/jobs/${jobId}`);
    const { status, result, error } = res.data;

    if (status === 'done') return result ?? null;
    if (status === 'failed') throw new Error(`PDF parsing job failed: ${error ?? 'unknown'}`);

    await sleep(1500);
  }

  throw new Error(`PDF parsing job timed out after ${timeoutMs / 1000}s`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
