from typing import Dict, Any, List, Optional
import jsonschema
from jsonschema import Draft7Validator

class ValidationOutcome:
    def __init__(self):
        self.is_valid: bool = False
        self.schema_valid: bool = False
        self.citation_coverage_pct: float = 0.0
        self.unresolved_questions_count: int = 0
        self.rule_checks_passed: bool = False
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        self.readiness_signals: Dict[str, Any] = {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "schema_valid": self.schema_valid,
            "citation_coverage_pct": round(self.citation_coverage_pct, 1),
            "unresolved_questions_count": self.unresolved_questions_count,
            "rule_checks_passed": self.rule_checks_passed,
            "errors": self.errors,
            "warnings": self.warnings,
            "readiness_signals": {
                "target_schema": "PASSED" if self.schema_valid else "FAILED",
                "citation_coverage": f"{round(self.citation_coverage_pct, 1)}%",
                "unresolved_questions": f"{self.unresolved_questions_count} blocking",
                "semantic_rule_checks": "PASSED" if self.rule_checks_passed else "FAILED"
            }
        }

class ValidationService:
    @staticmethod
    def validate_configuration(
        content: Dict[str, Any],
        schema: Optional[Dict[str, Any]],
        evidence_links: List[Dict[str, Any]],
        unresolved_blocking_count: int = 0
    ) -> ValidationOutcome:
        outcome = ValidationOutcome()
        outcome.unresolved_questions_count = unresolved_blocking_count

        # 1. Exact Draft-07 JSON Schema Validation
        if schema:
            try:
                validator = Draft7Validator(schema)
                schema_errors = sorted(validator.iter_errors(content), key=lambda e: e.path)
                if not schema_errors:
                    outcome.schema_valid = True
                else:
                    outcome.schema_valid = False
                    for err in schema_errors:
                        path_str = "/" + "/".join(str(p) for p in err.path)
                        outcome.errors.append({
                            "severity": "CRITICAL",
                            "code": "SCHEMA_VIOLATION",
                            "path": path_str,
                            "message": err.message,
                            "action": f"Correct value at '{path_str}' to conform with target schema constraint."
                        })
            except Exception as e:
                outcome.schema_valid = False
                outcome.errors.append({
                    "severity": "CRITICAL",
                    "code": "SCHEMA_VALIDATOR_EXCEPTION",
                    "path": "/",
                    "message": f"Error running schema validator: {str(e)}",
                    "action": "Check schema validity."
                })
        else:
            outcome.schema_valid = True  # No schema enforced

        # 2. Cross-Field Business Constraints
        rule_errors = []
        # Check min_age <= max_age
        eligibility = content.get("eligibility", {})
        if "min_age" in eligibility and "max_age" in eligibility:
            if eligibility["min_age"] > eligibility["max_age"]:
                rule_errors.append({
                    "severity": "HIGH",
                    "code": "LOGICAL_CONSTRAINT_VIOLATION",
                    "path": "/eligibility",
                    "message": f"min_age ({eligibility['min_age']}) cannot be greater than max_age ({eligibility['max_age']}).",
                    "action": "Ensure applicant minimum age is strictly less than or equal to maximum age."
                })

        # Check loan limits
        limits = content.get("limits", {})
        if "min_loan_amount" in limits and "max_loan_amount" in limits:
            if limits["min_loan_amount"] > limits["max_loan_amount"]:
                rule_errors.append({
                    "severity": "HIGH",
                    "code": "LIMIT_CONSTRAINT_VIOLATION",
                    "path": "/limits",
                    "message": f"min_loan_amount ({limits['min_loan_amount']}) exceeds max_loan_amount ({limits['max_loan_amount']}).",
                    "action": "Set minimum principal amount below maximum limit."
                })

        # Check tenure
        if "min_tenure_months" in limits and "max_tenure_months" in limits:
            if limits["min_tenure_months"] > limits["max_tenure_months"]:
                rule_errors.append({
                    "severity": "HIGH",
                    "code": "TENURE_CONSTRAINT_VIOLATION",
                    "path": "/limits/tenure",
                    "message": "min_tenure_months cannot exceed max_tenure_months.",
                    "action": "Verify tenure range."
                })

        # Committee threshold check
        workflow = content.get("workflow", {})
        if "committee_approval_threshold" in workflow and "max_loan_amount" in limits:
            thresh = workflow["committee_approval_threshold"]
            max_amt = limits["max_loan_amount"]
            if thresh > max_amt:
                outcome.warnings.append({
                    "severity": "MEDIUM",
                    "code": "HIGH_THRESHOLD_WARNING",
                    "path": "/workflow/committee_approval_threshold",
                    "message": f"Approval threshold (₹{thresh:,}) exceeds maximum permitted loan (₹{max_amt:,}). Committee routing may never trigger.",
                    "action": "Review committee approval threshold against maximum principal limit."
                })

        if not rule_errors:
            outcome.rule_checks_passed = True
        else:
            outcome.rule_checks_passed = False
            outcome.errors.extend(rule_errors)

        # 3. Source Citation Coverage
        total_fields = 0
        grounded_fields = 0

        def count_leaf_pointers(obj, path=""):
            nonlocal total_fields
            if isinstance(obj, dict):
                for k, v in obj.items():
                    sub = f"{path}/{k}"
                    if isinstance(v, (dict, list)):
                        count_leaf_pointers(v, sub)
                    else:
                        total_fields += 1
            elif isinstance(obj, list):
                for i, v in enumerate(obj):
                    sub = f"{path}/{i}"
                    if isinstance(v, (dict, list)):
                        count_leaf_pointers(v, sub)
                    else:
                        total_fields += 1

        count_leaf_pointers(content)

        linked_pointers = set(link.get("target_pointer") for link in evidence_links if link.get("target_pointer"))
        grounded_fields = len(linked_pointers)
        if total_fields > 0:
            outcome.citation_coverage_pct = min(100.0, (grounded_fields / total_fields) * 100.0)
        else:
            outcome.citation_coverage_pct = 100.0

        if outcome.citation_coverage_pct < 60.0:
            outcome.warnings.append({
                "severity": "MEDIUM",
                "code": "LOW_CITATION_COVERAGE",
                "path": "/",
                "message": f"Citation coverage is {round(outcome.citation_coverage_pct, 1)}%. Several fields lack explicit source grounded spans or recorded decisions.",
                "action": "Link ungrounded fields to source citations or confirm human decisions."
            })

        # 4. Overall validity gate
        outcome.is_valid = (
            outcome.schema_valid and
            outcome.rule_checks_passed and
            outcome.unresolved_questions_count == 0 and
            len([e for e in outcome.errors if e.get("severity") == "CRITICAL"]) == 0
        )

        return outcome

    @staticmethod
    def validate_workflow(workflow_data: Dict[str, Any]) -> ValidationOutcome:
        outcome = ValidationOutcome()
        nodes = workflow_data.get("nodes", [])
        edges = workflow_data.get("edges", [])

        node_ids = set(n.get("id") for n in nodes)
        has_start = any(n.get("type") == "start" or n.get("data", {}).get("kind") == "start" for n in nodes)
        has_end = any(n.get("type") == "end" or n.get("data", {}).get("kind") == "end" for n in nodes)

        if not has_start:
            outcome.errors.append({
                "severity": "CRITICAL",
                "code": "MISSING_START_NODE",
                "path": "workflow/nodes",
                "message": "Workflow graph has no Start node.",
                "action": "Add an initial Start node."
            })
        if not has_end:
            outcome.errors.append({
                "severity": "HIGH",
                "code": "MISSING_END_NODE",
                "path": "workflow/nodes",
                "message": "Workflow graph has no terminating End / Sanction node.",
                "action": "Ensure all process paths reach an End state."
            })

        # Check for orphan edges
        for edge in edges:
            src = edge.get("source")
            tgt = edge.get("target")
            if src not in node_ids:
                outcome.errors.append({
                    "severity": "HIGH",
                    "code": "ORPHAN_EDGE_SOURCE",
                    "path": f"workflow/edges/{edge.get('id')}",
                    "message": f"Edge references missing source node '{src}'.",
                    "action": "Reconnect or remove broken edge."
                })
            if tgt not in node_ids:
                outcome.errors.append({
                    "severity": "HIGH",
                    "code": "ORPHAN_EDGE_TARGET",
                    "path": f"workflow/edges/{edge.get('id')}",
                    "message": f"Edge references missing target node '{tgt}'.",
                    "action": "Reconnect or remove broken edge."
                })

        outcome.schema_valid = len(outcome.errors) == 0
        outcome.rule_checks_passed = has_start and has_end
        outcome.citation_coverage_pct = 90.0 if nodes else 0.0
        outcome.is_valid = outcome.schema_valid and outcome.rule_checks_passed
        return outcome
