import { readFileSync } from 'fs';
import { CREDIT_CARD_ISSUERS, CreditCardIssuer } from '../src/schemas/creditCard';
import { extractTextFromPdfWithPassword } from '../src/services/pdfParser';
import { parseCreditCardStatement } from '../src/services/creditCardStatementParser';

const USAGE = 'Usage: npx ts-node scripts/dumpCardStatement.ts <pdfPath> <issuer> [password...]';
const RULE = '─'.repeat(80);

function isIssuer(value: string): value is CreditCardIssuer {
  return (CREDIT_CARD_ISSUERS as readonly string[]).includes(value);
}

async function main() {
  const [pdfPath, issuer, ...passwords] = process.argv.slice(2);
  if (!pdfPath || !issuer) {
    console.error(USAGE);
    process.exit(1);
  }
  if (!isIssuer(issuer)) {
    console.error(`Unknown issuer "${issuer}". Expected one of: ${CREDIT_CARD_ISSUERS.join(', ')}`);
    process.exit(1);
  }

  const { text, password } = await extractTextFromPdfWithPassword(readFileSync(pdfPath), [
    ...passwords,
    '',
  ]);
  console.log(password ? `Opened with password: ${password}` : 'Opened without a password');
  console.log(RULE);
  console.log(text);
  console.log(RULE);
  console.log(JSON.stringify(parseCreditCardStatement(text, issuer), null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
