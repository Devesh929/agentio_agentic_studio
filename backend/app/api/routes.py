import os
import uuid
import json
import shutil
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.domain import (
    Project, SourceDocument, SourceSpan, Requirement, Question, HumanDecision,
    Artifact, ArtifactVersion, ArtifactEvidenceLink, GenerationRun, AuditEvent
)
from backend.app.schemas.dtos import (
    ProjectCreate, ProjectResponse, AnswerQuestionRequest, ArtifactVersionCreate, GenerationRequest
)
from backend.app.parsers import get_parser_for_file
from backend.app.services.fixture_service import ensure_sample_fixtures
from backend.app.services.extraction_service import ExtractionService
from backend.app.services.generation_service import GenerationService
from backend.app.services.decision_service import DecisionService
from backend.app.services.validation_service import ValidationService
from backend.app.services.groq_service import groq_service

router = APIRouter()

# ----------------- PROJECTS -----------------

@router.post("/projects")
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    proj_id = f"PROJ-{uuid.uuid4().hex[:6].upper()}"
    project = Project(
        id=proj_id,
        name=data.name,
        domain=data.domain,
        description=data.description,
        template=data.template
    )
    db.add(project)
    db.add(AuditEvent(
        id=f"AUD-{uuid.uuid4().hex[:8]}",
        project_id=proj_id,
        actor="System",
        action="CREATE_PROJECT",
        target_type="project",
        target_id=proj_id,
        details={"name": data.name, "domain": data.domain}
    ))
    db.commit()
    db.refresh(project)
    return project

@router.get("/projects")
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    res = []
    for p in projects:
        sources_cnt = db.query(SourceDocument).filter(SourceDocument.project_id == p.id).count()
        reqs_cnt = db.query(Requirement).filter(Requirement.project_id == p.id).count()
        questions_cnt = db.query(Question).filter(Question.project_id == p.id, Question.status == "open").count()
        arts_cnt = db.query(Artifact).filter(Artifact.project_id == p.id).count()
        res.append({
            "id": p.id,
            "name": p.name,
            "domain": p.domain,
            "description": p.description,
            "template": p.template,
            "created_at": p.created_at,
            "sources_count": sources_cnt,
            "requirements_count": reqs_cnt,
            "open_questions_count": questions_cnt,
            "artifacts_count": arts_cnt
        })
    return res

