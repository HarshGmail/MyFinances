use log::{info, warn};
use regex::Regex;

use crate::error::ParseError;
use crate::models::GoldTransaction;

/// Parse SafeGold Tax Invoice PDFs (from noreply@safegold.in).
/// Ported from backend/src/services/safegoldInvoiceParser.ts
pub fn parse(texts: &[String]) -> Result<Vec<GoldTransaction>, ParseError> {
    let date_re = Regex::new(r"(?i)Date\s*:[\s\n]*(\d{2})-(\d{2})-(\d{4})").unwrap();
    let hsn_re =
        Regex::new(r"(?is)HSN\s*Code\s*:\s*\d+\s+([\s\S]{0,80}?)(?:Applied Tax|Total Invoice)")
            .unwrap();
    let num_re = Regex::new(r"[\d,]+\.?\d*").unwrap();
    let total_re =
        Regex::new(r"(?i)Total Invoice Value[\s\S]{0,30}?(?:₹|Rs\.?)\s*([\d,]+\.?\d*)").unwrap();

    let mut all_transactions = Vec::new();

    for text in texts {
        let lower = text.to_lowercase();

        if !lower.contains("tax invoice") {
            info!("[SafeGold Invoice] Not a Tax Invoice — skipping");
            continue;
        }

        // Date: "Date : 19-01-2026" or "Date :\n19-01-2026"
        let date_str = match date_re.captures(text) {
            Some(caps) => {
                let dd = &caps[1];
                let mm = &caps[2];
                let yyyy = &caps[3];
                format!("{yyyy}-{mm}-{dd}")
            }
            None => {
                warn!("[SafeGold Invoice] Date not found");
                continue;
            }
        };

        // HSN Code line: <grams>  ₹ <rate/g>  ₹ <net>
        let (quantity, gold_price) = match hsn_re.captures(text) {
            Some(caps) => {
                let segment = &caps[1];
                let nums: Vec<f64> = num_re
                    .find_iter(segment)
                    .filter_map(|m| m.as_str().replace(',', "").parse::<f64>().ok())
                    .collect();
                if nums.len() >= 2 {
                    (nums[0], nums[1])
                } else {
                    warn!("[SafeGold Invoice] Could not parse grams/rate from HSN line");
                    continue;
                }
            }
            None => {
                warn!("[SafeGold Invoice] HSN Code line not found");
                continue;
            }
        };

        if quantity == 0.0 || gold_price == 0.0 {
            warn!("[SafeGold Invoice] Zero grams or price, skipping");
            continue;
        }

        // Total Invoice Value
        let amount = match total_re.captures(text) {
            Some(caps) => caps[1].replace(',', "").parse::<f64>().unwrap_or(0.0),
            None => {
                warn!("[SafeGold Invoice] Total Invoice Value not found");
                continue;
            }
        };

        if amount == 0.0 {
            warn!("[SafeGold Invoice] Amount is zero, skipping");
            continue;
        }

        // GST = 3% of net; since total = net × 1.03: GST = total × 3/103
        let tax = (amount * 3.0 / 103.0 * 100.0).round() / 100.0;

        info!(
            "[SafeGold Invoice] Parsed: {}g @ ₹{}/g, total ₹{}, GST ₹{}",
            quantity, gold_price, amount, tax
        );

        all_transactions.push(GoldTransaction {
            date: date_str,
            transaction_type: "credit".to_string(),
            grams: quantity,
            amount,
            gold_price,
            tax,
        });
    }

    info!(
        "[SafeGold Invoice] Extracted {} invoice transactions",
        all_transactions.len()
    );
    Ok(all_transactions)
}
