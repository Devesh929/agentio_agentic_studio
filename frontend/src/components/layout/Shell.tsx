import React, { useState, useEffect } from 'react'
import {
  FolderKanban, FileText, Cpu, CheckSquare, Bookmark,
  HelpCircle, ShieldCheck, Settings as SettingsIcon, Search,
  Compass, Moon, Sparkles, Bell, LogOut, Plus, ChevronDown,
  Layers, CheckCircle2, ChevronRight, AlertTriangle
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
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDomain, setNewProjectDomain] = useState('Lending')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)

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

  // Navigation Items categorized into sections matching the portal design
  interface NavItem {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge?: string
    alert?: boolean
  }

  interface NavSection {
    title: string
    items: NavItem[]
  }

  const navSections: NavSection[] = [
    {
      title: 'CORE STUDIO',
      items: [
        { id: 'generate', label: 'Generation Studio', icon: Cpu, badge: 'Qwen 3.8' },
      ]
    },
    {
      title: 'GOVERNANCE & ARTEFACTS',
      items: [
        { id: 'saved-configurations', label: 'Saved Artefacts', icon: Bookmark, badge: activeProject?.artifacts_count ? `${activeProject.artifacts_count}` : undefined },
        { id: 'validation', label: 'Traceability & Audit', icon: ShieldCheck },
      ]
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { id: 'settings', label: 'Providers & Settings', icon: SettingsIcon },
      ]
    }
  ]

  const getBreadcrumb = () => {
    switch (currentTab) {
      case 'generate': return 'Studio  ›  AI Generation & Knowledge Graph'
      case 'saved-configurations': return 'Studio  ›  Saved Artefacts & Version History'
      case 'validation': return 'Studio  ›  Traceability & Verification'
      case 'settings': return 'Studio  ›  Administration & Providers'
      default: return 'Generation Studio'
    }
  }

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${isDarkMode ? 'portal-dark bg-[#102d38] text-[#f0f8f5]' : 'bg-[#edf5ef] text-[#16303d]'}`}>
      
      {/* Floating Rounded Sidebar */}
      <aside className="w-64 my-3.5 ml-3.5 flex-shrink-0 flex flex-col rounded-[25px] glass-strong border border-white/80 shadow-[0_8px_30px_rgb(46_83_68/0.08)] select-none overflow-hidden z-20">
        
        {/* Brand Header: TESSERA / azentio.ai */}
        <div className="p-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* The signature emerald archway symbol from Azentio */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#087553] to-[#14a26b] flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-base text-[#16303d] tracking-tight">TESSERA</span>
                <span className="text-[10px] font-semibold text-[#087553] px-1.5 py-0.2 rounded-full bg-[#d5f4df]">AI</span>
              </div>
              <div className="text-[10px] text-[#627c80] leading-none">Azentio Implementation Studio</div>
            </div>
          </div>
        </div>

        {/* Workspace Card Selector */}
        <div className="px-4 py-2">
          <div className="relative">
            <button
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="w-full p-2.5 rounded-2xl bg-white/80 hover:bg-white border border-white/90 shadow-[0_2px_8px_rgba(50,80,61,0.04)] flex items-center justify-between transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#dcfce7] text-[#15803d] flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {activeProject?.name ? activeProject.name.charAt(0).toUpperCase() : 'T'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs text-[#16303d] truncate">
                    {activeProject ? activeProject.name : 'Select / Create Workspace'}
                  </div>
                  <div className="text-[10px] text-[#627c80] truncate font-medium">
                    {activeProject?.domain ? `${activeProject.domain} Domain` : 'Enterprise Studio'}
                  </div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#627c80] flex-shrink-0 ml-1" />
            </button>

            {/* Dropdown Menu */}
            {showWorkspaceMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-md rounded-2xl border border-white/90 shadow-xl p-2 z-30 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-[#627c80] uppercase tracking-wider flex justify-between items-center">
                  <span>Switch Workspace</span>
                  <button
                    onClick={() => { setShowWorkspaceMenu(false); setShowNewProjectModal(true); }}
                    className="text-[#087553] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New</span>
                  </button>
                </div>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setActiveProject(p); setShowWorkspaceMenu(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between cursor-pointer transition ${
                      activeProject?.id === p.id ? 'bg-[#d5f4df] text-[#087553]' : 'hover:bg-slate-50 text-[#16303d]'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {activeProject?.id === p.id && <CheckCircle2 className="w-3 h-3 text-[#087553]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-5">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#627c80]">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = currentTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                        isActive
                          ? 'portal-nav-active'
                          : 'text-[#48636b] hover:bg-white/50 hover:text-[#16303d]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#087553]' : 'text-[#627c80]'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.alert
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : isActive
                              ? 'bg-[#087553] text-white'
                              : 'bg-white/80 text-[#48636b]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Identity Profile Card at Bottom */}
        <div className="p-3.5 border-t border-white/60 bg-white/40">
          <div className="p-2 rounded-2xl bg-white/70 border border-white/80 shadow-[0_1px_4px_rgba(50,80,61,0.03)] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#55f5b5] text-[#123e2e] flex items-center justify-center font-bold text-xs border border-white flex-shrink-0">
                TL
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-[#16303d] truncate">Implementation Lead</div>
                <div className="text-[10px] text-[#627c80] truncate">Azentio Studio</div>
              </div>
            </div>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="p-1 rounded-lg hover:bg-white text-[#627c80] hover:text-[#16303d] transition cursor-pointer"
              title="Add workspace"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Navbar matching the screenshots */}
        <header className="h-16 px-8 flex items-center justify-between border-b border-[#5c8979]/10 bg-[#edf5ef]/80 backdrop-blur-md select-none z-10">
          {/* Breadcrumb on left */}
          <div className="text-xs text-[#627c80] font-medium flex items-center gap-2">
            <span>{getBreadcrumb()}</span>
          </div>

          {/* Central Search Bar */}
          <div className="w-96 max-w-sm relative hidden md:block">
            <Search className="w-3.5 h-3.5 text-[#627c80] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search your workspace..."
              className="w-full pl-9 pr-4 py-1.5 rounded-full bg-white/70 border border-white/90 text-xs text-[#16303d] placeholder:text-[#627c80] focus:outline-none focus:bg-white shadow-[inset_0_1px_2px_rgba(40,70,55,0.04)]"
            />
          </div>

          {/* Top Right Action Pills */}
          <div className="flex items-center gap-2.5">
            {/* Guide Button */}
            <button className="secondary-pill px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer">
              <Compass className="w-3.5 h-3.5 text-[#087553]" />
              <span>Guide</span>
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-8 h-8 rounded-full secondary-pill flex items-center justify-center cursor-pointer text-[#48636b] hover:text-[#16303d]"
              title="Toggle appearance"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>

            {/* Ask AIRA Button */}
            <button className="secondary-pill px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#087553]" />
              <span>Ask AIRA</span>
            </button>

            {/* Bell with Badge */}
            <div className="relative">
              <button className="w-8 h-8 rounded-full secondary-pill flex items-center justify-center text-[#48636b] cursor-pointer">
                <Bell className="w-3.5 h-3.5" />
              </button>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#087553] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                3
              </span>
            </div>
          </div>
        </header>

        {/* Main Tab Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>

      {/* Create Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="glass rounded-[25px] max-w-md w-full border border-white p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-[#5c8979]/15">
              <h3 className="font-bold text-[#16303d] text-sm">Create New Implementation Workspace</h3>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="text-[#627c80] hover:text-[#16303d] text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#48636b] font-medium mb-1">Workspace / Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Retail Lending Product Modernization"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/80 border border-white/90 rounded-xl focus:outline-none focus:bg-white text-[#16303d]"
                />
              </div>

              <div>
                <label className="block text-[#48636b] font-medium mb-1">Target Enterprise Domain</label>
                <select
                  value={newProjectDomain}
                  onChange={(e) => setNewProjectDomain(e.target.value)}
                  className="w-full px-3 py-2 bg-white/80 border border-white/90 rounded-xl focus:outline-none focus:bg-white text-[#16303d]"
                >
                  <option value="Lending">Lending / Digital Origination</option>
                  <option value="Banking">Core Banking / CBS</option>
                  <option value="Insurance">Insurance Policy Underwriting</option>
                  <option value="ERP">ERP & Enterprise Software</option>
                </select>
              </div>

              <div>
                <label className="block text-[#48636b] font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Implementation scope and target systems..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white/80 border border-white/90 rounded-xl focus:outline-none focus:bg-white text-[#16303d]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="secondary-pill px-4 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="mint-button px-5 py-2 cursor-pointer"
                >
                  {isCreating ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
