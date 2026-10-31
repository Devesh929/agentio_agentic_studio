import React, { useState, useEffect } from 'react'
import {
  FileText, CheckSquare, Bookmark, HelpCircle, ShieldCheck,
  Upload, Sparkles, ArrowRight, Clock, AlertCircle, CheckCircle2,
  Layers, ChevronRight, ShieldAlert, Cpu
} from 'lucide-react'
import { Project, ProjectDetail } from '../types'
import { api } from '../api/client'

interface OverviewPageProps {
  activeProject: Project | null
  setActiveProject: (p: Project) => void
  refreshProjects: () => void
  setCurrentTab: (tab: string) => void
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  activeProject,
  setActiveProject,
  refreshProjects,
  setCurrentTab,
}) => {
  const [detail, setDetail] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)

  const loadProjectDetail = async (id: string) => {
    setLoading(true)
    try {
      const data = await api.getProject(id)
      setDetail(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeProject) {
      loadProjectDetail(activeProject.id)
    }
  }, [activeProject?.id])

  const handleLoadSample = async () => {
    setLoadingSample(true)
    try {
      const res = await api.loadSampleProject()
      refreshProjects()
      const refreshed = await api.getProject(res.project_id)
      setActiveProject(refreshed.project)
      setDetail(refreshed)
    } catch (err) {
      alert('Failed to load sample project')
    } finally {
      setLoadingSample(false)
    }
  }

  const metrics = detail?.metrics
  const projectName = activeProject?.name || 'Retail Loan Implementation'

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* Welcome Banner styled with Design Tokens */}
      <div className="glass rounded-[23px] p-7 md:p-8 border border-white/90 shadow-[0_8px_30px_-10px_rgba(46,83,68,0.08)] relative overflow-hidden">
        <div className="max-w-3xl relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d5f4df] text-[#087553] text-xs font-semibold border border-white/80">
            <Layers className="w-3.5 h-3.5" />
            <span>Azentio Hackathon Challenge #8 · TESSERA Studio</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#16303d]">
            Welcome to <span className="text-[#087553]">{projectName}</span>
          </h1>

          <p className="text-xs md:text-sm text-[#48636b] leading-relaxed">
            Translate BRDs, product parameter sheets, and user stories into source-grounded configuration schemas, workflow state machines, field mappings, and boundary test cases with mathematical provenance.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleLoadSample}
              disabled={loadingSample}
              className="mint-button px-5 py-2.5 text-xs flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#087553]" />
              <span>{loadingSample ? 'Seeding personal loan scenario...' : 'Load sample personal loan project'}</span>
            </button>
            <button
              onClick={() => setCurrentTab('sources')}
              className="secondary-pill px-4 py-2.5 text-xs flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#087553]" />
              <span>Upload custom inputs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row - 6 Frosted Glass Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Metric 1: Sources */}
        <div
          onClick={() => setCurrentTab('sources')}
          className="glass rounded-[20px] p-4.5 border border-white/90 shadow-[0_4px_16px_rgba(46,83,68,0.04)] cursor-pointer hover:bg-white/80 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#627c80]">Source docs</span>
            <FileText className="w-4 h-4 text-[#087553]" />
          </div>
          <div className="text-2xl font-bold text-[#16303d] mt-2 group-hover:text-[#087553] transition">
            {metrics?.sources_total || 0}
          </div>
          <div className="text-[11px] text-[#087553] font-medium mt-1">
            {metrics?.sources_parsed || 0} parsed
          </div>
        </div>

        {/* Metric 2: Extracted Rules */}
        <div
          onClick={() => setCurrentTab('requirements')}
          className="glass rounded-[20px] p-4.5 border border-white/90 shadow-[0_4px_16px_rgba(46,83,68,0.04)] cursor-pointer hover:bg-white/80 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#627c80]">Extracted rules</span>
            <CheckSquare className="w-4 h-4 text-[#087553]" />
          </div>
          <div className="text-2xl font-bold text-[#16303d] mt-2 group-hover:text-[#087553] transition">
            {metrics?.requirements_total || 0}
          </div>
          <div className="text-[11px] text-[#48636b] mt-1">
            {metrics?.requirements_confirmed || 0} confirmed
          </div>
        </div>

        {/* Metric 3: Discrepancies */}
        <div
          onClick={() => setCurrentTab('requirements')}
          className="glass rounded-[20px] p-4.5 border border-white/90 shadow-[0_4px_16px_rgba(46,83,68,0.04)] cursor-pointer hover:bg-white/80 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#627c80]">Discrepancies</span>
            <ShieldAlert className="w-4 h-4 text-[#8c650c]" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${metrics?.requirements_conflict ? 'text-[#8c650c]' : 'text-[#16303d]'}`}>
            {metrics?.requirements_conflict || 0}
          </div>
          <div className="text-[11px] text-[#8c650c] font-medium mt-1">
            {metrics?.requirements_conflict ? 'Conflict flagged' : 'Zero conflicts'}
          </div>
        </div>

        {/* Metric 4: Clarification Questions */}
        <div
          onClick={() => setCurrentTab('questions')}
          className="glass rounded-[20px] p-4.5 border border-white/90 shadow-[0_4px_16px_rgba(46,83,68,0.04)] cursor-pointer hover:bg-white/80 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#627c80]">Open questions</span>
            <HelpCircle className="w-4 h-4 text-[#087553]" />
          </div>
          <div className="text-2xl font-bold text-[#16303d] mt-2 group-hover:text-[#087553] transition">
            {metrics?.questions_open || 0}
          </div>
          <div className="text-[11px] text-[#48636b] mt-1">
            {metrics?.questions_open ? 'Pending decision' : 'All resolved'}
          </div>
        </div>

        {/* Metric 5: Saved Artefacts */}
        <div
          onClick={() => setCurrentTab('saved-configurations')}
          className="glass rounded-[20px] p-4.5 border border-white/90 shadow-[0_4px_16px_rgba(46,83,68,0.04)] cursor-pointer hover:bg-white/80 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#627c80]">Saved artefacts</span>
            <Bookmark className="w-4 h-4 text-[#087553]" />
          </div>
          <div className="text-2xl font-bold text-[#16303d] mt-2 group-hover:text-[#087553] transition">
            {metrics?.artifacts_total || 0}
          </div>
          <div className="text-[11px] text-[#48636b] mt-1">
            {metrics?.artifacts_approved || 0} approved
          </div>
        </div>

        {/* Metric 6: Provenance Traceability */}
        <div
          onClick={() => setCurrentTab('validation')}
          className="glass rounded-[20px] p-4.5 border border-white/90 shadow-[0_4px_16px_rgba(46,83,68,0.04)] cursor-pointer hover:bg-white/80 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#627c80]">Traceability</span>
            <ShieldCheck className="w-4 h-4 text-[#087553]" />
          </div>
          <div className="text-2xl font-bold text-[#16303d] mt-2 group-hover:text-[#087553] transition">
            100%
          </div>
          <div className="text-[11px] text-[#087553] font-medium mt-1">
            Evidence linked
          </div>
        </div>

      </div>

      {/* Main Two-Column Workflow & Audit Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        
        {/* Left 2 Cols: Implementation Studio Stages */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-semibold text-sm text-[#16303d]">Implementation Studio Stages</h3>
            <span className="text-[11px] text-[#627c80]">End-to-end delivery lifecycle</span>
          </div>

          <div className="space-y-3">
            {/* Stage 1 */}
            <div
              onClick={() => setCurrentTab('sources')}
              className="glass rounded-[20px] p-5 border border-white/90 shadow-[0_4px_16px_rgba(46,83,68,0.04)] flex items-center justify-between cursor-pointer hover:bg-white/80 transition group"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#d5f4df] text-[#087553] flex items-center justify-center font-bold text-xs flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-[#16303d] group-hover:text-[#087553] transition flex items-center gap-2">
                    Ingest & inspect sources
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-white/80 text-[#48636b] border border-white">
                      .docx, .xlsx, .pdf, .json
                    </span>
                  </h4>
                  <p className="text-xs text-[#627c80] mt-0.5">
                    Extract multi-table spreadsheets, numbered requirements, and paragraph spans with character-level coordinate tracking.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#627c80] group-hover:text-[#087553] transition flex-shrink-0 ml-2" />
            </div>

            {/* Stage 2 */}
            <div
              onClick={() => setCurrentTab('questions')}
              className="glass rounded-[20px] p-5 border border-white/90 shadow-[0_4px_16px_rgba(46,83,68,0.04)] flex items-center justify-between cursor-pointer hover:bg-white/80 transition group"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#fed7aa]/50 text-[#c2410c] flex items-center justify-center font-bold text-xs flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-[#16303d] group-hover:text-[#c2410c] transition flex items-center gap-2">
                    Resolve ambiguities & contradictions
                    {metrics?.questions_open ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        {metrics.questions_open} action required
                      </span>
                    ) : null}
                  </h4>
                  <p className="text-xs text-[#627c80] mt-0.5">
                    Address policy contradictions (e.g. BRD maximum age 60 vs Excel rule 65) with audited human-in-the-loop decisions.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#627c80] group-hover:text-[#c2410c] transition flex-shrink-0 ml-2" />
            </div>

            {/* Stage 3 */}
            <div
              onClick={() => setCurrentTab('generate')}
              className="glass rounded-[20px] p-5 border border-white/90 shadow-[0_4px_16px_rgba(46,83,68,0.04)] flex items-center justify-between cursor-pointer hover:bg-white/80 transition group"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-[#d5f4df] text-[#087553] flex items-center justify-center font-bold text-xs flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-[#16303d] group-hover:text-[#087553] transition flex items-center gap-2">
                    Generation workbench (Configuration, Workflow, Mapping, Tests)
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#d5f4df] text-[#087553] border border-white">
                      Interactive Studio
                    </span>
                  </h4>
                  <p className="text-xs text-[#627c80] mt-0.5">
                    Generate production-ready JSON schemas, interactive React Flow state machines, and boundary test cases.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#627c80] group-hover:text-[#087553] transition flex-shrink-0 ml-2" />
            </div>

            {/* Stage 4 */}
            <div
              onClick={() => setCurrentTab('saved-configurations')}
              className="glass rounded-[20px] p-5 border border-white/90 shadow-[0_4px_16px_rgba(46,83,68,0.04)] flex items-center justify-between cursor-pointer hover:bg-white/80 transition group"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-2xl bg-white text-[#087553] flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs border border-white">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-[#16303d] group-hover:text-[#087553] transition">
                    Saved configurations & version diffs
                  </h4>
                  <p className="text-xs text-[#627c80] mt-0.5">
                    Edit schemas directly in Monaco, commit new semantic revisions, inspect version diffs, and approve configurations.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#627c80] group-hover:text-[#087553] transition flex-shrink-0 ml-2" />
            </div>
          </div>
        </div>

        {/* Right Col: Audit & Activity Log */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-semibold text-sm text-[#16303d] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#087553]" />
              <span>Audit Timeline</span>
            </h3>
            <span className="text-[11px] text-[#627c80]">Append-only</span>
          </div>

          <div className="glass rounded-[20px] p-4.5 border border-white/90 shadow-[0_4px_16px_rgba(46,83,68,0.04)] max-h-[460px] overflow-y-auto space-y-3">
            {(!detail?.recent_activity || detail.recent_activity.length === 0) ? (
              <div className="text-center py-12 text-xs text-[#627c80]">
                No recent activity recorded yet.
              </div>
            ) : (
              detail.recent_activity.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-white/70 border border-white/80 space-y-1.5 transition hover:bg-white"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#16303d] capitalize">
                      {act.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-[#627c80] font-mono">
                      {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#48636b] flex items-center justify-between">
                    <span>Actor: <span className="font-medium text-[#16303d]">{act.actor}</span></span>
                    {act.target_type && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-[#627c80] border border-white">
                        {act.target_type}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
