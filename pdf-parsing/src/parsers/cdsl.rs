use log::{info, warn};
use regex::Regex;

use crate::error::ParseError;
use crate::models::MfTransaction;

const CREDIT_KEYWORDS: &[&str] = &[
    "purchase",
    "systematic investment",
    "sip",
    "switch in",
    "lateral shift in",
    "dividend reinvestment",
    "nfo allotment",
    "allotment",
];

const DEBIT_KEYWORDS: &[&str] = &[
    "redemption",
    "switch out",
    "lateral shift out",
    "withdrawal",
    "repurchase",
];

fn is_credit(description: &str) -> bool {
    let lower = description.to_lowercase();
    if DEBIT_KEYWORDS.iter().any(|kw| lower.contains(kw)) {
        return false;
    }
    if CREDIT_KEYWORDS.iter().any(|kw| lower.contains(kw)) {
        return true;
    }
    true // default to credit if ambiguous
}

/// Strips scheme code prefix from fund names.
/// e.g. "489 - Franklin Build India Fund - Direct Plan - Growth"
///   → "Franklin Build India Fund - Direct Plan - Growth"
/// e.g. "FMGD - Motilal Oswal Midcap Fund - Direct Plan Growth"
///   → "Motilal Oswal Midcap Fund - Direct Plan Growth"
fn strip_scheme_code(line: &str) -> &str {
    if let Some(dash_pos) = line.find(" - ") {
        let prefix = &line[..dash_pos];
        if !prefix.is_empty() && prefix.chars().all(|c| c.is_alphanumeric()) {
            return line[dash_pos + 3..].trim();
        }
    }
    line
}

/// Convert "DD-MM-YYYY" to ISO "YYYY-MM-DD" for JS Date compatibility.
fn to_iso_date(ddmmyyyy: &str) -> String {
    let parts: Vec<&str> = ddmmyyyy.split('-').collect();
    if parts.len() == 3 {
        format!("{}-{}-{}", parts[2], parts[1], parts[0])
    } else {
        ddmmyyyy.to_string()
    }
}