@router.get("/projects/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    sources = db.query(SourceDocument).filter(SourceDocument.project_id == p.id).all()
    requirements = db.query(Requirement).filter(Requirement.project_id == p.id).all()
    questions = db.query(Question).filter(Question.project_id == p.id).all()
    artifacts = db.query(Artifact).filter(Artifact.project_id == p.id).all()
    audit_events = db.query(AuditEvent).filter(AuditEvent.project_id == p.id).order_by(AuditEvent.timestamp.desc()).limit(15).all()

    return {
        "project": p,
        "metrics": {
            "sources_total": len(sources),
            "sources_parsed": len([s for s in sources if s.parse_state == "parsed"]),
            "sources_partial_or_failed": len([s for s in sources if s.parse_state in ["partial", "failed"]]),
            "requirements_total": len(requirements),
            "requirements_confirmed": len([r for r in requirements if r.status == "confirmed"]),
            "requirements_conflict": len([r for r in requirements if r.has_conflict]),
            "questions_open": len([q for q in questions if q.status == "open"]),
            "artifacts_total": len(artifacts),
            "artifacts_approved": len([a for a in artifacts if a.status == "approved"]),
            "artifacts_draft": len([a for a in artifacts if a.status != "approved"])
        },
        "recent_activity": audit_events
    }

@router.post("/projects/load-sample")
def load_sample_project(db: Session = Depends(get_db)):
    # 1. Ensure sample fixture files are generated on disk
    fixtures = ensure_sample_fixtures()

    # 2. Create project
    proj_id = f"PROJ-LOAN-{uuid.uuid4().hex[:4].upper()}"
    project = Project(
        id=proj_id,
        name="Retail Personal Loan Underwriting & CBS Integration",
        domain="Lending",
        description="Azentio Implementation Studio flagship scenario: Translating BRD, rule workbook, and user stories into source-grounded configuration, workflow graph, data mapping, and test boundary matrix.",
        template="Azentio Lending Standard"
    )
    db.add(project)
    db.flush()

    # 3. Add source documents
    files_to_add = [
        ("personal_loan_brd.docx", fixtures["brd"], "BRD / Functional Spec", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        ("loan_parameters.xlsx", fixtures["parameters"], "Product Rules / Parameter Sheet", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        ("user_stories.txt", fixtures["stories"], "User Stories", "text/plain"),
        ("target_loan_config.schema.json", fixtures["schema"], "Target Configuration Schema", "application/json"),
        ("personal_loan_compliance.pdf", fixtures["pdf"], "Other", "application/pdf")
    ]

    for fname, fpath, role, mime in files_to_add:
        parser = get_parser_for_file(fname)
        parse_res = parser.parse(fpath, fname)

        doc_id = f"DOC-{uuid.uuid4().hex[:6].upper()}"
        doc = SourceDocument(
            id=doc_id,
            project_id=proj_id,
            filename=fname,
            role=role,
            mime_type=mime,
            file_size=os.path.getsize(fpath) if os.path.exists(fpath) else 0,
            storage_path=fpath,
            version=1,
            parse_state=parse_res.state,
            page_count=parse_res.report.readable_units,
            worksheet_count=parse_res.report.metadata.get("sheets", []).__len__() if "sheets" in parse_res.report.metadata else 0,
            parse_report=parse_res.report.model_dump(),
            warnings=parse_res.report.warnings
        )
        db.add(doc)
        db.flush()

        for s in parse_res.spans:
            db.add(SourceSpan(
                id=s.id,
                source_id=doc.id,
                locator=s.locator,
                span_type=s.span_type,
                excerpt=s.excerpt,
                metadata_json=s.metadata
            ))

    db.commit()

    # 4. Run automated extraction and reconciliation
    extract_res = ExtractionService.extract_and_reconcile(db=db, project_id=proj_id)

    # 5. Run initial generation of all 4 artefacts
    gen_res = GenerationService.generate_all_artefacts(
        db=db,
        project_id=proj_id,
        prompt="Synthesize Personal Loan implementation artifacts from BRD and Parameter sheets."
    )

    db.add(AuditEvent(
        id=f"AUD-{uuid.uuid4().hex[:8]}",
        project_id=proj_id,
        actor="System",
        action="LOAD_SAMPLE_PROJECT",
        target_type="project",
        target_id=proj_id,
        details={"extraction": extract_res, "generation": gen_res}
    ))
    db.commit()

    return {
        "project_id": proj_id,
        "name": project.name,
        "extraction_summary": extract_res,
        "generation_summary": gen_res
    }

# ----------------- SOURCES -----------------

@router.get("/projects/{project_id}/sources")
def list_project_sources(project_id: str, db: Session = Depends(get_db)):
    sources = db.query(SourceDocument).filter(SourceDocument.project_id == project_id).all()
    return sources

@router.post("/projects/{project_id}/sources")
def upload_source(
    project_id: str,
    file: UploadFile = File(...),
    role: str = Form("BRD / Functional Spec"),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    dest_dir = Path(settings.STORAGE_ROOT) / project_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / file.filename

    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    parser = get_parser_for_file(file.filename)
    parse_res = parser.parse(str(dest_path), file.filename)

    doc_id = f"DOC-{uuid.uuid4().hex[:6].upper()}"
    doc = SourceDocument(
        id=doc_id,
        project_id=project_id,
        filename=file.filename,
        role=role,
        mime_type=file.content_type or "application/octet-stream",
        file_size=os.path.getsize(dest_path),
        storage_path=str(dest_path),
        version=1,
        parse_state=parse_res.state,
        page_count=parse_res.report.readable_units,
        worksheet_count=parse_res.report.metadata.get("sheets", []).__len__() if "sheets" in parse_res.report.metadata else 0,
        parse_report=parse_res.report.model_dump(),
        warnings=parse_res.report.warnings
    )
    db.add(doc)
    db.flush()

    for s in parse_res.spans:
        db.add(SourceSpan(
            id=s.id,
            source_id=doc.id,
            locator=s.locator,
            span_type=s.span_type,
            excerpt=s.excerpt,
            metadata_json=s.metadata
        ))

    db.add(AuditEvent(
        id=f"AUD-{uuid.uuid4().hex[:8]}",
        project_id=project_id,
        actor="User",
        action="UPLOAD_SOURCE_DOCUMENT",
        target_type="source_document",
        target_id=doc.id,
        details={"filename": file.filename, "role": role, "parse_state": parse_res.state}
    ))
    db.commit()
    db.refresh(doc)
    return doc

@router.get("/sources/{source_id}/preview")
def get_source_preview(source_id: str, db: Session = Depends(get_db)):
    doc = db.query(SourceDocument).filter(SourceDocument.id == source_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Source not found")

    spans = db.query(SourceSpan).filter(SourceSpan.source_id == source_id).all()
    raw_text = ""
    if os.path.exists(doc.storage_path):
        parser = get_parser_for_file(doc.filename)
        parse_res = parser.parse(doc.storage_path, doc.filename)
        raw_text = parse_res.raw_text

    return {
        "document": doc,
        "spans": spans,
        "raw_text": raw_text,
        "report": doc.parse_report
    }

@router.get("/sources/{source_id}/parse-report")
def get_source_parse_report(source_id: str, db: Session = Depends(get_db)):
    doc = db.query(SourceDocument).filter(SourceDocument.id == source_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Source not found")
    return {
        "source_id": doc.id,
        "filename": doc.filename,
        "state": doc.parse_state,
        "report": doc.parse_report,
        "warnings": doc.warnings
    }

# ----------------- EXTRACTION & REQUIREMENTS -----------------

@router.post("/projects/{project_id}/extract")
def extract_requirements(project_id: str, db: Session = Depends(get_db)):
    res = ExtractionService.extract_and_reconcile(db=db, project_id=project_id)
    return res

@router.get("/projects/{project_id}/requirements")
def list_requirements(project_id: str, db: Session = Depends(get_db)):
    reqs = db.query(Requirement).filter(Requirement.project_id == project_id).all()
    # Enrich with spans and questions
    enriched = []
    for r in reqs:
        spans = []
        if r.source_span_ids:
            spans = db.query(SourceSpan).filter(SourceSpan.id.in_(r.source_span_ids)).all()
        q_objs = []
        if r.unresolved_question_ids:
            q_objs = db.query(Question).filter(Question.id.in_(r.unresolved_question_ids)).all()
        enriched.append({
            "requirement": r,
            "spans": spans,
            "questions": q_objs
        })
    return enriched

@router.patch("/requirements/{requirement_id}")
def update_requirement(requirement_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    if "statement" in payload:
        req.statement = payload["statement"]
    if "status" in payload:
        req.status = payload["status"]
    if "structured_rule" in payload:
        req.structured_rule = payload["structured_rule"]

    db.add(AuditEvent(
        id=f"AUD-{uuid.uuid4().hex[:8]}",
        project_id=req.project_id,
        actor="Consultant (Local Reviewer)",
        action="UPDATE_REQUIREMENT",
        target_type="requirement",
        target_id=req.id,
        details=payload
    ))
    db.commit()
    db.refresh(req)
    return req

# ----------------- GENERATION WORKBENCH -----------------

@router.post("/projects/{project_id}/generations")
def trigger_generation(project_id: str, payload: GenerationRequest, db: Session = Depends(get_db)):
    res = GenerationService.generate_all_artefacts(
        db=db,
        project_id=project_id,
        prompt=payload.prompt or "Generate implementation artefacts",
        model_profile=payload.model_profile
    )
    return res

@router.get("/generations/{run_id}")
def get_generation_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(GenerationRun).filter(GenerationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Generation run not found")
    return run

@router.get("/generations/{run_id}/events")
def stream_generation_events(run_id: str, db: Session = Depends(get_db)):
    run = db.query(GenerationRun).filter(GenerationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Generation run not found")

    def event_generator():
        events = run.events or [
            {"step": "INTAKE", "message": "Parsing source scopes..."},
            {"step": "RECONCILIATION", "message": "Evaluating requirements & evidence..."},
            {"step": "GENERATION", "message": "Synthesizing configuration & workflow..."},
            {"step": "VALIDATION", "message": "Validating against target schema..."}
        ]
        for ev in events:
            data_str = json.dumps(ev)
            yield f"data: {data_str}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# ----------------- QUESTIONS & REVIEWS -----------------

@router.get("/projects/{project_id}/questions")
def list_questions(project_id: str, db: Session = Depends(get_db)):
    questions = db.query(Question).filter(Question.project_id == project_id).all()
    return questions

@router.post("/questions/{question_id}/answer")
def answer_question(question_id: str, payload: AnswerQuestionRequest, db: Session = Depends(get_db)):
    res = DecisionService.answer_question(
        db=db,
        question_id=question_id,
        selected_option=payload.selected_option,
        free_text_answer=payload.free_text_answer,
        rationale=payload.rationale,
        answered_by=payload.answered_by
    )
    return res

# ----------------- SAVED CONFIGURATIONS & ARTIFACTS -----------------

@router.get("/projects/{project_id}/artifacts")
def list_artifacts(project_id: str, db: Session = Depends(get_db)):
    artifacts = db.query(Artifact).filter(Artifact.project_id == project_id).all()
    res = []
    for a in artifacts:
        latest_version = db.query(ArtifactVersion).filter(
            ArtifactVersion.artifact_id == a.id
        ).order_by(ArtifactVersion.version_number.desc()).first()
        res.append({
            "artifact": a,
            "latest_version": latest_version
        })
    return res

@router.get("/artifacts/{artifact_id}/versions")
def list_artifact_versions(artifact_id: str, db: Session = Depends(get_db)):
    versions = db.query(ArtifactVersion).filter(
        ArtifactVersion.artifact_id == artifact_id
    ).order_by(ArtifactVersion.version_number.desc()).all()
    return versions

@router.get("/artifact-versions/{version_id}")
def get_artifact_version(version_id: str, db: Session = Depends(get_db)):
    v = db.query(ArtifactVersion).filter(ArtifactVersion.id == version_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Artifact version not found")
    links = db.query(ArtifactEvidenceLink).filter(ArtifactEvidenceLink.artifact_version_id == version_id).all()
    return {
        "version": v,
        "evidence_links": links
    }

@router.post("/artifacts/{artifact_id}/versions")
def create_artifact_version(artifact_id: str, payload: ArtifactVersionCreate, db: Session = Depends(get_db)):
    art = db.query(Artifact).filter(Artifact.id == artifact_id).first()
    if not art:
        raise HTTPException(status_code=404, detail="Artifact not found")

    new_v_num = (art.current_version or 1) + 1
    art.current_version = new_v_num
    art.status = "draft"  # Editing always creates an unapproved draft revision!

    # Run validation
    schema_doc = db.query(SourceDocument).filter(
        SourceDocument.project_id == art.project_id,
        SourceDocument.role == "Target Configuration Schema"
    ).first()
    schema_json = None
    if schema_doc and os.path.exists(schema_doc.storage_path):
        try:
            with open(schema_doc.storage_path, "r", encoding="utf-8") as f:
                schema_json = json.load(f)
        except Exception:
            schema_json = None

    val_res = ValidationService.validate_configuration(payload.content_json, schema_json, [])

    new_version = ArtifactVersion(
        id=f"ARTV-{art.artifact_type.upper()}-V{new_v_num}-{uuid.uuid4().hex[:4].upper()}",
        artifact_id=art.id,
        version_number=new_v_num,
        content_json=payload.content_json,
        schema_version="1.0.0",
        status="validated" if val_res.is_valid else "draft",
        validation_summary=val_res.to_dict(),
        author=payload.author,
        change_summary=payload.change_summary,
        is_approved=False
    )
    db.add(new_version)
    db.add(AuditEvent(
        id=f"AUD-{uuid.uuid4().hex[:8]}",
        project_id=art.project_id,
        actor=payload.author,
        action="SAVE_NEW_ARTIFACT_VERSION",
        target_type="artifact_version",
        target_id=new_version.id,
        details={"version_number": new_v_num, "summary": payload.change_summary}
    ))
    db.commit()
    db.refresh(new_version)
    return new_version

@router.post("/artifact-versions/{version_id}/validate")
def revalidate_artifact_version(version_id: str, db: Session = Depends(get_db)):
    v = db.query(ArtifactVersion).filter(ArtifactVersion.id == version_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")

    art = v.artifact
    schema_doc = db.query(SourceDocument).filter(
        SourceDocument.project_id == art.project_id,
        SourceDocument.role == "Target Configuration Schema"
    ).first()
    schema_json = None
    if schema_doc and os.path.exists(schema_doc.storage_path):
        try:
            with open(schema_doc.storage_path, "r", encoding="utf-8") as f:
                schema_json = json.load(f)
        except Exception:
            pass

    links = db.query(ArtifactEvidenceLink).filter(ArtifactEvidenceLink.artifact_version_id == version_id).all()
    link_dicts = [{"target_pointer": l.target_pointer, "provenance_kind": l.provenance_kind} for l in links]

    val_res = ValidationService.validate_configuration(v.content_json, schema_json, link_dicts)
    v.validation_summary = val_res.to_dict()
    v.status = "validated" if val_res.is_valid else "draft"
    db.commit()
    return v.validation_summary

@router.post("/artifact-versions/{version_id}/approve")
def approve_artifact_version(
    version_id: str,
    approver: str = Form("Chief Credit & Risk Officer"),
    db: Session = Depends(get_db)
):
    v = db.query(ArtifactVersion).filter(ArtifactVersion.id == version_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")

    # Check for blocking open questions
    open_questions = db.query(Question).filter(
        Question.project_id == v.artifact.project_id,
        Question.status == "open",
        Question.is_blocking == True
    ).count()

    if open_questions > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve artifact while {open_questions} blocking question(s) remain unresolved."
        )

    v.is_approved = True
    v.status = "approved"
    v.approved_by = approver
    v.approved_at = datetime.datetime.utcnow()
    v.artifact.status = "approved"

    db.add(AuditEvent(
        id=f"AUD-{uuid.uuid4().hex[:8]}",
        project_id=v.artifact.project_id,
        actor=approver,
        action="APPROVE_ARTIFACT_VERSION",
        target_type="artifact_version",
        target_id=v.id,
        details={"version_number": v.version_number}
    ))
    db.commit()
    return {"success": True, "approved_by": approver, "version": v}

@router.get("/artifact-versions/{version_id}/export")
def export_artifact_version(version_id: str, format: str = "json", db: Session = Depends(get_db)):
    v = db.query(ArtifactVersion).filter(ArtifactVersion.id == version_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")

    content = v.content_json
    filename = f"{v.artifact.name.lower().replace(' ', '_')}_v{v.version_number}.{format}"

    if format == "json":
        export_str = json.dumps(content, indent=2)
        return Response(
            content=export_str,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    else:
        export_str = json.dumps(content, indent=2)
        return Response(content=export_str, media_type="text/plain")

# ----------------- TRACEABILITY -----------------

@router.get("/projects/{project_id}/traceability")
def get_traceability(project_id: str, db: Session = Depends(get_db)):
    sources = db.query(SourceDocument).filter(SourceDocument.project_id == project_id).all()
    requirements = db.query(Requirement).filter(Requirement.project_id == project_id).all()
    decisions = db.query(HumanDecision).filter(HumanDecision.project_id == project_id).all()
    artifacts = db.query(Artifact).filter(Artifact.project_id == project_id).all()

    # Get latest artifact versions and their evidence links
    links_all = []
    for art in artifacts:
        latest_v = db.query(ArtifactVersion).filter(ArtifactVersion.artifact_id == art.id).order_by(ArtifactVersion.version_number.desc()).first()
        if latest_v:
            links = db.query(ArtifactEvidenceLink).filter(ArtifactEvidenceLink.artifact_version_id == latest_v.id).all()
            for l in links:
                links_all.append({
                    "artifact_id": art.id,
                    "artifact_name": art.name,
                    "artifact_type": art.artifact_type,
                    "version_number": latest_v.version_number,
                    "target_pointer": l.target_pointer,
                    "provenance_kind": l.provenance_kind,
                    "note": l.note
                })

    return {
        "sources": [{"id": s.id, "filename": s.filename, "role": s.role} for s in sources],
        "requirements": [{"id": r.id, "statement": r.statement, "kind": r.kind, "status": r.status, "has_conflict": r.has_conflict} for r in requirements],
        "decisions": [{"id": d.id, "answered_by": d.answered_by, "answer": d.selected_option or d.free_text_answer} for d in decisions],
        "evidence_links": links_all
    }

# ----------------- SETTINGS & PROVIDERS -----------------

@router.get("/settings/providers/status")
def get_provider_status():
    return groq_service.get_status()

@router.post("/settings/providers/test")
def test_provider_connection():
    return groq_service.test_connection()

@router.get("/settings/models")
def get_available_models():
    status = groq_service.get_status()
    return status["groq"]["available_models"]
