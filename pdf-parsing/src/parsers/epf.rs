use crate::error::ParseError;
use crate::models::EpfTransaction;

/// Parse EPFO passbook PDF text into EPF transactions.
///
/// EPFO passbook columns (approximate):
///   Date | Narration | Employee Share (Dr/Cr) | Employer Share (Dr/Cr) | Pension (Dr/Cr) | Balance
///
/// transaction_type is "credit" for contributions and "debit" for withdrawals.
pub fn parse(_texts: &[String]) -> Result<Vec<EpfTransaction>, ParseError> {
    // TODO: implement — analyse a sample EPFO passbook PDF and write the parser
    Ok(vec![])
}
