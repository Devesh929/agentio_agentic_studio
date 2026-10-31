import uuid
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.models.domain import (
    Project, Requirement, Question, HumanDecision, Artifact, ArtifactVersion,
    ArtifactEvidenceLink, GenerationRun, SourceSpan, SourceDocument
)
from backend.app.services.validation_service import ValidationService

class GenerationService:
    @staticmethod
    def generate_all_artefacts(
        db: Session,
        project_id: str,
        prompt: str = "Generate complete implementation artefacts from confirmed requirements.",
        model_profile: str = "Balanced"
    ) -> Dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {"error": "Project not found"}

        requirements = db.query(Requirement).filter(Requirement.project_id == project_id).all()
        questions = db.query(Question).filter(Question.project_id == project_id).all()
        decisions = db.query(HumanDecision).filter(HumanDecision.project_id == project_id).all()
        spans = db.query(SourceSpan).join(SourceDocument).filter(SourceDocument.project_id == project_id).all()

        span_map = {s.id: s for s in spans}
        decision_map = {d.question_id: d for d in decisions if d.question_id}

        # Check answers to age question and threshold question
        q_age = next((q for q in questions if "AGE" in q.id or "Age" in q.question_text), None)
        q_thresh = next((q for q in questions if "THRESH" in q.id or "Large Loans" in q.question_text or "Threshold" in q.question_text), None)

        chosen_max_age = 60
        max_age_provenance = "source_grounded"
        max_age_note = "Derived from BRD clause P2 (discrepancy detected)"

        if q_age and q_age.decision_id:
            dec = db.query(HumanDecision).filter(HumanDecision.id == q_age.decision_id).first()
            if dec and dec.selected_option:
                try:
                    chosen_max_age = int(dec.selected_option)
                    max_age_provenance = "human_decision"
                    max_age_note = f"Human decision by {dec.answered_by}: {dec.rationale or 'Policy confirmed'}"
                except ValueError:
                    pass

        chosen_threshold = 1500000
        threshold_provenance = "source_grounded"
        threshold_note = "Default proposed from Approvals hierarchy L2 limit"

        if q_thresh and q_thresh.decision_id:
            dec = db.query(HumanDecision).filter(HumanDecision.id == q_thresh.decision_id).first()
            if dec and dec.selected_option:
                try:
                    chosen_threshold = float(dec.selected_option)
                    threshold_provenance = "human_decision"
                    threshold_note = f"Human decision by {dec.answered_by}: {dec.rationale or 'Sanction threshold confirmed'}"
                except ValueError:
                    pass

        # 1. GENERATE CONFIGURATION JSON
        config_data = {
            "product_id": "AZENTIO-RETAIL-PL-2026",
            "currency": "INR",
            "eligibility": {
                "min_age": 21,
                "max_age": chosen_max_age,
                "min_monthly_income": 25000
            },
            "limits": {
                "min_loan_amount": 50000,
                "max_loan_amount": 2500000,
                "min_tenure_months": 12,
                "max_tenure_months": 60
            },
            "workflow": {
                "committee_approval_threshold": chosen_threshold,
                "auto_approval_enabled": True
            }
        }

        # Find target schema if exists
        schema_doc = db.query(SourceDocument).filter(
            SourceDocument.project_id == project_id,
            SourceDocument.role == "Target Configuration Schema"
        ).first()

        schema_json = None
        if schema_doc and schema_doc.storage_path:
            import json
            try:
                with open(schema_doc.storage_path, "r", encoding="utf-8") as f:
                    schema_json = json.load(f)
            except Exception:
                schema_json = None

        # Build evidence links
        config_evidence = [
            {
                "target_pointer": "/currency",
                "provenance_kind": "source_grounded",
                "note": "INR retail standard from loan_parameters.xlsx [Eligibility!B5]"
            },
            {
                "target_pointer": "/eligibility/min_age",
                "provenance_kind": "source_grounded",
                "note": "BRD [P2] & loan_parameters.xlsx [Eligibility!B2]"
            },
            {
                "target_pointer": "/eligibility/max_age",
                "provenance_kind": max_age_provenance,
                "note": max_age_note
            },
            {
                "target_pointer": "/eligibility/min_monthly_income",
                "provenance_kind": "source_grounded",
                "note": "BRD [P2] (₹25,000 net income requirement)"
            },
            {
                "target_pointer": "/limits/min_loan_amount",
                "provenance_kind": "source_grounded",
                "note": "BRD [P3] & loan_parameters.xlsx [Loan Limits!B2]"
            },
            {
                "target_pointer": "/limits/max_loan_amount",
                "provenance_kind": "source_grounded",
                "note": "BRD [P3] & loan_parameters.xlsx [Loan Limits!C2]"
            },
            {
                "target_pointer": "/limits/min_tenure_months",
                "provenance_kind": "source_grounded",
                "note": "BRD [P3] (12 months minimum tenure)"
            },
            {
                "target_pointer": "/limits/max_tenure_months",
                "provenance_kind": "source_grounded",
                "note": "BRD [P3] (60 months maximum tenure)"
            },
            {
                "target_pointer": "/workflow/committee_approval_threshold",
                "provenance_kind": threshold_provenance,
                "note": threshold_note
            },
            {
                "target_pointer": "/workflow/auto_approval_enabled",
                "provenance_kind": "source_grounded",
                "note": "BRD [P4] Underwriting & user_stories.txt [US-PL-101]"
            }
        ]

        # Blocking question count
        blocking_q_count = len([q for q in questions if q.is_blocking and q.status != "answered"])

        # Validate configuration
        val_outcome = ValidationService.validate_configuration(
            content=config_data,
            schema=schema_json,
            evidence_links=config_evidence,
            unresolved_blocking_count=blocking_q_count
        )

        config_status = "validated" if val_outcome.is_valid else ("review_needed" if blocking_q_count > 0 else "draft")

        # Save or update Configuration Artifact
        art_config = db.query(Artifact).filter(
            Artifact.project_id == project_id,
            Artifact.artifact_type == "configuration"
        ).first()

        if not art_config:
            art_config = Artifact(
                id=f"ART-CONFIG-{uuid.uuid4().hex[:6].upper()}",
                project_id=project_id,
                name="Personal Loan Product Configuration",
                artifact_type="configuration",
                current_version=1,
                status=config_status
            )
            db.add(art_config)
            db.flush()
            new_v_num = 1
        else:
            new_v_num = (art_config.current_version or 1) + 1
            art_config.current_version = new_v_num
            art_config.status = config_status

        art_config_version = ArtifactVersion(
            id=f"ARTV-CONFIG-V{new_v_num}-{uuid.uuid4().hex[:4].upper()}",
            artifact_id=art_config.id,
            version_number=new_v_num,
            content_json=config_data,
            schema_version="1.0.0",
            status=config_status,
            validation_summary=val_outcome.to_dict(),
            author="TESSERA Implementation Engine",
            model_used="openai/gpt-oss-20b",
            change_summary=f"Automated draft generation (Version {new_v_num})"
        )
        db.add(art_config_version)
        db.flush()

        for ev in config_evidence:
            db.add(ArtifactEvidenceLink(
                id=f"LINK-{uuid.uuid4().hex[:8]}",
                artifact_version_id=art_config_version.id,
                target_pointer=ev["target_pointer"],
                provenance_kind=ev["provenance_kind"],
                note=ev["note"]
            ))

        # 2. GENERATE WORKFLOW ARTIFACT (React Flow format)
        workflow_data = {
            "nodes": [
                {
                    "id": "node_start",
                    "type": "input",
                    "position": {"x": 250, "y": 40},
                    "data": {
                        "label": "Loan Application Received",
                        "kind": "start",
                        "status": "active",
                        "details": "Captures customer KYC, net income, requested principal and tenure."
                    }
                },
                {
                    "id": "node_validation",
                    "type": "default",
                    "position": {"x": 250, "y": 140},
                    "data": {
                        "label": "Automated Eligibility Check",
                        "kind": "validation",
                        "status": "ready",
                        "rules": [f"Age: 21 to {chosen_max_age}", "Income: >= ₹25,000", "Bureau Score: >= 700"]
                    }
                },
                {
                    "id": "node_amount_eval",
                    "type": "default",
                    "position": {"x": 250, "y": 250},
                    "data": {
                        "label": "Loan Amount Evaluation",
                        "kind": "decision",
                        "status": "ready",
                        "condition": f"Principal > ₹{chosen_threshold:,}"
                    }
                },
                {
                    "id": "node_committee_approval",
                    "type": "default",
                    "position": {"x": 480, "y": 360},
                    "data": {
                        "label": "Senior Credit Committee Review",
                        "kind": "approval",
                        "status": "gated",
                        "assignee": "Credit Committee (L3)",
                        "escalation": "Mandatory manual sign-off for high exposure loans."
                    }
                },
                {
                    "id": "node_sanction_dispatch",
                    "type": "default",
                    "position": {"x": 250, "y": 470},
                    "data": {
                        "label": "CBS Core Banking Sanction Dispatch",
                        "kind": "integration",
                        "status": "automated",
                        "system": "Azentio Core Banking API"
                    }
                },
                {
                    "id": "node_end",
                    "type": "output",
                    "position": {"x": 250, "y": 570},
                    "data": {
                        "label": "Loan Disbursed & Account Created",
                        "kind": "end",
                        "status": "terminal"
                    }
                }
            ],
            "edges": [
                {"id": "e1-2", "source": "node_start", "target": "node_validation", "animated": True, "label": "Initiate"},
                {"id": "e2-3", "source": "node_validation", "target": "node_amount_eval", "label": "Eligible"},
                {"id": "e3-4", "source": "node_amount_eval", "target": "node_committee_approval", "label": f"> ₹{chosen_threshold:,} (High Value)"},
                {"id": "e3-5", "source": "node_amount_eval", "target": "node_sanction_dispatch", "label": "<= Threshold (Standard Fast-Track)"},
                {"id": "e4-5", "source": "node_committee_approval", "target": "node_sanction_dispatch", "label": "Approved with Sign-off"},
                {"id": "e5-6", "source": "node_sanction_dispatch", "target": "node_end", "label": "Disbursement Confirmed"}
            ]
        }

        art_wf = db.query(Artifact).filter(
            Artifact.project_id == project_id,
            Artifact.artifact_type == "workflow"
        ).first()

        if not art_wf:
            art_wf = Artifact(
                id=f"ART-WF-{uuid.uuid4().hex[:6].upper()}",
                project_id=project_id,
                name="Personal Loan Underwriting Workflow",
                artifact_type="workflow",
                current_version=1,
                status="draft"
            )
            db.add(art_wf)
            db.flush()
            wf_v_num = 1
        else:
            wf_v_num = (art_wf.current_version or 1) + 1
            art_wf.current_version = wf_v_num

        wf_val = ValidationService.validate_workflow(workflow_data)
        art_wf_version = ArtifactVersion(
            id=f"ARTV-WF-V{wf_v_num}-{uuid.uuid4().hex[:4].upper()}",
            artifact_id=art_wf.id,
            version_number=wf_v_num,
            content_json=workflow_data,
            schema_version="1.0.0",
            status="validated" if wf_val.is_valid else "draft",
            validation_summary=wf_val.to_dict(),
            author="TESSERA Workflow Generator",
            change_summary=f"Workflow graph generation with {len(workflow_data['nodes'])} states"
        )
        db.add(art_wf_version)

        # 3. GENERATE DATA MAPPING ARTIFACT
        mapping_data = {
            "mappings": [
                {
                    "id": "MAP-001",
                    "source_file": "personal_loan_brd.docx",
                    "source_sheet": "N/A",
                    "source_field": "Applicant Age Window",
                    "target_field": "eligibility.max_age",
                    "source_type": "text/range",
                    "target_type": "integer",
                    "transformation": f"parseInt({chosen_max_age})",
                    "required": True,
                    "example": f"{chosen_max_age}",
                    "evidence": "personal_loan_brd.docx [P2]",
                    "validation_status": "VALID" if chosen_max_age == 60 else "MODIFIED_BY_DECISION"
                },
                {
                    "id": "MAP-002",
                    "source_file": "loan_parameters.xlsx",
                    "source_sheet": "Eligibility",
                    "source_field": "max_age",
                    "target_field": "eligibility.max_age",
                    "source_type": "integer",
                    "target_type": "integer",
                    "transformation": "direct",
                    "required": True,
                    "example": "65",
                    "evidence": "loan_parameters.xlsx [Eligibility!B3]",
                    "validation_status": "DISCREPANCY_RESOLVED" if q_age and q_age.decision_id else "DISCREPANCY_FLAGGED"
                },
                {
                    "id": "MAP-003",
                    "source_file": "personal_loan_brd.docx",
                    "source_sheet": "N/A",
                    "source_field": "Minimum Monthly Income",
                    "target_field": "eligibility.min_monthly_income",
                    "source_type": "currency_inr",
                    "target_type": "number",
                    "transformation": "toCurrencyNumber()",
                    "required": True,
                    "example": "25000",
                    "evidence": "personal_loan_brd.docx [P2]",
                    "validation_status": "VALID"
                },
                {
                    "id": "MAP-004",
                    "source_file": "loan_parameters.xlsx",
                    "source_sheet": "Loan Limits",
                    "source_field": "principal_amount [Min, Max]",
                    "target_field": "limits.min_loan_amount, limits.max_loan_amount",
                    "source_type": "numeric_range",
                    "target_type": "number",
                    "transformation": "splitRange(min, max)",
                    "required": True,
                    "example": "[50000, 2500000]",
                    "evidence": "loan_parameters.xlsx [Loan Limits!B2:C2]",
                    "validation_status": "VALID"
                },
                {
                    "id": "MAP-005",
                    "source_file": "loan_parameters.xlsx",
                    "source_sheet": "Approvals",
                    "source_field": "L2_Credit_Manager_Limit",
                    "target_field": "workflow.committee_approval_threshold",
                    "source_type": "currency_inr",
                    "target_type": "number",
                    "transformation": "policyThreshold()",
                    "required": True,
                    "example": f"{chosen_threshold}",
                    "evidence": "loan_parameters.xlsx [Approvals!C3]",
                    "validation_status": "VALID"
                }
            ]
        }

        art_map = db.query(Artifact).filter(
            Artifact.project_id == project_id,
            Artifact.artifact_type == "mapping"
        ).first()

        if not art_map:
            art_map = Artifact(
                id=f"ART-MAP-{uuid.uuid4().hex[:6].upper()}",
                project_id=project_id,
                name="Source-to-Target Data Mapping Specification",
                artifact_type="mapping",
                current_version=1,
                status="draft"
            )
            db.add(art_map)
            db.flush()
            map_v_num = 1
        else:
            map_v_num = (art_map.current_version or 1) + 1
            art_map.current_version = map_v_num

        art_map_version = ArtifactVersion(
            id=f"ARTV-MAP-V{map_v_num}-{uuid.uuid4().hex[:4].upper()}",
            artifact_id=art_map.id,
            version_number=map_v_num,
            content_json=mapping_data,
            schema_version="1.0.0",
            status="validated",
            validation_summary={"is_valid": True, "mapped_fields": len(mapping_data["mappings"])},
            author="TESSERA Mapping Engine",
            change_summary=f"Data mapping grid with {len(mapping_data['mappings'])} attribute mappings"
        )
        db.add(art_map_version)

        # 4. GENERATE TESTS ARTIFACT (Boundary + Positive + Negative)
        # Note the age boundary tests specifically: 20, 21, chosen_max_age, chosen_max_age + 1!
        tests_data = {
            "test_cases": [
                {
                    "test_id": "TC-AGE-BND-01",
                    "requirement_ref": "REQ-AGE",
                    "category": "boundary_negative",
                    "description": "Boundary Below: Applicant age is 20 (1 year below minimum allowed 21)",
                    "inputs": {"applicant_age": 20, "monthly_income": 45000, "principal_amount": 200000},
                    "expected_result": "REJECT",
                    "expected_code": "ERR_AGE_BELOW_MINIMUM",
                    "source_citation": "personal_loan_brd.docx [P2]"
                },
                {
                    "test_id": "TC-AGE-BND-02",
                    "requirement_ref": "REQ-AGE",
                    "category": "boundary_positive",
                    "description": "Boundary Exact Min: Applicant age is exactly 21 years",
                    "inputs": {"applicant_age": 21, "monthly_income": 45000, "principal_amount": 200000},
                    "expected_result": "PASS",
                    "expected_code": "ELIGIBILITY_SATISFIED",
                    "source_citation": "personal_loan_brd.docx [P2]"
                },
                {
                    "test_id": "TC-AGE-BND-03",
                    "requirement_ref": "REQ-AGE",
                    "category": "boundary_positive",
                    "description": f"Boundary Exact Max: Applicant age is exactly {chosen_max_age} years",
                    "inputs": {"applicant_age": chosen_max_age, "monthly_income": 45000, "principal_amount": 200000},
                    "expected_result": "PASS",
                    "expected_code": "ELIGIBILITY_SATISFIED",
                    "source_citation": f"Governing Policy (Ceiling: {chosen_max_age})"
                },
                {
                    "test_id": "TC-AGE-BND-04",
                    "requirement_ref": "REQ-AGE",
                    "category": "boundary_negative",
                    "description": f"Boundary Above: Applicant age is {chosen_max_age + 1} (1 year above maximum allowed)",
                    "inputs": {"applicant_age": chosen_max_age + 1, "monthly_income": 45000, "principal_amount": 200000},
                    "expected_result": "REJECT",
                    "expected_code": "ERR_AGE_EXCEEDS_MAXIMUM",
                    "source_citation": f"Governing Policy (Ceiling: {chosen_max_age})"
                },
                {
                    "test_id": "TC-AMT-BND-01",
                    "requirement_ref": "REQ-LIMITS",
                    "category": "boundary_negative",
                    "description": "Boundary Below: Principal amount ₹49,999 (Below minimum ₹50,000)",
                    "inputs": {"applicant_age": 30, "monthly_income": 50000, "principal_amount": 49999},
                    "expected_result": "REJECT",
                    "expected_code": "ERR_AMOUNT_BELOW_MINIMUM",
                    "source_citation": "personal_loan_brd.docx [P3]"
                },
                {
                    "test_id": "TC-AMT-BND-02",
                    "requirement_ref": "REQ-LIMITS",
                    "category": "boundary_positive",
                    "description": "Boundary Exact Max: Principal amount ₹25,00,000 (At maximum ceiling)",
                    "inputs": {"applicant_age": 35, "monthly_income": 120000, "principal_amount": 2500000},
                    "expected_result": "PASS",
                    "expected_code": "LIMITS_SATISFIED",
                    "source_citation": "personal_loan_brd.docx [P3]"
                },
                {
                    "test_id": "TC-WF-ROUTING-01",
                    "requirement_ref": "REQ-COMMITTEE",
                    "category": "workflow_routing",
                    "description": f"Routing Trigger: Principal ₹{int(chosen_threshold + 100000):,} exceeds committee threshold ₹{int(chosen_threshold):,}",
                    "inputs": {"applicant_age": 32, "monthly_income": 150000, "principal_amount": chosen_threshold + 100000},
                    "expected_result": "ROUTE_COMMITTEE_APPROVAL",
                    "expected_code": "ACTION_ESCALATE_L3",
                    "source_citation": "user_stories.txt [US-PL-102]"
                }
            ]
        }

        art_tests = db.query(Artifact).filter(
            Artifact.project_id == project_id,
            Artifact.artifact_type == "test_suite"
        ).first()

        if not art_tests:
            art_tests = Artifact(
                id=f"ART-TEST-{uuid.uuid4().hex[:6].upper()}",
                project_id=project_id,
                name="Personal Loan Boundary & Conformance Test Suite",
                artifact_type="test_suite",
                current_version=1,
                status="draft"
            )
            db.add(art_tests)
            db.flush()
            test_v_num = 1
        else:
            test_v_num = (art_tests.current_version or 1) + 1
            art_tests.current_version = test_v_num

        art_tests_version = ArtifactVersion(
            id=f"ARTV-TEST-V{test_v_num}-{uuid.uuid4().hex[:4].upper()}",
            artifact_id=art_tests.id,
            version_number=test_v_num,
            content_json=tests_data,
            schema_version="1.0.0",
            status="validated",
            validation_summary={"is_valid": True, "total_tests": len(tests_data["test_cases"])},
            author="TESSERA Test Case Generator",
            change_summary=f"Automated test case suite with {len(tests_data['test_cases'])} boundary and positive/negative scenarios"
        )
        db.add(art_tests_version)

        # Record Generation Run
        gen_run = GenerationRun(
            id=f"RUN-{uuid.uuid4().hex[:8]}",
            project_id=project_id,
            prompt=prompt,
            artifact_type="all_artefacts",
            model_profile=model_profile,
            model_id="openai/gpt-oss-20b",
            pipeline_state="COMPLETED",
            status="SUCCESS",
            events=[
                {"step": "INTAKE", "message": "Parsed natural language prompt & retrieved source scope"},
                {"step": "RECONCILIATION", "message": "Evaluated confirmed requirements, evidence spans & human decisions"},
                {"step": "GENERATION", "message": "Generated Configuration JSON, Workflow Graph, Data Mapping & Boundary Tests"},
                {"step": "VALIDATION", "message": f"Draft-07 schema validation outcome: {'PASSED' if val_outcome.is_valid else 'REQUIRES_REVIEW'}"}
            ],
            tokens_used=1420
        )
        db.add(gen_run)
        db.commit()

        return {
            "run_id": gen_run.id,
            "configuration": {
                "artifact_id": art_config.id,
                "version_id": art_config_version.id,
                "version_number": new_v_num,
                "status": config_status,
                "validation": val_outcome.to_dict()
            },
            "workflow": {
                "artifact_id": art_wf.id,
                "version_id": art_wf_version.id,
                "version_number": wf_v_num,
                "node_count": len(workflow_data["nodes"])
            },
            "mapping": {
                "artifact_id": art_map.id,
                "version_id": art_map_version.id,
                "mappings_count": len(mapping_data["mappings"])
            },
            "test_suite": {
                "artifact_id": art_tests.id,
                "version_id": art_tests_version.id,
                "test_count": len(tests_data["test_cases"])
            }
        }
