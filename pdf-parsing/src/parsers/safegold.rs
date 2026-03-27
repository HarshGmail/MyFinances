use crate::error::ParseError;
use crate::models::GoldTransaction;

/// Parse SafeGold PDF text into gold transactions.
///
/// Port from: backend/src/services/safegoldParser.ts
///
/// Rules (must match the TS implementation):
/// - Only rows with transaction type "Purchased" or "Sold" are imported.
/// - Lease, TDS, and rental income rows are skipped.
/// - Each data row: Date | Type | Grams | Rate | Amount
pub fn parse(_texts: &[String]) -> Result<Vec<GoldTransaction>, ParseError> {
    // TODO: implement — port logic from backend/src/services/safegoldParser.ts
    Ok(vec![])
}
