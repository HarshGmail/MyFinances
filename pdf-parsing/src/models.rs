use serde::{Deserialize, Serialize};

// ── Inbound ──────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Clone)]
pub struct PdfInput {
    /// Base64-encoded PDF bytes.
    pub data: String,
    /// Passwords to try in order (for encrypted PDFs like CDSL CAS).
    #[serde(default)]
    pub passwords: Vec<String>,
}

/// PDF bytes already decoded from base64 (or received via multipart upload),
/// ready to be passed directly to the parser without re-encoding.
#[derive(Debug, Clone)]
pub struct ResolvedPdf {
    pub bytes: Vec<u8>,
    pub passwords: Vec<String>,
}

/// Holds a pre-uploaded PDF binary waiting for a job submission that
/// references it by ID. Stored in AppState.files.
#[derive(Debug, Clone)]
pub struct StoredFile {
    pub bytes: Vec<u8>,
    pub passwords: Vec<String>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum ParserType {
    CdslCas,
    SafeGold,
    EpfPassbook,
}

#[derive(Debug, Deserialize)]
pub struct JobRequest {
    pub parser_type: ParserType,
    /// PDFs as inline base64 blobs (legacy / small payloads).
    #[serde(default)]
    pub pdfs: Vec<PdfInput>,
    /// Pre-uploaded file IDs (upload-then-parse flow for large payloads).
    #[serde(default)]
    pub file_ids: Vec<String>,
}

// ── Outbound ─────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct JobResponse {
    pub job_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum JobStatus {
    Queued,
    Processing,
    Done,
    Failed,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StatusResponse {
    pub job_id: String,
    pub status: JobStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<JobResult>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// ── Domain transaction types ─────────────────────────────────────────────────

/// Mutual fund transaction parsed from a CDSL eCAS PDF.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MfTransaction {
    /// ISO date string: YYYY-MM-DD
    pub date: String,
    pub fund_name: String,
    /// "credit" = purchase / switch-in, "debit" = redemption / switch-out.
    pub transaction_type: String,
    pub units: f64,
    pub nav: f64,
    pub amount: f64,
    pub folio: String,
}

/// Gold transaction parsed from a SafeGold PDF.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GoldTransaction {
    /// ISO date string: YYYY-MM-DD
    pub date: String,
    /// "credit" = purchased, "debit" = sold.
    pub transaction_type: String,
    pub grams: f64,
    pub amount: f64,
    pub gold_price: f64,
    pub tax: f64,
}

/// EPF passbook transaction.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EpfTransaction {
    /// Wage month the contribution is for, e.g. "Oct-2024".
    pub wage_month: String,
    /// Credit date in DD-MM-YYYY format, e.g. "13-11-2024".
    pub date: String,
    pub description: String,
    /// "credit" = contribution, "debit" = withdrawal.
    pub transaction_type: String,
    pub employee_share: f64,
    pub employer_share: f64,
    pub pension_share: f64,
    pub balance: f64,
    /// Day of the month on which contribution was credited (e.g. 13).
    pub credit_day: u8,
    /// Establishment name extracted from the passbook header.
    pub establishment_name: String,
    /// Universal Account Number.
    pub uan: String,
}

/// Tagged union so callers know which transaction type they're getting.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(
    tag = "parser_type",
    content = "transactions",
    rename_all = "snake_case"
)]
pub enum JobResult {
    CdslCas(Vec<MfTransaction>),
    SafeGold(Vec<GoldTransaction>),
    EpfPassbook(Vec<EpfTransaction>),
}
