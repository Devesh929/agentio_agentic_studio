import json
import uuid
from backend.app.parsers.base import DocumentParser, ParseResult, ParseReport, SpanItem

class JsonParser(DocumentParser):
    def parse(self, file_path: str, filename: str) -> ParseResult:
        warnings = []
        errors = []
        spans = []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            return ParseResult(
                success=False,
                state="failed",
                report=ParseReport(
                    readable_units=0,
                    total_units=1,
                    unit_label="json_document",
                    unreadable_units=1,
                    errors=[f"Invalid JSON syntax: {str(e)}"],
                    is_partial=False
                )
            )

        def walk(obj, path=""):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    subpath = f"{path}/{k}"
                    if isinstance(v, (dict, list)):
                        walk(v, subpath)
                    else:
                        spans.append(SpanItem(
                            id=f"SPAN-JSON-{uuid.uuid4().hex[:8]}",
                            locator=subpath,
                            span_type="json_pointer",
                            excerpt=f"{subpath}: {v}",
                            metadata={"pointer": subpath, "value": v}
                        ))
            elif isinstance(obj, list):
                for i, v in enumerate(obj):
                    subpath = f"{path}/{i}"
                    if isinstance(v, (dict, list)):
                        walk(v, subpath)
                    else:
                        spans.append(SpanItem(
                            id=f"SPAN-JSON-{uuid.uuid4().hex[:8]}",
                            locator=subpath,
                            span_type="json_pointer",
                            excerpt=f"{subpath}: {v}",
                            metadata={"pointer": subpath, "value": v}
                        ))

        walk(data)

        is_schema = isinstance(data, dict) and ("$schema" in data or "properties" in data or "type" in data)
        unit_label = "schema_properties" if is_schema else "json_pointers"

        return ParseResult(
            success=True,
            state="parsed",
            spans=spans,
            report=ParseReport(
                readable_units=len(spans),
                total_units=len(spans),
                unit_label=unit_label,
                unreadable_units=0,
                warnings=warnings,
                errors=errors,
                metadata={"is_schema": is_schema, "pointer_count": len(spans)},
                is_partial=False
            ),
            raw_text=json.dumps(data, indent=2)
        )
