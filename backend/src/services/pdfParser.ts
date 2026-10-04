// pdf-parse v2.x: constructor takes { data, password, verbosity }, method is getText()
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse, PasswordException, VerbosityLevel } = require('pdf-parse');

/**
 * Thrown when every candidate password fails to open an encrypted PDF.
 * Carries the exact list of passwords that were tried so the caller can
 * surface them to the user (so they can see the password being formed).
 */
export class PdfPasswordError extends Error {
  readonly attemptedPasswords: string[];
  constructor(attemptedPasswords: string[]) {
    super('Unable to open PDF: all passwords failed');
    this.name = 'PdfPasswordError';
    this.attemptedPasswords = attemptedPasswords;
  }
}

export interface UnlockedPdfText {
  text: string;
  password: string;
}

export async function extractTextFromPdf(buffer: Buffer, passwords: string[]): Promise<string> {
  const { text } = await extractTextFromPdfWithPassword(buffer, passwords);
  return text;
}

export async function extractTextFromPdfWithPassword(
  buffer: Buffer,
  passwords: string[]
): Promise<UnlockedPdfText> {
  const passwordsToTry = passwords.length > 0 ? passwords : [''];

  for (const password of passwordsToTry) {
    let parser: any = null;
    try {
      const loadParams: Record<string, unknown> = {
        data: buffer,
        verbosity: VerbosityLevel.ERRORS,
      };
      if (password) loadParams.password = password;

      parser = new PDFParse(loadParams);
      const result = await parser.getText();
      return { text: result.text as string, password };
    } catch (err: unknown) {
      // Wrong password — try the next one
      if (err instanceof PasswordException) {
        continue;
      }
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.toLowerCase().includes('password') ||
        message.toLowerCase().includes('encrypted')
      ) {
        continue;
      }
      throw err;
    } finally {
      if (parser) {
        try {
          await parser.destroy();
        } catch {
          // ignore destroy errors
        }
      }
    }
  }

  throw new PdfPasswordError(passwordsToTry);
}
