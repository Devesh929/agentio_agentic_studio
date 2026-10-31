import React, { useState, useEffect } from 'react'
import {
  FolderKanban, FileText, Cpu, CheckSquare, Bookmark,
  HelpCircle, ShieldCheck, Settings as SettingsIcon, ChevronRight,
  Database, AlertTriangle, Layers, Plus, Sparkles
} from 'lucide-react'
import { Project } from '../../types'
import { api } from '../../api/client'

interface ShellProps {
  currentTab: string
  setCurrentTab: (tab: string) => void
  activeProject: Project | null
  setActiveProject: (p: Project | null) => void
  projects: Project[]
  refreshProjects: () => void
  openQuestionsCount?: number
  conflictsCount?: number
  children: React.ReactNode
}

export const Shell: React.FC<ShellProps> = ({
  currentTab,
  setCurrentTab,
  activeProject,
  setActiveProject,
  projects,
  refreshProjects,
  openQuestionsCount = 0,
  conflictsCount = 0,
  children,
}) => {
  const [providerStatus, setProviderStatus] = useState<any>(null)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDomain, setNewProjectDomain] = useState('Lending')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    api.getProviderStatus().then(setProviderStatus).catch(() => {})
  }, [])

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return
    setIsCreating(true)
    try {
      const proj = await api.createProject({
        name: newProjectName,
        domain: newProjectDomain,
        description: newProjectDesc,
      })
      setShowNewProjectModal(false)
      setNewProjectName('')
      setNewProjectDesc('')
      refreshProjects()
      setActiveProject(proj)
    } catch (err) {
      alert('Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }

  const navItems = [
    { id: 'overview', label: 'Projects / Overview', icon: FolderKanban },
    { id: 'sources', label: 'Sources', icon: FileText, count: activeProject?.sources_count },
    { id: 'generate', label: 'Generate', icon: Cpu, highlight: true },
    { id: 'requirements', label: 'Requirements', icon: CheckSquare, badge: conflictsCount > 0 ? `${conflictsCount} conflict` : undefined },
    { id: 'saved-configurations', label: 'Saved Configurations', icon: Bookmark, count: activeProject?.artifacts_count },
    { id: 'questions', label: 'Questions & Reviews', icon: HelpCircle, badge: openQuestionsCount > 0 ? `${openQuestionsCount} open` : undefined, alert: openQuestionsCount > 0 },
    { id: 'validation', label: 'Validation & Traceability', icon: ShieldCheck },
    { id: 'settings', label: 'Settings / Integrations', icon: SettingsIcon },
  ]

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7FAF8] text-[#18312B]">
      {/* Left Sidebar Rail */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-[#1e4836]/10 bg-white/95 backdrop-blur-md select-none">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#137A56] flex items-center justify-center text-white font-bold">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#123D30] leading-none flex items-center gap-1.5">
                TESSERA
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#D7F4E4] text-[#137A56]">
                  Studio
                </span>
              </div>
              <div className="text-[11px] text-slate-600 mt-1 font-medium">Implementation Studio</div>
            </div>
          </div>
        </div>

        {/* Project Selector Box */}
        <div className="p-4 border-b border-slate-200 bg-[#F0F5F1]/50">
          <div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Active project</span>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="text-[#137A56] hover:text-[#123D30] p-1 rounded hover:bg-[#D7F4E4]/60 transition cursor-pointer"
              title="Create new project"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <select
            value={activeProject?.id || ''}
            onChange={(e) => {
              const selected = projects.find((p) => p.id === e.target.value)
              if (selected) setActiveProject(selected)
            }}
            className="w-full text-xs font-medium bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#137A56]"
          >
            {projects.length === 0 && <option value="">No projects available</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#137A56] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-[#F0F5F1] hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      item.alert
                        ? isActive
                          ? 'bg-amber-400 text-slate-900'
                          : 'bg-amber-100 text-amber-800'
                        : isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* System Status Footer */}
        <div className="p-4 border-t border-slate-200 text-xs text-slate-700 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${providerStatus?.offline_mode_active ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span className="font-medium">{providerStatus?.offline_mode_active ? 'Offline demo mode' : 'Groq online'}</span>
            </span>
            <span className="text-xs text-slate-600 font-mono">v1.0.0</span>
          </div>
          <div className="text-xs text-slate-600 truncate mt-1">
            {activeProject ? `${activeProject.domain} Implementation` : 'Ready'}
          </div>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Context Header */}
        <header className="h-14 border-b border-[#1e4836]/10 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <div className="font-semibold text-sm text-[#123D30]">
              {activeProject ? activeProject.name : 'No Project Selected'}
            </div>
            {activeProject && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#F0F5F1] text-[#137A56] font-medium border border-[#1e4836]/10">
                {activeProject.domain}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {providerStatus?.offline_mode_active && (
              <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Deterministic Synthetic Fixtures Active</span>
              </div>
            )}
            <div className="text-xs text-[#64736D] px-2 py-1 rounded bg-[#F0F5F1]">
              Azentio Challenge #8
            </div>
          </div>
        </header>

        {/* Dynamic Main Workspace Tab */}
        <main className="flex-1 overflow-y-auto bg-[#F7FAF8]">
          {children}
        </main>
      </div>

      {/* Create Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 text-sm">Create New Implementation Project</h3>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Retail Lending Product Modernization"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#137A56]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Target Enterprise Domain</label>
                <select
                  value={newProjectDomain}
                  onChange={(e) => setNewProjectDomain(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#137A56]"
                >
                  <option value="Lending">Lending / Digital Origination</option>
                  <option value="Banking">Core Banking / CBS</option>
                  <option value="Insurance">Insurance Policy Underwriting</option>
                  <option value="ERP">ERP & Enterprise Finance</option>
                  <option value="Other">Custom Implementation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Project implementation scope and target systems..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#137A56]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-1.5 rounded-lg bg-[#137A56] text-white text-xs font-medium hover:bg-[#123D30] transition shadow-sm"
                >
                  {isCreating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
