from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class SpanItem(BaseModel):
    id: str
    locator: str  # e.g., "P1", "Eligibility!B4", "page:1:block:2", "line:12"
    span_type: str  # paragraph, cell, page_block, line, json_pointer
    excerpt: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ParseReport(BaseModel):
    readable_units: int = 0
    total_units: int = 0
    unit_label: str = "pages"  # pages, sheets, paragraphs, lines
    unreadable_units: int = 0
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    is_partial: bool = False

class ParseResult(BaseModel):
    success: bool
    state: str  # parsed, partial, failed
    spans: List[SpanItem] = Field(default_factory=list)
    report: ParseReport = Field(default_factory=ParseReport)
    raw_text: str = ""

class DocumentParser(ABC):
    @abstractmethod
    def parse(self, file_path: str, filename: str) -> ParseResult:
        pass
