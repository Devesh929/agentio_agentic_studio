import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.database import Base
from backend.app.models.domain import Project, SourceDocument, SourceSpan
from backend.app.parsers.docx_parser import DocxParser
from backend.app.parsers.excel_parser import ExcelParser
from backend.app.services.fixture_service import ensure_sample_fixtures
from backend.app.services.extraction_service import ExtractionService
from backend.app.services.decision_service import DecisionService
from backend.app.services.generation_service import GenerationService

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_conflict_detection_and_resolution_flow(db_session):
    fixtures = ensure_sample_fixtures()
    project = Project(id="TEST-PROJ-1", name="Test Loan Project", domain="Lending")
    db_session.add(project)
    db_session.commit()

    # Parse and insert BRD
    docx_parser = DocxParser()
    brd_res = docx_parser.parse(fixtures["brd"], "personal_loan_brd.docx")
    brd_doc = SourceDocument(
        id="DOC-BRD", project_id=project.id, filename="personal_loan_brd.docx",
        role="BRD / Functional Spec", storage_path=fixtures["brd"], parse_state="parsed"
    )
    db_session.add(brd_doc)
    db_session.flush()
    for s in brd_res.spans:
        db_session.add(SourceSpan(id=s.id, source_id=brd_doc.id, locator=s.locator, span_type=s.span_type, excerpt=s.excerpt))

    # Parse and insert XLSX
    xlsx_parser = ExcelParser()
    xlsx_res = xlsx_parser.parse(fixtures["parameters"], "loan_parameters.xlsx")
    xlsx_doc = SourceDocument(
        id="DOC-XLSX", project_id=project.id, filename="loan_parameters.xlsx",
        role="Product Rules / Parameter Sheet", storage_path=fixtures["parameters"], parse_state="parsed"
    )
    db_session.add(xlsx_doc)
    db_session.flush()
    for s in xlsx_res.spans:
        db_session.add(SourceSpan(id=s.id, source_id=xlsx_doc.id, locator=s.locator, span_type=s.span_type, excerpt=s.excerpt))

    db_session.commit()

    # 1. Run extraction
    ext_res = ExtractionService.extract_and_reconcile(db_session, project.id)
    assert ext_res["conflicts_detected"] >= 1
    assert ext_res["questions_created"] >= 1

    # 2. Verify questions
    from backend.app.models.domain import Question
    questions = db_session.query(Question).filter(Question.project_id == project.id).all()
    age_q = next((q for q in questions if "Conflicting Maximum Applicant Age" in q.question_text), None)
    assert age_q is not None
    assert len(age_q.competing_evidence) == 2
    assert age_q.status == "open"

    # 3. Answer question
    ans_res = DecisionService.answer_question(
        db=db_session,
        question_id=age_q.id,
        selected_option="60",
        rationale="Stick with conservative retail age ceiling of 60."
    )
    assert ans_res["success"] is True

    # 4. Check that configuration artifact incorporates 60 with human_decision provenance
    from backend.app.models.domain import Artifact, ArtifactVersion, ArtifactEvidenceLink
    config_art = db_session.query(Artifact).filter(Artifact.project_id == project.id, Artifact.artifact_type == "configuration").first()
    assert config_art is not None
    latest_v = db_session.query(ArtifactVersion).filter(ArtifactVersion.artifact_id == config_art.id).first()
    assert latest_v.content_json["eligibility"]["max_age"] == 60

    links = db_session.query(ArtifactEvidenceLink).filter(ArtifactEvidenceLink.artifact_version_id == latest_v.id).all()
    age_link = next((l for l in links if l.target_pointer == "/eligibility/max_age"), None)
    assert age_link is not None
    assert age_link.provenance_kind == "human_decision"