/// Parse CDSL eCAS PDF text into mutual fund transactions.
/// Ported from backend/src/services/cdslParser.ts
pub fn parse(texts: &[String]) -> Result<Vec<MfTransaction>, ParseError> {
    let date_re = Regex::new(r"^(\d{2}-\d{2}-\d{4})\s*(.*)").unwrap();
    // Scheme code line: starts with ALPHANUMERIC then " - " then content
    let scheme_re = Regex::new(r"^[A-Za-z0-9]+ - .+").unwrap();
    let number_re = Regex::new(r"(\d[\d,]*\.?\d*|\.\d+)").unwrap();
    // Three numbers separated by spaces — indicates the data row is complete
    let three_numbers_re = Regex::new(r"[\d,]+\.?\d*\s+[\d,]+\.?\d*\s+[\d,]+\.?\d*").unwrap();

    let mut all_transactions = Vec::new();

    for text in texts {
        let section_start = match text.find("MUTUAL FUND UNITS HELD WITH MF/RTA") {
            Some(idx) => idx,
            None => {
                info!("[CDSL Parser] MF section not found in text");
                continue;
            }
        };

        let section_end = text[section_start..]
            .find("MUTUAL FUND UNITS HELD AS ON")
            .map(|rel| section_start + rel);

        let section = match section_end {
            Some(end) => &text[section_start..end],
            None => &text[section_start..],
        };

        let lines: Vec<&str> = section
            .split('\n')
            .map(|l| l.trim())
            .filter(|l| !l.is_empty())
            .collect();

        let mut current_fund_name = String::new();
        let mut i = 0;

        while i < lines.len() {
            let line = lines[i];

            // Skip boilerplate / column headers
            if line.contains("Transaction Description")
                || line.contains("Stamp Duty")
                || line.contains("Income Distribution")
                || line.contains("Capital Withdrawal")
                || line.contains("STATEMENT OF TRANSACTIONS")
                || line.contains("MUTUAL FUND UNITS")
                || line.starts_with("ISIN :")
                || line.starts_with("तारीख")
                || line.starts_with("लेनदेन")
            {
                i += 1;
                continue;
            }

            // Skip opening/closing balance lines
            let lower = line.to_lowercase();
            if lower.contains("opening balance") || lower.contains("closing balance") {
                i += 1;
                continue;
            }

            // Skip AMC name lines: contains "mutual fund" but is not a date or scheme code line
            if lower.contains("mutual fund") && !date_re.is_match(line) && !scheme_re.is_match(line)
            {
                i += 1;
                continue;
            }

            // Detect scheme code line (but not ISIN lines)
            if scheme_re.is_match(line) && !line.starts_with("ISIN") {
                current_fund_name = strip_scheme_code(line).to_string();
                i += 1;
                continue;
            }

            // Detect transaction row starting with DD-MM-YYYY
            if let Some(caps) = date_re.captures(line) {
                if !current_fund_name.is_empty() {
                    let date_str = caps.get(1).unwrap().as_str().to_string();
                    let mut rest = caps.get(2).unwrap().as_str().to_string();

                    // Accumulate continuation lines until we have 3+ numbers (the data row)
                    while i + 1 < lines.len() {
                        let next_line = lines[i + 1];
                        // Stop if next line starts a new transaction/section
                        if date_re.is_match(next_line)
                            || next_line.to_lowercase().contains("opening balance")
                            || next_line.to_lowercase().contains("closing balance")
                            || scheme_re.is_match(next_line)
                        {
                            break;
                        }
                        // Stop if rest already has the numeric data
                        if three_numbers_re.is_match(&rest) {
                            break;
                        }
                        i += 1;
                        rest.push(' ');
                        rest.push_str(next_line);
                    }

                    // Extract all numbers (including comma-formatted and leading-dot like ".2")
                    // Columns: Amount | NAV | Price | Units | StampDuty | IncomeDist | CapWithdrawal
                    // Always take the LAST 7 to skip reference numbers in descriptions.
                    let num_matches: Vec<f64> = number_re
                        .find_iter(&rest)
                        .map(|m| m.as_str().replace(',', "").parse::<f64>().unwrap_or(0.0))
                        .collect();

                    if num_matches.len() >= 7 {
                        let last7 = &num_matches[num_matches.len() - 7..];
                        let amount = last7[0];
                        let nav = last7[1];
                        // last7[2] = Price (same as NAV, skip)
                        let units = last7[3];

                        all_transactions.push(MfTransaction {
                            date: to_iso_date(&date_str),
                            fund_name: current_fund_name.clone(),
                            amount,
                            nav,
                            units,
                            folio: String::new(),
                            transaction_type: if is_credit(&rest) {
                                "credit".to_string()
                            } else {
                                "debit".to_string()
                            },
                        });
                    } else if num_matches.len() >= 4 {
                        // Fallback: fewer than 7 numbers (some trailing columns missing/blank).
                        // Use the first three non-zero numbers as amount, nav, units.
                        let meaningful: Vec<f64> =
                            num_matches.iter().filter(|&&n| n > 0.0).copied().collect();
                        if meaningful.len() >= 3 {
                            let amount = meaningful[0];
                            let nav = meaningful[1];
                            let units = meaningful[2];
                            all_transactions.push(MfTransaction {
                                date: to_iso_date(&date_str),
                                fund_name: current_fund_name.clone(),
                                amount,
                                nav,
                                units,
                                folio: String::new(),
                                transaction_type: if is_credit(&rest) {
                                    "credit".to_string()
                                } else {
                                    "debit".to_string()
                                },
                            });
                        } else {
                            warn!(
                                "[CDSL Parser] Not enough numeric values in row: {}",
                                &rest[..rest.len().min(120)]
                            );
                        }
                    }
                }
            }

            i += 1;
        }
    }

    info!(
        "[CDSL Parser] Extracted {} MF transactions",
        all_transactions.len()
    );
    Ok(all_transactions)
}
