// pdf-parse v2.x: constructor takes { data, password, verbosity }, method is getText()
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse, PasswordException, VerbosityLevel } = require('pdf-parse');

export async function extractTextFromPdf(buffer: Buffer, passwords: string[]): Promise<string> {
  const passwordsToTry = passwords.length > 0 ? passwords : [''];

  for (const password of passwordsToTry) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parser: any = null;
    try {
      const loadParams: Record<string, unknown> = {
        data: buffer,
        verbosity: VerbosityLevel.ERRORS,
      };
      if (password) loadParams.password = password;

      parser = new PDFParse(loadParams);
      const result = await parser.getText();
      return result.text as string;
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

  throw new Error('Unable to open PDF: all passwords failed');
}
