import pytest
from backend.app.services.fixture_service import ensure_sample_fixtures
from backend.app.parsers.docx_parser import DocxParser
from backend.app.parsers.excel_parser import ExcelParser
from backend.app.parsers.pdf_parser import PdfParser
from backend.app.parsers.text_parser import TextParser
from backend.app.parsers.json_parser import JsonParser

@pytest.fixture(scope="module")
def sample_files():
    return ensure_sample_fixtures()

def test_docx_parser(sample_files):
    parser = DocxParser()
    res = parser.parse(sample_files["brd"], "personal_loan_brd.docx")
    assert res.success is True
    assert res.state == "parsed"
    assert len(res.spans) > 0
    # Check that paragraph locators like P1, P2 exist
    locators = [s.locator for s in res.spans]
    assert "P1" in locators
    assert any("21 and 60 years" in s.excerpt for s in res.spans)

def test_excel_parser(sample_files):
    parser = ExcelParser()
    res = parser.parse(sample_files["parameters"], "loan_parameters.xlsx")
    assert res.success is True
    assert res.state == "parsed"
    assert res.report.metadata["sheets"] == ["Eligibility", "Loan Limits", "Approvals"]
    # Check that cell coordinates like Eligibility!B3 exist
    cell_locators = [s.locator for s in res.spans]
    assert any("Eligibility!B" in l for l in cell_locators)
    # Check 65 value
    assert any("65" in s.excerpt for s in res.spans)

def test_pdf_parser_with_partial_warning(sample_files):
    parser = PdfParser()
    res = parser.parse(sample_files["pdf"], "personal_loan_compliance.pdf")
    assert res.success is True
    # The fixture has page 2 as a blank scanned page, so it must report partial state
    assert res.state == "partial"
    assert res.report.unreadable_units == 1
    assert any("no machine-readable text" in w for w in res.report.warnings)

def test_text_parser(sample_files):
    parser = TextParser()
    res = parser.parse(sample_files["stories"], "user_stories.txt")
    assert res.success is True
    assert res.state == "parsed"
    assert len(res.spans) >= 3
    assert any("US-PL-101" in s.excerpt for s in res.spans)

def test_json_parser(sample_files):
    parser = JsonParser()
    res = parser.parse(sample_files["schema"], "target_loan_config.schema.json")
    assert res.success is True
    assert res.state == "parsed"
    assert res.report.metadata["is_schema"] is True
