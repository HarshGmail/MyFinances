// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseModule = require('pdf-parse');
// pdf-parse may export the function directly or nest it under .default
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse: (...args: any[]) => Promise<{ text: string }> =
  pdfParseModule.default ?? pdfParseModule;

export async function extractTextFromPdf(buffer: Buffer, passwords: string[]): Promise<string> {
  // Try each password in sequence
  const passwordsToTry = passwords.length > 0 ? passwords : [''];

  for (const password of passwordsToTry) {
    try {
      const options: Record<string, unknown> = {};
      if (password) options.password = password;
      const data = await pdfParse(buffer, options);
      return data.text as string;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // If password was wrong, try next one
      if (
        message.toLowerCase().includes('password') ||
        message.toLowerCase().includes('encrypted')
      ) {
        continue;
      }
      // Non-password error — rethrow
      throw err;
    }
  }

  throw new Error('Unable to open PDF: all passwords failed');
}
