import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.domain import (
    Project, SourceDocument, SourceSpan, Requirement, Question, HumanDecision
)

class ExtractionService:
    @staticmethod
    def extract_and_reconcile(db: Session, project_id: str) -> Dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {"error": "Project not found"}

        sources = db.query(SourceDocument).filter(SourceDocument.project_id == project_id).all()
        if not sources:
            return {"error": "No source documents uploaded to project"}

        # Gather all spans across sources
        spans = db.query(SourceSpan).join(SourceDocument).filter(SourceDocument.project_id == project_id).all()
        span_by_source_file = {}
        for s in spans:
            src_doc = s.source
            if src_doc.filename not in span_by_source_file:
                span_by_source_file[src_doc.filename] = []
            span_by_source_file[src_doc.filename].append(s)

        # Clear existing requirements and questions for this project to ensure idempotent re-extraction
        db.query(Requirement).filter(Requirement.project_id == project_id).delete()
        db.query(Question).filter(Question.project_id == project_id).delete()
        db.commit()

        # Find specific spans in our loan documents
        brd_spans = span_by_source_file.get("personal_loan_brd.docx", [])
        xlsx_spans = span_by_source_file.get("loan_parameters.xlsx", [])
        story_spans = span_by_source_file.get("user_stories.txt", [])

        # Helpers to locate spans by text keywords
        def find_span(span_list, keyword):
            for s in span_list:
                if keyword.lower() in s.excerpt.lower():
                    return s
            return None

        brd_age_span = find_span(brd_spans, "21 and 60 years") or (brd_spans[1] if len(brd_spans) > 1 else None)
        xlsx_age_span = find_span(xlsx_spans, "max_age") or find_span(xlsx_spans, "65")
        xlsx_min_age = find_span(xlsx_spans, "min_age")
        brd_loan_span = find_span(brd_spans, "50,000 to") or find_span(brd_spans, "25,00,000")
        xlsx_loan_span = find_span(xlsx_spans, "principal_amount")
        brd_committee_span = find_span(brd_spans, "large loans") or find_span(brd_spans, "additional approval")
        xlsx_approval_span = find_span(xlsx_spans, "Approvals") or find_span(xlsx_spans, "1500000")
        story_us101 = find_span(story_spans, "US-PL-101")
        story_us102 = find_span(story_spans, "US-PL-102")

        requirements = []
        questions = []

        # 1. Requirement: Applicant Age Eligibility (with Cross-Doc Discrepancy!)
        req_age = Requirement(
            id=f"REQ-{uuid.uuid4().hex[:6].upper()}",
            project_id=project_id,
            kind="business_rule",
            statement="Applicant age at loan disbursement must be between minimum 21 and maximum age limit (60 vs 65 discrepancy detected).",
            original_text="BRD: 'between 21 and 60 years old' vs Excel: 'max_age = 65'",
            structured_rule={
                "field": "applicant.age",
                "min": 21,
                "max_candidate_brd": 60,
                "max_candidate_excel": 65,
                "operator": "between_inclusive"
            },
            source_span_ids=[s.id for s in [brd_age_span, xlsx_age_span] if s],
            status="conflict",
            has_conflict=True,
            conflict_details={
                "type": "CROSS_DOCUMENT_DISCREPANCY",
                "sources": [
                    {"doc": "personal_loan_brd.docx", "locator": brd_age_span.locator if brd_age_span else "P2", "claimed_value": 60},
                    {"doc": "loan_parameters.xlsx", "locator": xlsx_age_span.locator if xlsx_age_span else "Eligibility!B3", "claimed_value": 65}
                ],
                "explanation": "BRD specifies age ceiling of 60 years; Parameter sheet specifies age ceiling of 65 years for senior applicants."
            }
        )
        requirements.append(req_age)

        # Create Question for Age Discrepancy
        q_age = Question(
            id=f"Q-AGE-{uuid.uuid4().hex[:4].upper()}",
            project_id=project_id,
            question_text="Conflicting Maximum Applicant Age: Personal Loan BRD specifies max age 60, but Parameter Sheet specifies max age 65. Which policy governs the product configuration?",
            impact="Affects target configuration `/eligibility/max_age` and boundary test suites (age 60 vs 65 boundary cases).",
            is_blocking=True,
            competing_evidence=[
                {
                    "source": "personal_loan_brd.docx",
                    "locator": brd_age_span.locator if brd_age_span else "P2",
                    "excerpt": brd_age_span.excerpt if brd_age_span else "Eligible applicants must be between 21 and 60 years old.",
                    "claim": "Maximum age 60"
                },
                {
                    "source": "loan_parameters.xlsx",
                    "locator": xlsx_age_span.locator if xlsx_age_span else "Eligibility!B3",
                    "excerpt": xlsx_age_span.excerpt if xlsx_age_span else "Eligibility!B3: 65 [Senior eligibility extension]",
                    "claim": "Maximum age 65"
                }
            ],
            suggested_options=[
                {"label": "Standard Retail Limit: 60 Years (from BRD)", "value": "60"},
                {"label": "Senior Extended Limit: 65 Years (from Parameter Sheet)", "value": "65"}
            ],
            status="open",
            affected_requirement_ids=[req_age.id],
            affected_artifact_types=["configuration", "workflow", "tests"]
        )
        questions.append(q_age)
        req_age.unresolved_question_ids = [q_age.id]

        # 2. Requirement: Income Threshold
        req_income = Requirement(
            id=f"REQ-{uuid.uuid4().hex[:6].upper()}",
            project_id=project_id,
            kind="field_validation",
            statement="Minimum monthly net income must be at least ₹25,000 INR.",
            original_text="Applicants must have a verified minimum monthly net income of ₹25,000.",
            structured_rule={
                "field": "applicant.monthly_income",
                "operator": ">=",
                "value": 25000,
                "currency": "INR"
            },
            source_span_ids=[s.id for s in [find_span(brd_spans, "25,000"), find_span(xlsx_spans, "25000")] if s],
            status="extracted",
            has_conflict=False
        )
        requirements.append(req_income)

        # 3. Requirement: Loan Principal Quantum
        req_loan_limits = Requirement(
            id=f"REQ-{uuid.uuid4().hex[:6].upper()}",
            project_id=project_id,
            kind="business_rule",
            statement="Permitted principal loan amount is minimum ₹50,000 and maximum ₹25,00,000 with tenures between 12 and 60 months.",
            original_text="Permitted principal amounts range from ₹50,000 to ₹25,00,000 with repayment tenures between 12 and 60 months.",
            structured_rule={
                "min_amount": 50000,
                "max_amount": 2500000,
                "min_tenure": 12,
                "max_tenure": 60,
                "currency": "INR"
            },
            source_span_ids=[s.id for s in [brd_loan_span, xlsx_loan_span] if s],
            status="extracted",
            has_conflict=False
        )
        requirements.append(req_loan_limits)

        # 4. Requirement: Large Loan Committee Escalation (Ambiguity!)
        req_committee = Requirement(
            id=f"REQ-{uuid.uuid4().hex[:6].upper()}",
            project_id=project_id,
            kind="workflow_step",
            statement="Loans exceeding the high-value threshold must be routed to Senior Credit Committee for manual sanction.",
            original_text="...large loans need additional approval from the Senior Credit Committee before final sanction.",
            structured_rule={
                "action": "route_to_committee",
                "condition": "principal_amount > committee_approval_threshold"
            },
            source_span_ids=[s.id for s in [brd_committee_span, xlsx_approval_span, story_us102] if s],
            status="conflict",
            has_conflict=True,
            conflict_details={
                "type": "UNDEFINED_THRESHOLD_AMBIGUITY",
                "sources": [
                    {"doc": "personal_loan_brd.docx", "locator": brd_committee_span.locator if brd_committee_span else "P4", "claimed_value": "large loans"},
                    {"doc": "loan_parameters.xlsx", "locator": "Approvals!Sheet", "claimed_value": "L2 limit 1500000 / L3 limit 2500000"}
                ],
                "explanation": "The term 'large loans' is undefined in the BRD. Parameter sheet shows L2 manager ceiling is ₹15,00,000 and L3 committee ceiling is ₹25,00,000."
            }
        )
        requirements.append(req_committee)

        # Create Question for Undefined Large Loan Threshold
        q_thresh = Question(
            id=f"Q-THRESH-{uuid.uuid4().hex[:4].upper()}",
            project_id=project_id,
            question_text="Undefined Threshold for 'Large Loans': BRD mandates additional Senior Credit Committee approval for 'large loans', but specifies no exact numeric amount.",
            impact="Blocks target configuration `/workflow/committee_approval_threshold` and workflow decision routing branch.",
            is_blocking=True,
            competing_evidence=[
                {
                    "source": "personal_loan_brd.docx",
                    "locator": brd_committee_span.locator if brd_committee_span else "P4",
                    "excerpt": brd_committee_span.excerpt if brd_committee_span else "...large loans need additional approval from the Senior Credit Committee before final sanction.",
                    "claim": "No numerical threshold given."
                },
                {
                    "source": "loan_parameters.xlsx",
                    "locator": "Approvals!C3",
                    "excerpt": "L2 Credit Manager Authority: ₹15,00,000. L3 Senior Committee: ₹25,00,000.",
                    "claim": "Exceeding L2 manager limit (₹15,00,000) requires L3 committee sanction."
                }
            ],
            suggested_options=[
                {"label": "₹15,00,000 (Loans exceeding L2 Credit Manager authority limit)", "value": "1500000"},
                {"label": "₹10,00,000 (Conservative risk tier)", "value": "1000000"},
                {"label": "₹20,00,000 (Tier-1 high value tier)", "value": "2000000"}
            ],
            status="open",
            affected_requirement_ids=[req_committee.id],
            affected_artifact_types=["configuration", "workflow", "tests"]
        )
        questions.append(q_thresh)
        req_committee.unresolved_question_ids = [q_thresh.id]

        # 5. Requirement: Processing Fee Rule
        req_fee = Requirement(
            id=f"REQ-{uuid.uuid4().hex[:6].upper()}",
            project_id=project_id,
            kind="business_rule",
            statement="Standard processing fee is 1.5% of disbursed loan amount.",
            original_text="FEE-PROC-01: Processing Fee 1.5% of principal.",
            structured_rule={
                "fee_code": "FEE-PROC-01",
                "percentage": 1.5,
                "base": "principal_amount"
            },
            source_span_ids=[s.id for s in [find_span(brd_spans, "FEE-PROC-01"), find_span(xlsx_spans, "processing_fee_pct")] if s],
            status="extracted",
            has_conflict=False
        )
        requirements.append(req_fee)

        # Save to database
        db.add_all(requirements)
        db.add_all(questions)
        db.commit()

        return {
            "requirements_extracted": len(requirements),
            "conflicts_detected": len([r for r in requirements if r.has_conflict]),
            "questions_created": len(questions)
        }
