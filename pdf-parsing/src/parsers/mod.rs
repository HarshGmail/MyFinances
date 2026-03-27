pub mod cdsl;
pub mod epf;
pub mod safegold;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use tracing::{debug, info, warn};

use crate::error::ParseError;
use crate::models::{JobResult, ParserType, PdfInput};

/// Entry point called by the worker. Extracts text from every PDF in the batch
/// then dispatches to the correct parser.
pub fn run(parser_type: ParserType, pdfs: Vec<PdfInput>) -> Result<JobResult, ParseError> {
    let type_name = format!("{parser_type:?}");
    let pdf_count = pdfs.len();
    info!(parser = %type_name, pdfs = pdf_count, "starting parse");

    let texts = extract_texts(pdfs)?;

    let result = match parser_type {
        ParserType::CdslCas => Ok(JobResult::CdslCas(cdsl::parse(&texts)?)),
        ParserType::SafeGold => Ok(JobResult::SafeGold(safegold::parse(&texts)?)),
        ParserType::EpfPassbook => Ok(JobResult::EpfPassbook(epf::parse(&texts)?)),
    };

    if let Ok(ref r) = result {
        let tx_count = match r {
            JobResult::CdslCas(v) => v.len(),
            JobResult::SafeGold(v) => v.len(),
            JobResult::EpfPassbook(v) => v.len(),
        };
        info!(parser = %type_name, transactions = tx_count, "parse complete");
    }

    result
}

fn extract_texts(pdfs: Vec<PdfInput>) -> Result<Vec<String>, ParseError> {
    pdfs.into_iter()
        .enumerate()
        .map(|(i, pdf)| {
            debug!(pdf_index = i, "decoding base64");
            let bytes = BASE64
                .decode(&pdf.data)
                .map_err(|e| ParseError::Base64(e.to_string()))?;
            debug!(pdf_index = i, bytes = bytes.len(), "extracting text");
            let text = extract_text(&bytes, &pdf.passwords)?;
            debug!(pdf_index = i, chars = text.len(), "text extracted");
            Ok(text)
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
            warn!("PDF is encrypted — password support not yet implemented");
            ParseError::PasswordFailed
        } else {
            warn!(error = %msg, "PDF text extraction failed");
            ParseError::Extraction(msg)
        }
    })
}
