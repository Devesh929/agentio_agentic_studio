import uuid
from backend.app.parsers.base import DocumentParser, ParseResult, ParseReport, SpanItem

class TextParser(DocumentParser):
    def parse(self, file_path: str, filename: str) -> ParseResult:
        warnings = []
        errors = []
        spans = []
        raw_lines = []

        encodings = ["utf-8", "utf-8-sig", "latin1"]
        content = None
        for enc in encodings:
            try:
                with open(file_path, "r", encoding=enc) as f:
                    content = f.read()
                break
            except Exception:
                continue

        if content is None:
            return ParseResult(
                success=False,
                state="failed",
                report=ParseReport(
                    readable_units=0,
                    total_units=0,
                    unit_label="lines",
                    unreadable_units=1,
                    errors=["Unable to decode text file with UTF-8 or Latin-1 encodings."],
                    is_partial=False
                )
            )

        lines = content.splitlines()
        total_lines = len(lines)
        readable_lines = 0

        for idx, line in enumerate(lines, start=1):
            text = line.strip()
            if not text:
                continue
            readable_lines += 1
            locator = f"line:{idx}"
            spans.append(SpanItem(
                id=f"SPAN-TXT-{uuid.uuid4().hex[:8]}",
                locator=locator,
                span_type="line",
                excerpt=text,
                metadata={"line_number": idx}
            ))
            raw_lines.append(f"[{locator}] {text}")

        return ParseResult(
            success=True,
            state="parsed",
            spans=spans,
            report=ParseReport(
                readable_units=readable_lines,
                total_units=total_lines,
                unit_label="lines",
                unreadable_units=0,
                warnings=warnings,
                errors=errors,
                metadata={"line_count": total_lines},
                is_partial=False
            ),
            raw_text="\n".join(raw_lines)
        )
