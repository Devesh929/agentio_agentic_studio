from pathlib import Path
from backend.app.parsers.base import DocumentParser, ParseResult, ParseReport, SpanItem
from backend.app.parsers.docx_parser import DocxParser
from backend.app.parsers.excel_parser import ExcelParser
from backend.app.parsers.pdf_parser import PdfParser
from backend.app.parsers.text_parser import TextParser
from backend.app.parsers.json_parser import JsonParser

def get_parser_for_file(filename: str) -> DocumentParser:
    ext = Path(filename).suffix.lower()
    if ext in [".docx"]:
        return DocxParser()
    elif ext in [".xlsx", ".xls"]:
        return ExcelParser()
    elif ext in [".pdf"]:
        return PdfParser()
    elif ext in [".txt", ".md", ".csv"]:
        return TextParser()
    elif ext in [".json", ".yaml", ".yml"]:
        return JsonParser()
    else:
        return TextParser()
