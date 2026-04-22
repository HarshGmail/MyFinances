pub mod cdsl;
pub mod epf;
pub mod safegold;
pub mod safegoldinvoice;

use log::{debug, info, warn};
use rayon::prelude::*;

use crate::error::ParseError;
use crate::models::{JobResult, ParserType, ResolvedPdf};

/// Entry point called by the worker. Extracts text from every PDF in the batch
/// in parallel (rayon), then dispatches to the correct parser.
pub fn run(parser_type: ParserType, pdfs: Vec<ResolvedPdf>) -> Result<JobResult, ParseError> {
    let type_name = format!("{parser_type:?}");
    let pdf_count = pdfs.len();
    info!("starting parse parser={} pdfs={}", type_name, pdf_count);

    let texts = extract_texts(pdfs)?;

    let result = match parser_type {
        ParserType::CdslCas => Ok(JobResult::CdslCas(cdsl::parse(&texts)?)),
        ParserType::SafeGold => Ok(JobResult::SafeGold(safegold::parse(&texts)?)),
        ParserType::SafeGoldInvoice => {
            Ok(JobResult::SafeGoldInvoice(safegoldinvoice::parse(&texts)?))
        }
        ParserType::EpfPassbook => Ok(JobResult::EpfPassbook(epf::parse(&texts)?)),
    };

    if let Ok(ref r) = result {
        let tx_count = match r {
            JobResult::CdslCas(v) => v.len(),
            JobResult::SafeGold(v) => v.len(),
            JobResult::SafeGoldInvoice(v) => v.len(),
            JobResult::EpfPassbook(v) => v.len(),
        };
        info!(
            "parse complete parser={} transactions={}",
            type_name, tx_count
        );
    }

    result
}

/// Extracts text from all PDFs in parallel using rayon.
/// Each PDF is decrypted and extracted independently on its own thread.
fn extract_texts(pdfs: Vec<ResolvedPdf>) -> Result<Vec<String>, ParseError> {
    pdfs.into_par_iter()
        .enumerate()
        .map(|(i, pdf)| {
            debug!("extracting text pdf_index={} bytes={}", i, pdf.bytes.len());
            let text = extract_text(&pdf.bytes, &pdf.passwords)?;
            debug!("text extracted pdf_index={} chars={}", i, text.len());
            Ok(text)
        })
        .collect()
}

