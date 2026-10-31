import React, { useState, useEffect } from 'react'
import {
  FileText, CheckSquare, Bookmark, HelpCircle, ShieldCheck,
  Upload, Sparkles, ArrowRight, Clock, AlertCircle, CheckCircle2,
  Layers, ChevronRight, ShieldAlert
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Banner with Tasteful Layered Visual (Flat Surface, No Gradient) */}
      <div className="relative rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="max-w-2xl relative z-10 space-y-2.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#D7F4E4] text-[#137A56] text-xs font-semibold">
            <Layers className="w-3.5 h-3.5" />
            <span>Azentio Hackathon Challenge #8</span>
          </div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-[#123D30]">
            Enterprise Implementation Studio
          </h1>
          <p className="text-xs text-slate-700 leading-relaxed">
            Translate BRDs, parameter sheets, and user stories into source-grounded configuration schemas, workflow state machines, field mappings, and boundary test cases.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleLoadSample}
              disabled={loadingSample}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#137A56] hover:bg-[#123D30] text-white text-xs font-medium transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span>{loadingSample ? 'Seeding personal loan scenario...' : 'Load sample personal loan project'}</span>
            </button>
            <button
              onClick={() => setCurrentTab('sources')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-800 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#137A56]" />
              <span>Upload custom inputs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid - Flat surfaces, readable sentence case labels, 12px text */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-600">Source documents</div>
          <div className="text-2xl font-bold text-[#123D30] mt-1">{metrics?.sources_total || 0}</div>
          <div className="text-xs text-emerald-700 mt-1 flex items-center gap-1">
            <span>{metrics?.sources_parsed || 0} parsed</span>
            {metrics?.sources_partial_or_failed ? (
              <span className="text-amber-700 font-medium">({metrics.sources_partial_or_failed} partial)</span>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-600">Extracted rules</div>
          <div className="text-2xl font-bold text-[#123D30] mt-1">{metrics?.requirements_total || 0}</div>
          <div className="text-xs text-slate-700 mt-1">
            {metrics?.requirements_confirmed || 0} confirmed
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-600">Discrepancies</div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{metrics?.requirements_conflict || 0}</div>
          <div className="text-xs text-amber-700 mt-1">
            {metrics?.requirements_conflict ? 'Competing facts' : 'None detected'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-600">Open questions</div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{metrics?.questions_open || 0}</div>
          <div className="text-xs text-amber-700 mt-1">
            {metrics?.questions_open ? 'Blocking decisions' : 'All resolved'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-600">Artefacts</div>
          <div className="text-2xl font-bold text-[#123D30] mt-1">{metrics?.artifacts_total || 0}</div>
          <div className="text-xs text-slate-700 mt-1">Config, workflow, tests</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-600">Approvals</div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{metrics?.artifacts_approved || 0}</div>
          <div className="text-xs text-emerald-700 mt-1">
            {metrics?.artifacts_approved ? 'Signed off' : 'Pending sign-off'}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="text-xs font-bold text-[#123D30]">
            Implementation progression
          </div>

          <div className="space-y-3">
            <div
              onClick={() => setCurrentTab('sources')}
              className="bg-white border border-slate-200 hover:border-[#137A56] p-4 rounded-xl flex items-center justify-between cursor-pointer transition group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-[#F0F5F1] group-hover:bg-[#D7F4E4] text-[#137A56] flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-900 group-hover:text-[#137A56] transition">
                    Inspect & parse sources
                  </h4>
                  <p className="text-xs text-slate-600">
                    Review uploaded documents, worksheet coordinates, formulas and parser warnings.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#137A56] transition" />
            </div>

            <div
              onClick={() => setCurrentTab('questions')}
              className="bg-white border border-slate-200 hover:border-amber-400 p-4 rounded-xl flex items-center justify-between cursor-pointer transition group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 group-hover:bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-900 group-hover:text-amber-900 transition flex items-center gap-2">
                    Resolve ambiguities & contradictions
                    {metrics?.questions_open ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        {metrics.questions_open} action required
                      </span>
                    ) : null}
                  </h4>
                  <p className="text-xs text-slate-600">
                    Address policy discrepancies (such as BRD age 60 vs Excel age 65) with audited human answers.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-800 transition" />
            </div>

            <div
              onClick={() => setCurrentTab('generate')}
              className="bg-white border border-slate-200 hover:border-[#137A56] p-4 rounded-xl flex items-center justify-between cursor-pointer transition group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-[#D7F4E4] text-[#137A56] flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-900 group-hover:text-[#137A56] transition">
                    Generation workbench (Configuration, Workflow, Mapping, Tests)
                  </h4>
                  <p className="text-xs text-slate-600">
                    Generate structured schemas with Monaco editor, React Flow graphs, and boundary test cases.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#137A56] transition" />
            </div>

            <div
              onClick={() => setCurrentTab('saved-configurations')}
              className="bg-white border border-slate-200 hover:border-[#137A56] p-4 rounded-xl flex items-center justify-between cursor-pointer transition group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-[#F0F5F1] group-hover:bg-[#D7F4E4] text-[#137A56] flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-900 group-hover:text-[#137A56] transition">
                    Saved configurations library (Persistent & editable revisions)
                  </h4>
                  <p className="text-xs text-slate-600">
                    Edit JSON, create new version revisions, inspect version diffs, and approve configurations.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#137A56] transition" />
            </div>
          </div>
        </div>

        {/* Right Col: Recent Activity Timeline */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-[#123D30] flex items-center justify-between">
            <span>Audit timeline</span>
            <Clock className="w-3.5 h-3.5 text-slate-600" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {(!detail?.recent_activity || detail.recent_activity.length === 0) && (
              <div className="text-center py-8 text-xs text-slate-600">
                No recent activity recorded yet.
              </div>
            )}
            {detail?.recent_activity?.map((act) => (
              <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-xs">
                    {act.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-700 font-mono">
                    {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : ''}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  Actor: <span className="text-slate-800 font-medium">{act.actor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
