use log::{info, warn};
use regex::Regex;

use crate::error::ParseError;
use crate::models::GoldTransaction;

fn month_num(name: &str) -> Option<u32> {
    match name.to_lowercase().as_str() {
        "january" => Some(1),
        "february" => Some(2),
        "march" => Some(3),
        "april" => Some(4),
        "may" => Some(5),
        "june" => Some(6),
        "july" => Some(7),
        "august" => Some(8),
        "september" => Some(9),
        "october" => Some(10),
        "november" => Some(11),
        "december" => Some(12),
        _ => None,
    }
}

fn is_skippable(text: &str) -> bool {
    let lower = text.to_lowercase();
    lower.contains("lease rental")
        || lower.contains("deducted as tds")
        || lower.contains("tds on")
        || lower.contains("leased ")
        || lower.contains("lease income")
        || lower.contains("opening gold wallet")
        || lower.contains("closing gold wallet")
}

fn parse_num(raw: &str) -> f64 {
    raw.replace(',', "").parse::<f64>().unwrap_or(0.0)
}

/// Parse SafeGold PDF text into gold transactions.
/// Ported from backend/src/services/safegoldParser.ts
pub fn parse(texts: &[String]) -> Result<Vec<GoldTransaction>, ParseError> {
    let ordinal_re = Regex::new(r"(?i)(\d{1,2})(?:st|nd|rd|th)\s+([A-Za-z]+)\s+(\d{4})").unwrap();
    let header_re =
        Regex::new(r"(?i)date\s*&\s*time|transaction details|quantity|closing balance").unwrap();

    // Currency prefix: ₹, Rs., Rs, or nothing
    let currency = r"(?:(?:Rs\.?|₹)\s*)?";
    let purchase_qty_re = Regex::new(r"(?i)Purchased\s+([\d.]+)\s+grams?").unwrap();
    let purchase_amt_re = Regex::new(&format!(r"(?i)for\s+{currency}([\d,]+\.?\d*)")).unwrap();
    let rate_re = Regex::new(&format!(r"(?i)at\s+{currency}([\d,]+\.?\d*)\s*/\s*g")).unwrap();
    let gst_re = Regex::new(&format!(r"(?i)GST\s+of\s+{currency}([\d,]+\.?\d*)")).unwrap();
    let sold_word_re = Regex::new(r"(?i)\bsold\b").unwrap();
    let sold_qty_re = Regex::new(r"(?i)Sold\s+([\d.]+)\s+grams?").unwrap();

    let mut all_transactions = Vec::new();

    for text in texts {
        let lower_text = text.to_lowercase();
        let idx = match lower_text.find("transaction statement") {
            Some(i) => i,
            None => {
                info!("[SafeGold Parser] 'Transaction Statement' not found in text");
                continue;
            }
        };

        let section = &text[idx..];
        let lines: Vec<&str> = section
            .split('\n')
            .map(|l| l.trim())
            .filter(|l| !l.is_empty())
            .collect();

        // Build blocks: each block = (iso_date_string, accumulated_line_text).
        // A new block starts on each ordinal date line (e.g. "1st February 2026").
        let mut blocks: Vec<(String, String)> = Vec::new();
        let mut current_date: Option<String> = None;
        let mut block_lines: Vec<&str> = Vec::new();

        for line in &lines {
            if header_re.is_match(line) {
                continue;
            }

            if let Some(caps) = ordinal_re.captures(line) {
                let day: u32 = caps[1].parse().unwrap_or(0);
                let month_name = &caps[2];
                let year: u32 = caps[3].parse().unwrap_or(0);

                if let Some(month) = month_num(month_name) {
                    // Flush previous block
                    if let Some(date) = current_date.take() {
                        if !block_lines.is_empty() {
                            blocks.push((date, block_lines.join(" ")));
                            block_lines.clear();
                        }
                    }
                    // Store as ISO YYYY-MM-DD for JS Date compatibility
                    current_date = Some(format!("{year}-{month:02}-{day:02}"));
                    block_lines.push(line);
                    continue;
                }
            }

            if current_date.is_some() {
                block_lines.push(line);
            }
        }

        // Flush last block
        if let Some(date) = current_date {
            if !block_lines.is_empty() {
                blocks.push((date, block_lines.join(" ")));
            }
        }

        info!(
            "[SafeGold Parser] Built {} transaction blocks",
            blocks.len()
        );

        for (date_str, block_text) in &blocks {
            if is_skippable(block_text) {
                continue;
            }

            let lower_block = block_text.to_lowercase();

            // ── Purchase ──────────────────────────────────────────────────
            if lower_block.contains("purchased") {
                match (
                    purchase_qty_re.captures(block_text),
                    purchase_amt_re.captures(block_text),
                    rate_re.captures(block_text),
                ) {
                    (Some(qty_caps), Some(amt_caps), Some(rate_caps)) => {
                        let grams = qty_caps[1].parse::<f64>().unwrap_or(0.0);
                        let amount = parse_num(&amt_caps[1]);
                        let gold_price = parse_num(&rate_caps[1]);
                        let tax = gst_re
                            .captures(block_text)
                            .map(|c| parse_num(&c[1]))
                            .unwrap_or(0.0);

                        all_transactions.push(GoldTransaction {
                            date: date_str.clone(),
                            transaction_type: "credit".to_string(),
                            grams,
                            amount,
                            gold_price,
                            tax,
                        });
                    }
                    _ => {
                        warn!(
                            "[SafeGold Parser] Could not parse purchase block: {}",
                            &block_text[..block_text.len().min(120)]
                        );
                    }
                }
                continue;
            }

            // ── Sale ──────────────────────────────────────────────────────
            if sold_word_re.is_match(block_text) {
                match (
                    sold_qty_re.captures(block_text),
                    purchase_amt_re.captures(block_text),
                    rate_re.captures(block_text),
                ) {
                    (Some(qty_caps), Some(amt_caps), Some(rate_caps)) => {
                        let grams = qty_caps[1].parse::<f64>().unwrap_or(0.0);
                        let amount = parse_num(&amt_caps[1]);
                        let gold_price = parse_num(&rate_caps[1]);

                        all_transactions.push(GoldTransaction {
                            date: date_str.clone(),
                            transaction_type: "debit".to_string(),
                            grams,
                            amount,
                            gold_price,
                            tax: 0.0,
                        });
                    }
                    _ => {
                        warn!(
                            "[SafeGold Parser] Could not parse sale block: {}",
                            &block_text[..block_text.len().min(120)]
                        );
                    }
                }
            }
        }
    }

    info!(
        "[SafeGold Parser] Extracted {} gold transactions",
        all_transactions.len()
    );
    Ok(all_transactions)
}
