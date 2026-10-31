import pytest
from backend.app.services.validation_service import ValidationService

def test_validation_schema_success():
    schema = {
        "type": "object",
        "required": ["product_id", "eligibility"],
        "properties": {
            "product_id": {"type": "string"},
            "eligibility": {
                "type": "object",
                "required": ["min_age", "max_age"],
                "properties": {
                    "min_age": {"type": "integer"},
                    "max_age": {"type": "integer"}
                }
            }
        }
    }
    content = {
        "product_id": "LOAN-100",
        "eligibility": {"min_age": 21, "max_age": 60}
    }
    evidence = [
        {"target_pointer": "/eligibility/min_age"},
        {"target_pointer": "/eligibility/max_age"}
    ]
    outcome = ValidationService.validate_configuration(content, schema, evidence, 0)
    assert outcome.schema_valid is True
    assert outcome.rule_checks_passed is True
    assert outcome.is_valid is True

def test_validation_logical_failure_min_greater_than_max():
    content = {
        "eligibility": {"min_age": 65, "max_age": 60}
    }
    outcome = ValidationService.validate_configuration(content, None, [], 0)
    assert outcome.rule_checks_passed is False
    assert outcome.is_valid is False
    assert any("cannot be greater than max_age" in e["message"] for e in outcome.errors)

def test_validation_blocking_questions_prevent_validity():
    content = {
        "eligibility": {"min_age": 21, "max_age": 60}
    }
    outcome = ValidationService.validate_configuration(content, None, [], unresolved_blocking_count=2)
    assert outcome.unresolved_questions_count == 2
    assert outcome.is_valid is False
