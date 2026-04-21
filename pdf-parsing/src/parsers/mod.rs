pub mod cdsl;
pub mod epf;
pub mod safegold;

use tracing::{debug, info, warn};

use crate::error::ParseError;
use crate::models::{JobResult, ParserType, ResolvedPdf};

/// Entry point called by the worker. Extracts text from every PDF in the batch
/// then dispatches to the correct parser.
pub fn run(parser_type: ParserType, pdfs: Vec<ResolvedPdf>) -> Result<JobResult, ParseError> {
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

fn extract_texts(pdfs: Vec<ResolvedPdf>) -> Result<Vec<String>, ParseError> {
    pdfs.into_iter()
        .enumerate()
        .map(|(i, pdf)| {
            debug!(pdf_index = i, bytes = pdf.bytes.len(), "extracting text");
            let text = extract_text(&pdf.bytes, &pdf.passwords)?;
            debug!(pdf_index = i, chars = text.len(), "text extracted");
            Ok(text)
        })
        .collect()
}

/// Tries to extract plain text from a PDF buffer.
///
/// For non-encrypted PDFs a direct extraction is attempted first.
/// For encrypted PDFs (e.g. CDSL CAS, which uses the user's PAN as password)
/// each supplied password is tried in order via lopdf decryption.
fn extract_text(bytes: &[u8], passwords: &[String]) -> Result<String, ParseError> {
    match pdf_extract::extract_text_from_mem(bytes) {
        Ok(text) if !text.trim().is_empty() => return Ok(text),
        Ok(_) => {
            // Encrypted PDFs sometimes produce Ok("") instead of an Err.
            // If passwords are available, fall through to try decryption.
            if passwords.is_empty() {
                return Ok(String::new());
            }
            debug!("Direct extraction returned empty text — trying passwords");
        }
        Err(e) => {
            let msg = e.to_string();
            let lower = msg.to_lowercase();
            let is_encrypted = lower.contains("password")
                || lower.contains("encrypt")
                || lower.contains("invalid cross-reference");

            if !is_encrypted || passwords.is_empty() {
                warn!(error = %msg, encrypted = is_encrypted, "PDF text extraction failed");
                return Err(if is_encrypted {
                    ParseError::PasswordFailed
                } else {
                    ParseError::Extraction(msg)
                });
            }
            // Encrypted — fall through to try passwords
        }
    }

    for password in passwords {
        if let Some(decrypted) = decrypt_pdf(bytes, password) {
            match pdf_extract::extract_text_from_mem(&decrypted) {
                Ok(text) if !text.trim().is_empty() => {
                    let hint = &password[..password.len().min(3)];
                    info!(password_hint = %hint, "PDF decrypted successfully");
                    return Ok(text);
                }
                Ok(_) => {
                    warn!("Text extraction after decryption returned empty content");
                }
                Err(e) => {
                    warn!(error = %e, "Text extraction failed after decryption");
                }
            }
        }
    }

    warn!(
        passwords = passwords.len(),
        "All passwords failed for encrypted PDF"
    );
    Err(ParseError::PasswordFailed)
}

fn decrypt_pdf(bytes: &[u8], password: &str) -> Option<Vec<u8>> {
    let hint = &password[..password.len().min(3)];
    let mut doc = match lopdf::Document::load_mem(bytes) {
        Ok(d) => d,
        Err(e) => {
            warn!(error = %e, password_hint = %hint, "lopdf: failed to load PDF");
            return None;
        }
    };
    if let Err(e) = doc.decrypt(password.as_bytes()) {
        warn!(error = %e, password_hint = %hint, "lopdf: decryption failed");
        return None;
    }
    let mut out = Vec::new();
    if let Err(e) = doc.save_to(&mut out) {
        warn!(error = %e, "lopdf: save after decryption failed");
        return None;
    }
    Some(out)
}
