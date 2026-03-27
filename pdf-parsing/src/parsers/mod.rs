pub mod cdsl;
pub mod epf;
pub mod safegold;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};

use crate::error::ParseError;
use crate::models::{JobResult, ParserType, PdfInput};

/// Entry point called by the worker. Extracts text from every PDF in the batch
/// then dispatches to the correct parser.
pub fn run(parser_type: ParserType, pdfs: Vec<PdfInput>) -> Result<JobResult, ParseError> {
    let texts = extract_texts(pdfs)?;
    match parser_type {
        ParserType::CdslCas => Ok(JobResult::CdslCas(cdsl::parse(&texts)?)),
        ParserType::SafeGold => Ok(JobResult::SafeGold(safegold::parse(&texts)?)),
        ParserType::EpfPassbook => Ok(JobResult::EpfPassbook(epf::parse(&texts)?)),
    }
}

fn extract_texts(pdfs: Vec<PdfInput>) -> Result<Vec<String>, ParseError> {
    pdfs.into_iter()
        .map(|pdf| {
            let bytes = BASE64
                .decode(&pdf.data)
                .map_err(|e| ParseError::Base64(e.to_string()))?;
            extract_text(&bytes, &pdf.passwords)
        })
        .collect()
}

/// Tries to extract plain text from a PDF buffer.
///
/// For non-encrypted PDFs a direct extraction is attempted first.
/// For encrypted PDFs (e.g. CDSL CAS, which uses the user's PAN as password)
/// each supplied password is tried in order.
///
/// NOTE: `pdf-extract` does not expose a password API. Encrypted-PDF support
/// requires loading with `lopdf`, calling `Document::decrypt`, serialising the
/// decrypted document back to bytes, then re-running `extract_text_from_mem`.
/// Add `lopdf` to Cargo.toml and implement that path here when porting the
/// CDSL parser (CDSL CAS PDFs are always PAN-encrypted).
fn extract_text(bytes: &[u8], _passwords: &[String]) -> Result<String, ParseError> {
    pdf_extract::extract_text_from_mem(bytes).map_err(|e| {
        let msg = e.to_string();
        if msg.to_lowercase().contains("password") || msg.to_lowercase().contains("encrypt") {
            ParseError::PasswordFailed
        } else {
            ParseError::Extraction(msg)
        }
    })
}
