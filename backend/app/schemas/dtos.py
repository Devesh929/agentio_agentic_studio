from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ProjectCreate(BaseModel):
    name: str
    domain: str = "Lending"
    description: str = ""
    template: str = "standard"

class ProjectResponse(BaseModel):
    id: str
    name: str
    domain: str
    description: str
    template: str
    created_at: Any
    sources_count: int = 0
    requirements_count: int = 0
    open_questions_count: int = 0
    artifacts_count: int = 0

class AnswerQuestionRequest(BaseModel):
    selected_option: Optional[str] = None
    free_text_answer: Optional[str] = None
    rationale: str = ""
    answered_by: str = "Compliance Officer (Local Reviewer)"

class ArtifactVersionCreate(BaseModel):
    content_json: Dict[str, Any]
    change_summary: str = "User edited configuration draft"
    author: str = "Implementation Consultant"

class GenerationRequest(BaseModel):
    prompt: str = ""
    artifact_type: str = "all"
    model_profile: str = "Balanced"
