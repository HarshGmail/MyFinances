use regex::Regex;

use crate::error::ParseError;
use crate::models::EpfTransaction;

fn parse_amount(s: &str) -> f64 {
    s.replace(',', "").trim().parse::<f64>().unwrap_or(0.0)
}

/// Extract establishment name from passbook header text.
/// Line format: "Establishment ID/Name  APHYD0061879000 / FACT SET SYSTEMS INDIA PVT., LTD.,"
fn extract_establishment_name(text: &str) -> String {
    let re = Regex::new(r"Establishment ID/Name\s+[A-Z0-9]+\s*/\s*(.+)").unwrap();
    re.captures(text)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().trim().trim_end_matches(',').trim().to_string())
        .unwrap_or_default()
}

/// Extract UAN from passbook header text.
fn extract_uan(text: &str) -> String {
    let re = Regex::new(r"\bUAN\s+(\d{10,12})\b").unwrap();
    re.captures(text)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_default()
}

/// Parse EPFO passbook PDF text into EPF transactions.
///
/// EPFO passbook transaction row columns:
///   WageMonth | CreditDate | Type | Particulars | WagesEPF | WagesEPS | EmpContrib | EmpContrib | Pension
///
/// Example row:
///   Oct-2024  13-11-2024  CR  Cont. For Due-Month 112024  33,250  0  3,990  3,990  0
pub fn parse(texts: &[String]) -> Result<Vec<EpfTransaction>, ParseError> {
    // Transaction row: WageMonth CreditDate CR Cont. For Due-Month CODE WagesEPF WagesEPS EmpContrib EmpContrib Pension
    let txn_re = Regex::new(
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})\s+(\d{1,2})-(\d{2})-(\d{4})\s+CR\s+Cont\.\s*For\s+Due-Month\s+(\d+)\s+[\d,]+\s+[\d,]+\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)",
    )
    .map_err(|e| ParseError::Extraction(e.to_string()))?;

    let mut transactions = Vec::new();

    for text in texts {
        let establishment_name = extract_establishment_name(text);
        let uan = extract_uan(text);

        for caps in txn_re.captures_iter(text) {
            let month_abbr = &caps[1];
            let wage_year = &caps[2];
            let credit_day: u8 = caps[3].parse().unwrap_or(1);
            let credit_month = &caps[4];
            let credit_year = &caps[5];
            let due_code = &caps[6];
            let employee_share = parse_amount(&caps[7]);
            let employer_share = parse_amount(&caps[8]);
            let pension_share = parse_amount(&caps[9]);

            let wage_month = format!("{}-{}", month_abbr, wage_year);
            let date = format!("{:02}-{}-{}", credit_day, credit_month, credit_year);
            let description = format!("Cont. For Due-Month {}", due_code);

            transactions.push(EpfTransaction {
                wage_month,
                date,
                description,
                transaction_type: "credit".to_string(),
                employee_share,
                employer_share,
                pension_share,
                balance: 0.0,
                credit_day,
                establishment_name: establishment_name.clone(),
                uan: uan.clone(),
            });
        }
    }

    Ok(transactions)
}
