use crate::error::ParseError;
use crate::models::MfTransaction;

/// Parse CDSL eCAS PDF text into mutual fund transactions.
///
/// Port from: backend/src/services/cdslParser.ts
///
/// Key patterns in the extracted text:
/// - Folio line:       "Folio No: <number>"
/// - Fund name line:   appears just before the transaction block for that folio
/// - Transaction line: "DD-MMM-YYYY  <description>  <units>  <nav>  <amount>"
///   where description contains "Purchase", "Redemption", "Switch In", "Switch Out"
///
/// NOTE: CDSL CAS PDFs are PAN-encrypted. Implement lopdf-based decryption in
/// parsers/mod.rs extract_text() before this parser will work end-to-end.
pub fn parse(_texts: &[String]) -> Result<Vec<MfTransaction>, ParseError> {
    // TODO: implement — port logic from backend/src/services/cdslParser.ts
    Ok(vec![])
}
