use thiserror::Error;

#[derive(Error, Debug)]
pub enum ParseError {
    #[error("PDF text extraction failed: {0}")]
    Extraction(String),
    #[error("All passwords failed — PDF is encrypted and no valid password was supplied")]
    PasswordFailed,
}
