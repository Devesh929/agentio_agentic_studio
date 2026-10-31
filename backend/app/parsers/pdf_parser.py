import uuid
from pathlib import Path
import fitz  # PyMuPDF
from backend.app.parsers.base import DocumentParser, ParseResult, ParseReport, SpanItem

class PdfParser(DocumentParser):
    def parse(self, file_path: str, filename: str) -> ParseResult:
        warnings = []
        errors = []
        spans = []
        raw_parts = []

        try:
            doc = fitz.open(file_path)
        except Exception as e:
            return ParseResult(
                success=False,
                state="failed",
                report=ParseReport(
                    readable_units=0,
                    total_units=0,
                    unit_label="pages",
                    unreadable_units=1,
                    errors=[f"Failed to open PDF document: {str(e)}"],
                    is_partial=False
                )
            )

        total_pages = len(doc)
        readable_pages = 0
        empty_pages = []

        for p_idx in range(total_pages):
            page = doc[p_idx]
            page_num = p_idx + 1
            text = page.get_text("text").strip()
            blocks = page.get_text("blocks")

            if not text and len(blocks) == 0:
                empty_pages.append(page_num)
                continue

            readable_pages += 1
            for b_idx, block in enumerate(blocks):
                # block: (x0, y0, x1, y1, text, block_no, block_type)
                block_text = block[4].strip() if len(block) > 4 else ""
                if not block_text:
                    continue
                locator = f"page:{page_num}:block:{b_idx}"
                spans.append(SpanItem(
                    id=f"SPAN-PDF-{uuid.uuid4().hex[:8]}",
                    locator=locator,
                    span_type="page_block",
                    excerpt=block_text,
                    metadata={
                        "page": page_num,
                        "block_index": b_idx,
                        "bbox": block[:4] if len(block) >= 4 else []
                    }
                ))
            
            raw_parts.append(f"--- Page {page_num} ---\n{text}")

        if empty_pages:
            warnings.append(
                f"Pages {empty_pages} contained no machine-readable text (possible scanned image or bitmap without OCR). LlamaParse adapter recommended for full scan recovery."
            )

        state = "parsed"
        if empty_pages and readable_pages > 0:
            state = "partial"
        elif readable_pages == 0 and total_pages > 0:
            state = "failed"
            errors.append("No readable text found across any pages. Document may be pure scanned images.")

        return ParseResult(
            success=(state != "failed"),
            state=state,
            spans=spans,
            report=ParseReport(
                readable_units=readable_pages,
                total_units=total_pages,
                unit_label="pages",
                unreadable_units=len(empty_pages),
                warnings=warnings,
                errors=errors,
                metadata={"total_pages": total_pages, "empty_pages": empty_pages},
                is_partial=(state == "partial")
            ),
            raw_text="\n\n".join(raw_parts)
        )
