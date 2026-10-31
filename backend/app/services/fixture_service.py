import json
from pathlib import Path
import docx
import openpyxl
import fitz
from backend.app.core.config import BASE_DIR

FIXTURES_DIR = BASE_DIR / "fixtures" / "sample_loan_project"

def ensure_sample_fixtures() -> dict:
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    created_files = {}

    # 1. personal_loan_brd.docx
    brd_path = FIXTURES_DIR / "personal_loan_brd.docx"
    doc = docx.Document()
    doc.add_heading("Azentio Financial Services — Personal Loan Product BRD (v2.4)", 0)
    doc.add_paragraph("1. Project Context and Product Scope")
    doc.add_paragraph(
        "This Business Requirements Document defines underwriting rules and target parameters for the retail Personal Loan product."
    )
    doc.add_paragraph("2. Applicant Eligibility Rules")
    doc.add_paragraph(
        "Eligible applicants must be between 21 and 60 years old at the time of disbursement. "
        "Applicants must have a verified minimum monthly net income of ₹25,000."
    )
    doc.add_paragraph("3. Loan Quantum and Tenure Limits")
    doc.add_paragraph(
        "Permitted principal amounts range from ₹50,000 to ₹25,00,000 with repayment tenures between 12 and 60 months."
    )
    doc.add_paragraph("4. Approval Hierarchy and Escalations")
    doc.add_paragraph(
        "Applications with satisfactory bureau scores are auto-decisioned. "
        "However, large loans need additional approval from the Senior Credit Committee before final sanction."
    )
    table = doc.add_table(rows=1, cols=3)
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = "Fee Code"
    hdr_cells[1].text = "Description"
    hdr_cells[2].text = "Value"
    row = table.add_row().cells
    row[0].text = "FEE-PROC-01"
    row[1].text = "Processing Fee"
    row[2].text = "1.5% of principal"
    doc.save(str(brd_path))
    created_files["brd"] = str(brd_path)

    # 2. loan_parameters.xlsx
    xlsx_path = FIXTURES_DIR / "loan_parameters.xlsx"
    wb = openpyxl.Workbook()
    # Sheet 1: Eligibility
    ws1 = wb.active
    ws1.title = "Eligibility"
    ws1.append(["Parameter", "Value", "Notes"])
    ws1.append(["min_age", 21, "Disbursement minimum age"])
    ws1.append(["max_age", 65, "Senior eligibility extension (Discrepancy with BRD 60)"])
    ws1.append(["min_monthly_income", 25000, "INR net income requirement"])
    ws1.append(["currency", "INR", "Standard retail denomination"])

    # Sheet 2: Loan Limits
    ws2 = wb.create_sheet(title="Loan Limits")
    ws2.append(["Parameter", "Min Value", "Max Value", "Unit"])
    ws2.append(["principal_amount", 50000, 2500000, "INR"])
    ws2.append(["tenure_months", 12, 60, "Months"])
    ws2.append(["processing_fee_pct", 1.0, 2.5, "Percentage"])

    # Sheet 3: Approvals
    ws3 = wb.create_sheet(title="Approvals")
    ws3.append(["Tier", "Role", "Max Limit", "Routing"])
    ws3.append(["L1", "Loan Officer", 500000, "Branch Review"])
    ws3.append(["L2", "Credit Manager", 1500000, "Regional Hub"])
    ws3.append(["L3", "Senior Credit Committee", 2500000, "Central Committee"])
    wb.save(str(xlsx_path))
    created_files["parameters"] = str(xlsx_path)

    # 3. user_stories.txt
    txt_path = FIXTURES_DIR / "user_stories.txt"
    txt_content = """# User Stories and Acceptance Criteria — Personal Loan Underwriting

[US-PL-101] Automated Eligibility Validation
As a Credit Analyst, I want the system to automatically validate applicant age (21 to max permitted age) and income so that unqualified leads are stopped early.
Acceptance Criteria:
- Reject application if applicant_age < 21.
- Reject application if applicant_age > max_age.
- Reject application if monthly_income < 25,000 INR.

[US-PL-102] Senior Committee Routing for High-Value Loans
As a Senior Credit Manager, I want loans exceeding the large loan threshold to be routed to the Senior Credit Committee before sanction.
Acceptance Criteria:
- Flag application as high-value when principal exceeds committee threshold.
- Block disbursement until explicit committee approval signature is logged.

[US-PL-103] Audit and Traceability
As a Compliance Officer, I want every rule check to cite its originating policy document.
"""
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(txt_content)
    created_files["stories"] = str(txt_path)

    # 4. target_loan_config.schema.json
    schema_path = FIXTURES_DIR / "target_loan_config.schema.json"
    schema_data = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "AzentioPersonalLoanConfig",
        "type": "object",
        "required": ["product_id", "currency", "eligibility", "limits", "workflow"],
        "properties": {
            "product_id": {"type": "string"},
            "currency": {"type": "string", "enum": ["INR", "USD", "EUR"]},
            "eligibility": {
                "type": "object",
                "required": ["min_age", "max_age", "min_monthly_income"],
                "properties": {
                    "min_age": {"type": "integer", "minimum": 18, "maximum": 70},
                    "max_age": {"type": "integer", "minimum": 18, "maximum": 75},
                    "min_monthly_income": {"type": "number", "minimum": 10000}
                }
            },
            "limits": {
                "type": "object",
                "required": ["min_loan_amount", "max_loan_amount", "min_tenure_months", "max_tenure_months"],
                "properties": {
                    "min_loan_amount": {"type": "number", "minimum": 10000},
                    "max_loan_amount": {"type": "number", "maximum": 10000000},
                    "min_tenure_months": {"type": "integer", "minimum": 6},
                    "max_tenure_months": {"type": "integer", "maximum": 120}
                }
            },
            "workflow": {
                "type": "object",
                "required": ["committee_approval_threshold", "auto_approval_enabled"],
                "properties": {
                    "committee_approval_threshold": {"type": "number", "minimum": 100000},
                    "auto_approval_enabled": {"type": "boolean"}
                }
            }
        }
    }
    with open(schema_path, "w", encoding="utf-8") as f:
        json.dump(schema_data, f, indent=2)
    created_files["schema"] = str(schema_path)

    # 5. personal_loan_compliance.pdf (with an empty scanned page to demonstrate partial parse warnings)
    pdf_path = FIXTURES_DIR / "personal_loan_compliance.pdf"
    doc_pdf = fitz.open()
    # Page 1: Text
    page1 = doc_pdf.new_page(width=595, height=842)
    page1.insert_text((50, 72), "Azentio Personal Loan Underwriting Compliance Standard", fontsize=16)
    page1.insert_text((50, 110), "Section 1: Statutory Age Limits", fontsize=12)
    page1.insert_text((50, 130), "Disbursement age window is strictly 21 to 60 years. Age 65 requires special executive waiver.", fontsize=10)
    page1.insert_text((50, 160), "Section 2: Minimum Income Guidelines", fontsize=12)
    page1.insert_text((50, 180), "Salaried applicants must have confirmed minimum net income of INR 25,000.", fontsize=10)
    # Page 2: Blank scanned page (to trigger unreadable page / OCR warning)
    doc_pdf.new_page(width=595, height=842)
    doc_pdf.save(str(pdf_path))
    doc_pdf.close()
    created_files["pdf"] = str(pdf_path)

    return created_files
