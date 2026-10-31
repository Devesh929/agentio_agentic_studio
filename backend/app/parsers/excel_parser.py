import uuid
from pathlib import Path
import openpyxl
from backend.app.parsers.base import DocumentParser, ParseResult, ParseReport, SpanItem

class ExcelParser(DocumentParser):
    def parse(self, file_path: str, filename: str) -> ParseResult:
        warnings = []
        errors = []
        spans = []
        raw_parts = []

        if filename.lower().endswith(".xls") and not filename.lower().endswith(".xlsx"):
            return ParseResult(
                success=False,
                state="failed",
                report=ParseReport(
                    readable_units=0,
                    total_units=0,
                    unit_label="sheets",
                    unreadable_units=1,
                    errors=["Legacy binary .xls format detected. Please convert to modern .xlsx format for full cell provenance and formula analysis."],
                    is_partial=False
                )
            )

        try:
            wb = openpyxl.load_workbook(file_path, data_only=False)
            wb_data = openpyxl.load_workbook(file_path, data_only=True)
        except Exception as e:
            return ParseResult(
                success=False,
                state="failed",
                report=ParseReport(
                    readable_units=0,
                    total_units=0,
                    unit_label="sheets",
                    unreadable_units=1,
                    errors=[f"Failed to parse Excel workbook: {str(e)}"],
                    is_partial=False
                )
            )

        sheet_names = wb.sheetnames
        total_sheets = len(sheet_names)
        readable_sheets = 0
        hidden_sheets = []

        for name in sheet_names:
            sheet = wb[name]
            sheet_data = wb_data[name]
            if sheet.sheet_state != 'visible':
                hidden_sheets.append(name)
                warnings.append(f"Sheet '{name}' is hidden in workbook.")

            readable_sheets += 1
            max_row = sheet.max_row or 0
            max_col = sheet.max_column or 0

            # Detect merged cells
            merged_ranges = [str(r) for r in sheet.merged_cells.ranges]
            if merged_ranges:
                warnings.append(f"Sheet '{name}' contains merged cells: {', '.join(merged_ranges[:5])}")

            # Inspect header row for duplicates
            header_vals = []
            if max_row >= 1:
                for c in range(1, max_col + 1):
                    val = sheet.cell(row=1, column=c).value
                    if val is not None:
                        header_vals.append(str(val).strip())
                duplicates = set([x for x in header_vals if header_vals.count(x) > 1])
                if duplicates:
                    warnings.append(f"Sheet '{name}' has duplicate header values: {duplicates}")

            # Extract cell spans for non-empty cells
            sheet_rows_text = []
            for r in range(1, min(max_row + 1, 250)):  # limit scan for performance
                row_items = []
                for c in range(1, min(max_col + 1, 50)):
                    cell = sheet.cell(row=r, column=c)
                    val_formula = cell.value
                    cached_val = sheet_data.cell(row=r, column=c).value
                    coord = cell.coordinate  # e.g., "A1", "B4"

                    if val_formula is not None:
                        is_formula = str(val_formula).startswith("=")
                        val_str = str(val_formula)
                        cached_str = str(cached_val) if cached_val is not None else ""

                        cell_text = f"{name}!{coord} = {cached_str or val_str}"
                        if is_formula:
                            cell_text += f" (Formula: {val_str})"
                        
                        row_items.append(f"{coord}:{cached_str or val_str}")

                        spans.append(SpanItem(
                            id=f"SPAN-XLSX-{uuid.uuid4().hex[:8]}",
                            locator=f"{name}!{coord}",
                            span_type="cell",
                            excerpt=f"{name}!{coord}: {cached_str or val_str}" + (f" [Formula: {val_str}]" if is_formula else ""),
                            metadata={
                                "sheet": name,
                                "coordinate": coord,
                                "row": r,
                                "col": c,
                                "formula": val_str if is_formula else None,
                                "cached_value": cached_str,
                                "number_format": cell.number_format
                            }
                        ))
                if row_items:
                    sheet_rows_text.append(f"Row {r}: " + ", ".join(row_items))

            raw_parts.append(f"--- Sheet: {name} ---\n" + "\n".join(sheet_rows_text))

        state = "parsed"
        if len(hidden_sheets) == total_sheets or len(spans) == 0:
            state = "partial"

        return ParseResult(
            success=True,
            state=state,
            spans=spans,
            report=ParseReport(
                readable_units=readable_sheets,
                total_units=total_sheets,
                unit_label="worksheets",
                unreadable_units=0,
                warnings=warnings,
                errors=errors,
                metadata={
                    "sheets": sheet_names,
                    "hidden_sheets": hidden_sheets,
                    "total_cell_spans": len(spans)
                },
                is_partial=(state == "partial")
            ),
            raw_text="\n\n".join(raw_parts)
        )
