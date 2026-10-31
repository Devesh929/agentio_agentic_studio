import uuid
import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.domain import Question, HumanDecision, Requirement, Project, AuditEvent
from backend.app.services.generation_service import GenerationService

class DecisionService:
    @staticmethod
    def answer_question(
        db: Session,
        question_id: str,
        selected_option: Optional[str] = None,
        free_text_answer: Optional[str] = None,
        rationale: str = "",
        answered_by: str = "Compliance Officer (Local Reviewer)"
    ) -> Dict[str, Any]:
        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            return {"error": "Question not found"}

        answer_val = selected_option or free_text_answer or ""
        decision_id = f"DEC-{uuid.uuid4().hex[:6].upper()}"

        decision = HumanDecision(
            id=decision_id,
            project_id=question.project_id,
            question_id=question.id,
            answered_by=answered_by,
            selected_option=selected_option,
            free_text_answer=free_text_answer or "",
            rationale=rationale or f"Selected: {answer_val}",
            linked_requirement_ids=question.affected_requirement_ids or []
        )
        db.add(decision)

        question.status = "answered"
        question.answer = answer_val
        question.decision_id = decision_id

        # Update linked requirements
        for req_id in (question.affected_requirement_ids or []):
            req = db.query(Requirement).filter(Requirement.id == req_id).first()
            if req:
                req.status = "confirmed"
                req.has_conflict = False
                if req.unresolved_question_ids and question.id in req.unresolved_question_ids:
                    req.unresolved_question_ids = [qid for qid in req.unresolved_question_ids if qid != question.id]

        # Audit event
        db.add(AuditEvent(
            id=f"AUD-{uuid.uuid4().hex[:8]}",
            project_id=question.project_id,
            actor=answered_by,
            action="RESOLVE_QUESTION_DECISION",
            target_type="question",
            target_id=question.id,
            details={"answer": answer_val, "rationale": rationale, "decision_id": decision_id}
        ))
        db.commit()

        # Regenerate affected artefacts with the new decision incorporated
        gen_result = GenerationService.generate_all_artefacts(
            db=db,
            project_id=question.project_id,
            prompt=f"Regenerate artefacts after resolving question {question.id} with decision: {answer_val}"
        )

        return {
            "success": True,
            "decision_id": decision_id,
            "question_id": question.id,
            "selected_answer": answer_val,
            "generation_result": gen_result
        }