/// Tries to extract plain text from a PDF buffer.
///
/// Flow:
/// 1. Direct extraction via pdf_extract — handles unencrypted PDFs.
/// 2. If result is empty and passwords supplied, fall through to try decryption.
/// 3. For each password: try lopdf (fast, RC4), then qpdf subprocess (AES-128/256).
fn extract_text(bytes: &[u8], passwords: &[String]) -> Result<String, ParseError> {
    match pdf_extract::extract_text_from_mem(bytes) {
        Ok(text) if !text.trim().is_empty() => return Ok(text),
        Ok(_) => {
            // Encrypted PDFs sometimes return Ok("") instead of an error.
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
                || lower.contains("invalid cross-reference")
                || lower.contains("key length")
                || lower.contains("unsupported key");

            if !is_encrypted || passwords.is_empty() {
                warn!(
                    "PDF text extraction failed (encrypted={}): {}",
                    is_encrypted, msg
                );
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
        let hint = &password[..password.len().min(3)];

        if let Some(decrypted) = decrypt_pdf(bytes, password) {
            match pdf_extract::extract_text_from_mem(&decrypted) {
                Ok(text) if !text.trim().is_empty() => {
                    info!("PDF decrypted successfully hint={}", hint);
                    return Ok(text);
                }
                _ => {
                    // lopdf gave bytes but pdf_extract got nothing — try qpdf directly.
                    if let Some(qpdf_decrypted) = decrypt_pdf_qpdf(bytes, password) {
                        match pdf_extract::extract_text_from_mem(&qpdf_decrypted) {
                            Ok(text) if !text.trim().is_empty() => {
                                info!("PDF decrypted via qpdf hint={}", hint);
                                return Ok(text);
                            }
                            _ => warn!(
                                "Text extraction empty after both lopdf and qpdf hint={}",
                                hint
                            ),
                        }
                    }
                }
            }
        }
    }

    let lengths: Vec<usize> = passwords.iter().map(|p| p.len()).collect();
    warn!(
        "All passwords failed for encrypted PDF count={} lengths={:?}",
        passwords.len(),
        lengths
    );
    Err(ParseError::PasswordFailed)
}

/// Tries lopdf first (fast, in-process, handles RC4).
/// Falls back to qpdf subprocess on any lopdf failure (handles AES-128/AES-256).
fn decrypt_pdf(bytes: &[u8], password: &str) -> Option<Vec<u8>> {
    let hint = &password[..password.len().min(3)];

    let mut doc = match lopdf::Document::load_mem(bytes) {
        Ok(d) => d,
        Err(e) => {
            warn!(
                "lopdf: failed to load PDF hint={}, trying qpdf: {}",
                hint, e
            );
            return decrypt_pdf_qpdf(bytes, password);
        }
    };
    if let Err(e) = doc.decrypt(password.as_bytes()) {
        warn!("lopdf: decryption failed hint={}, trying qpdf: {}", hint, e);
        return decrypt_pdf_qpdf(bytes, password);
    }
    let mut out = Vec::new();
    if let Err(e) = doc.save_to(&mut out) {
        warn!("lopdf: save after decryption failed, trying qpdf: {}", e);
        return decrypt_pdf_qpdf(bytes, password);
    }
    Some(out)
}

/// Decrypts a PDF using the qpdf command-line tool via stdin → stdout.
/// Handles all standard PDF encryption schemes (RC4, AES-128, AES-256).
/// Returns None if qpdf is not installed or decryption fails.
fn decrypt_pdf_qpdf(bytes: &[u8], password: &str) -> Option<Vec<u8>> {
    use std::fs;
    use std::process::{Command, Stdio};

    let hint = &password[..password.len().min(3)];

    // qpdf doesn't support stdin/stdout via "-" on all platforms — use temp files.
    let tmp_in = std::env::temp_dir().join(format!("pdf_in_{}.pdf", uuid::Uuid::new_v4()));
    let tmp_out = std::env::temp_dir().join(format!("pdf_out_{}.pdf", uuid::Uuid::new_v4()));

    if let Err(e) = fs::write(&tmp_in, bytes) {
        warn!("qpdf: failed to write temp input file: {}", e);
        return None;
    }

    let output = Command::new("qpdf")
        .arg(format!("--password={password}"))
        .arg("--decrypt")
        .arg(&tmp_in)
        .arg(&tmp_out)
        .stderr(Stdio::piped())
        .output();

    let _ = fs::remove_file(&tmp_in);

    match output {
        Ok(o) if o.status.success() || o.status.code() == Some(3) => match fs::read(&tmp_out) {
            Ok(data) if !data.is_empty() => {
                let _ = fs::remove_file(&tmp_out);
                info!("qpdf: decrypted PDF hint={} bytes={}", hint, data.len());
                Some(data)
            }
            Ok(_) => {
                let _ = fs::remove_file(&tmp_out);
                warn!("qpdf: output file empty hint={}", hint);
                None
            }
            Err(e) => {
                warn!("qpdf: failed to read output file: {}", e);
                None
            }
        },
        Ok(o) => {
            let _ = fs::remove_file(&tmp_out);
            let stderr = String::from_utf8_lossy(&o.stderr);
            warn!(
                "qpdf: decryption failed hint={} exit={} stderr={}",
                hint,
                o.status.code().unwrap_or(-1),
                stderr.trim()
            );
            None
        }
        Err(e) => {
            warn!("qpdf: failed to spawn (not installed?): {}", e);
            None
        }
    }
}
