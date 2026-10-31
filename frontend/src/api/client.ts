import {
  Project, ProjectDetail, SourceDocument, Requirement, Question,
  Artifact, ArtifactVersion, ProviderStatus
} from '../types'

const API_BASE = '/api'

export const api = {
  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`)
    if (!res.ok) throw new Error('Failed to load projects')
    return res.json()
  },

  async getProject(id: string): Promise<ProjectDetail> {
    const res = await fetch(`${API_BASE}/projects/${id}`)
    if (!res.ok) throw new Error('Failed to load project details')
    return res.json()
  },

  async createProject(data: { name: string; domain: string; description?: string }): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create project')
    return res.json()
  },

  async loadSampleProject(projectId?: string): Promise<{ project_id: string; name: string }> {
    const url = projectId ? `${API_BASE}/projects/load-sample?project_id=${encodeURIComponent(projectId)}` : `${API_BASE}/projects/load-sample`
    const res = await fetch(url, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Failed to seed sample personal loan project')
    return res.json()
  },

  async clearProject(projectId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/clear`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Failed to clear project data')
    return res.json()
  },

  // Sources
  async getProjectSources(projectId: string): Promise<SourceDocument[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/sources`)
    if (!res.ok) throw new Error('Failed to load sources')
    return res.json()
  },

  async uploadSource(projectId: string, file: File, role: string): Promise<SourceDocument> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('role', role)

    const res = await fetch(`${API_BASE}/projects/${projectId}/sources`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) throw new Error('Failed to upload source file')
    return res.json()
  },

  async getSourcePreview(sourceId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/sources/${sourceId}/preview`)
    if (!res.ok) throw new Error('Failed to load source preview')
    return res.json()
  },

  // Requirements
  async extractRequirements(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/extract`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Extraction failed')
    return res.json()
  },

  async getRequirements(projectId: string): Promise<Array<{ requirement: Requirement; spans: any[]; questions: any[] }>> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/requirements`)
    if (!res.ok) throw new Error('Failed to load requirements')
    return res.json()
  },

  async updateRequirement(id: string, payload: Partial<Requirement>): Promise<Requirement> {
    const res = await fetch(`${API_BASE}/requirements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to update requirement')
    return res.json()
  },

  // Generation
  async triggerGeneration(projectId: string, prompt: string, modelProfile: string = 'Balanced'): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model_profile: modelProfile }),
    })
    if (!res.ok) throw new Error('Generation failed')
    return res.json()
  },

  // Questions & Reviews
  async getQuestions(projectId: string): Promise<Question[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/questions`)
    if (!res.ok) throw new Error('Failed to load questions')
    return res.json()
  },

  async answerQuestion(
    questionId: string,
    payload: { selected_option?: string; free_text_answer?: string; rationale?: string; answered_by?: string }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/questions/${questionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to answer question')
    return res.json()
  },

  // Artifacts & Saved Configurations
  async getArtifacts(projectId: string): Promise<Array<{ artifact: Artifact; latest_version: ArtifactVersion }>> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/artifacts`)
    if (!res.ok) throw new Error('Failed to load artifacts')
    return res.json()
  },

  async getArtifactVersions(artifactId: string): Promise<ArtifactVersion[]> {
    const res = await fetch(`${API_BASE}/artifacts/${artifactId}/versions`)
    if (!res.ok) throw new Error('Failed to load artifact versions')
    return res.json()
  },

  async getArtifactVersionDetail(versionId: string): Promise<{ version: ArtifactVersion; evidence_links: any[] }> {
    const res = await fetch(`${API_BASE}/artifact-versions/${versionId}`)
    if (!res.ok) throw new Error('Failed to load version detail')
    return res.json()
  },

  async saveNewArtifactVersion(
    artifactId: string,
    contentJson: any,
    changeSummary: string = 'Consultant revision'
  ): Promise<ArtifactVersion> {
    const res = await fetch(`${API_BASE}/artifacts/${artifactId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_json: contentJson, change_summary: changeSummary }),
    })
    if (!res.ok) throw new Error('Failed to save new artifact version')
    return res.json()
  },

  async validateArtifactVersion(versionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/artifact-versions/${versionId}/validate`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Validation failed')
    return res.json()
  },

  async approveArtifactVersion(versionId: string, approver: string): Promise<any> {
    const formData = new FormData()
    formData.append('approver', approver)
    const res = await fetch(`${API_BASE}/artifact-versions/${versionId}/approve`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Approval failed')
    }
    return res.json()
  },

  // Traceability
  async getTraceability(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/traceability`)
    if (!res.ok) throw new Error('Failed to load traceability graph')
    return res.json()
  },

  // Settings
  async getProviderStatus(): Promise<ProviderStatus> {
    const res = await fetch(`${API_BASE}/settings/providers/status`)
    if (!res.ok) throw new Error('Failed to load provider status')
    return res.json()
  },

  async testProviderConnection(): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/providers/test`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Connection test failed')
    return res.json()
  },

  // Knowledge Graph & Qwen Agent Pipeline
  async buildParentDoc(projectId: string, prompt?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/build-parent-doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt || '' }),
    })
    if (!res.ok) throw new Error('Failed to build unified parent document')
    return res.json()
  },

  async getKnowledgeGraph(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/knowledge-graph`)
    if (!res.ok) throw new Error('Failed to load knowledge graph')
    return res.json()
  },

  async agentAnalyze(projectId: string, prompt: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/agent/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) throw new Error('Agent analysis failed')
    return res.json()
  },

  async agentSynthesize(projectId: string, prompt: string, userAnswers: Record<string, string>): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/agent/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, user_answers: userAnswers }),
    })
    if (!res.ok) throw new Error('Agent synthesis failed')
    return res.json()
  },

  // Level 2 Executable Testing & Scenario Runner
  async getLevel2Scenarios(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/level2/scenarios`)
    if (!res.ok) throw new Error('Failed to load Level 2 scenarios')
    return res.json()
  },

  async runLevel2Scenario(caseId: string, config?: any): Promise<any> {
    const res = await fetch(`${API_BASE}/level2/scenarios/${caseId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    })
    if (!res.ok) throw new Error(`Failed to run scenario ${caseId}`)
    return res.json()
  },

  async runAllLevel2Scenarios(config?: any): Promise<any> {
    const res = await fetch(`${API_BASE}/level2/scenarios/run-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    })
    if (!res.ok) throw new Error('Failed to run all scenarios')
    return res.json()
  },

  async validateLevel2Config(configuration?: any): Promise<any> {
    const res = await fetch(`${API_BASE}/level2/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configuration }),
    })
    if (!res.ok) throw new Error('Validation failed')
    return res.json()
  },

  async validateLevel2Mappings(useInvalidFixture: boolean = false): Promise<any> {
    const res = await fetch(`${API_BASE}/level2/mappings/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ use_invalid_fixture: useInvalidFixture }),
    })
    if (!res.ok) throw new Error('Mapping validation failed')
    return res.json()
  },

  async applyLevel2ChangeRequest(): Promise<any> {
    const res = await fetch(`${API_BASE}/level2/change-request/apply`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Failed to apply policy change request')
    return res.json()
  },

  async rollbackLevel2ChangeRequest(): Promise<any> {
    const res = await fetch(`${API_BASE}/level2/change-request/rollback`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Failed to rollback policy change')
    return res.json()
  },
}
