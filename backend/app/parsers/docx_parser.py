import uuid
from pathlib import Path
from docx import Document
from backend.app.parsers.base import DocumentParser, ParseResult, ParseReport, SpanItem

class DocxParser(DocumentParser):
    def parse(self, file_path: str, filename: str) -> ParseResult:
        warnings = []
        errors = []
        spans = []
        raw_parts = []

        try:
            doc = Document(file_path)
        except Exception as e:
            return ParseResult(
                success=False,
                state="failed",
                report=ParseReport(
                    readable_units=0,
                    total_units=0,
                    unit_label="paragraphs",
                    unreadable_units=1,
                    errors=[f"Failed to open DOCX file: {str(e)}"],
                    is_partial=False
                )
            )

        para_count = 0
        for i, para in enumerate(doc.paragraphs, start=1):
            text = para.text.strip()
            if not text:
                continue
            para_count += 1
            locator = f"P{i}"
            spans.append(SpanItem(
                id=f"SPAN-DOCX-{uuid.uuid4().hex[:8]}",
                locator=locator,
                span_type="paragraph",
                excerpt=text,
                metadata={"paragraph_index": i, "style": para.style.name if para.style else "Normal"}
            ))
            raw_parts.append(f"[{locator}] {text}")

        # Extract tables
        table_count = len(doc.tables)
        for t_idx, table in enumerate(doc.tables, start=1):
            for r_idx, row in enumerate(table.rows, start=1):
                row_texts = [cell.text.strip() for cell in row.cells]
                row_str = " | ".join(row_texts)
                if not any(row_texts):
                    continue
                locator = f"T{t_idx}:R{r_idx}"
                spans.append(SpanItem(
                    id=f"SPAN-DOCX-{uuid.uuid4().hex[:8]}",
                    locator=locator,
                    span_type="table_row",
                    excerpt=row_str,
                    metadata={"table_index": t_idx, "row_index": r_idx, "cells": row_texts}
                ))
                raw_parts.append(f"[{locator}] {row_str}")

        if para_count == 0 and table_count == 0:
            warnings.append("Document appears to be empty or contains only non-text media.")

        total_units = para_count + table_count
        state = "parsed"
        if warnings and total_units == 0:
            state = "partial"

        return ParseResult(
            success=True,
            state=state,
            spans=spans,
            report=ParseReport(
                readable_units=total_units,
                total_units=total_units,
                unit_label="paragraphs/tables",
                unreadable_units=0,
                warnings=warnings,
                errors=errors,
                metadata={"paragraph_count": para_count, "table_count": table_count},
                is_partial=(state == "partial")
            ),
            raw_text="\n".join(raw_parts)
        )
