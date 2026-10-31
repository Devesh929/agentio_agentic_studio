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

  async loadSampleProject(): Promise<{ project_id: string; name: string }> {
    const res = await fetch(`${API_BASE}/projects/load-sample`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Failed to seed sample personal loan project')
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
}
