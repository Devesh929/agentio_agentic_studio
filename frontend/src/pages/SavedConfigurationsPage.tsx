import React, { useState, useEffect } from 'react'
import {
  Bookmark, FileJson, GitFork, Table as TableIcon, ShieldCheck,
  History, CheckCircle2, AlertTriangle, Download, RefreshCw, Save,
  Check, ArrowLeft, Clock, User, Eye, FileDiff
} from 'lucide-react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import { Project, Artifact, ArtifactVersion } from '../types'
import { api } from '../api/client'

interface SavedConfigurationsPageProps {
  activeProject: Project | null
}

export const SavedConfigurationsPage: React.FC<SavedConfigurationsPageProps> = ({ activeProject }) => {
  const [artifacts, setArtifacts] = useState<Array<{ artifact: Artifact; latest_version: ArtifactVersion }>>([])
  const [loading, setLoading] = useState(false)
  const [selectedArtifactItem, setSelectedArtifactItem] = useState<{ artifact: Artifact; latest_version: ArtifactVersion } | null>(null)
  const [versions, setVersions] = useState<ArtifactVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<ArtifactVersion | null>(null)
  const [compareVersion, setCompareVersion] = useState<ArtifactVersion | null>(null)
  const [showDiffView, setShowDiffView] = useState(false)

  // Editor content
  const [editorText, setEditorText] = useState('')
  const [isSavingNewVersion, setIsSavingNewVersion] = useState(false)
  const [saveNote, setSaveNote] = useState('Consultant revision')
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false)

  const loadArtifacts = async () => {
    if (!activeProject) return
    setLoading(true)
    try {
      const data = await api.getArtifacts(activeProject.id)
      setArtifacts(data)
      if (data.length > 0 && !selectedArtifactItem) {
        handleSelectArtifact(data[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadArtifacts()
  }, [activeProject?.id])

  const handleSelectArtifact = async (item: { artifact: Artifact; latest_version: ArtifactVersion }) => {
    setSelectedArtifactItem(item)
    setSelectedVersion(item.latest_version)
    setShowDiffView(false)
    if (item.latest_version?.content_json) {
      setEditorText(JSON.stringify(item.latest_version.content_json, null, 2))
    }
    try {
      const vList = await api.getArtifactVersions(item.artifact.id)
      setVersions(vList)
      if (vList.length > 1) {
        setCompareVersion(vList[1])
      } else {
        setCompareVersion(null)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSelectSpecificVersion = (v: ArtifactVersion) => {
    setSelectedVersion(v)
    if (v.content_json) {
      setEditorText(JSON.stringify(v.content_json, null, 2))
    }
  }

  const handleSaveNewVersion = async () => {
    if (!selectedArtifactItem) return
    setIsSavingNewVersion(true)
    try {
      const parsed = JSON.parse(editorText)
      const newVersion = await api.saveNewArtifactVersion(
        selectedArtifactItem.artifact.id,
        parsed,
        saveNote || 'Manual version update'
      )
      setSaveSuccessMsg(true)
      setTimeout(() => setSaveSuccessMsg(false), 3000)
      await loadArtifacts()
      const vList = await api.getArtifactVersions(selectedArtifactItem.artifact.id)
      setVersions(vList)
      setSelectedVersion(newVersion)
    } catch (err) {
      alert('Failed to save version (check JSON syntax): ' + (err as Error).message)
    } finally {
      setIsSavingNewVersion(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedVersion) return
    try {
      await api.approveArtifactVersion(selectedVersion.id, 'Chief Credit Officer')
      alert(`Version ${selectedVersion.version_number} has been officially approved!`)
      await loadArtifacts()
    } catch (err: any) {
      alert('Approval blocked: ' + err.message)
    }
  }

  const handleExport = (format: string = 'json') => {
    if (!selectedVersion) return
    const blob = new Blob([editorText], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedArtifactItem?.artifact.name.toLowerCase().replace(/\s+/g, '_')}_v${selectedVersion.version_number}.${format}`
    a.click()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#16303d] tracking-tight">Saved Configurations & Artefact Library</h1>
          <p className="text-xs text-[#627c80] mt-0.5">
            Dedicated persistent repository for generated configurations, workflows, and mappings with full revision history.
          </p>
        </div>

        <button
          onClick={loadArtifacts}
          className="secondary-pill px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Artifacts Shelf / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {artifacts.map((item) => {
          const isSelected = selectedArtifactItem?.artifact.id === item.artifact.id
          const art = item.artifact
          const isApproved = art.status === 'approved'

          return (
            <div
              key={art.id}
              onClick={() => handleSelectArtifact(item)}
              className={`p-4.5 rounded-[20px] border cursor-pointer transition shadow-2xs space-y-2 ${
                isSelected
                  ? 'glass border-[#087553] shadow-[0_4px_16px_rgba(8,117,83,0.15)] ring-1 ring-[#087553]'
                  : 'glass border-white/90 hover:bg-white/80'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {art.artifact_type}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isApproved
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  v{art.current_version} • {art.status.toUpperCase()}
                </span>
              </div>

              <div className="font-bold text-xs text-[#123D30] leading-snug truncate">
                {art.name}
              </div>

              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>{item.latest_version?.author || 'TESSERA'}</span>
                <span>{item.latest_version?.created_at ? new Date(item.latest_version.created_at).toLocaleDateString() : ''}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Detail & Monaco Workbench */}
      {selectedArtifactItem && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Monaco / Diff Editor (3 cols) */}
          <div className="lg:col-span-3 glass rounded-[23px] border border-white/90 overflow-hidden shadow-[0_8px_25px_-15px_rgba(46,83,68,0.16)] flex flex-col h-[580px]">
            {/* Top Editor Bar */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-[#137A56]" />
                <span className="font-bold text-xs text-slate-900">
                  {selectedArtifactItem.artifact.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-200 text-slate-700">
                  Version {selectedVersion?.version_number}
                </span>
                {selectedVersion?.is_approved && (
                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Approved
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDiffView(!showDiffView)}
                  disabled={versions.length < 2}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition ${
                    showDiffView
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileDiff className="w-3.5 h-3.5" />
                  <span>{showDiffView ? 'Back to Editor' : 'Compare Diff'}</span>
                </button>

                <button
                  onClick={() => handleExport('json')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center gap-1 cursor-pointer transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

                <button
                  onClick={handleApprove}
                  className="px-3 py-1.5 rounded-lg border border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold cursor-pointer transition"
                >
                  Approve Version
                </button>
              </div>
            </div>

            {/* Save New Revision Bar */}
            {!showDiffView && (
              <div className="px-5 py-2.5 bg-[#F0F5F1]/60 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-slate-500 text-[11px] font-medium">Revision Summary:</span>
                  <input
                    type="text"
                    value={saveNote}
                    onChange={(e) => setSaveNote(e.target.value)}
                    placeholder="e.g. Updated loan max tenure to 60 months..."
                    className="flex-1 bg-white border border-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#137A56]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {saveSuccessMsg && (
                    <span className="text-[11px] text-emerald-600 font-semibold animate-pulse">
                      Saved new version!
                    </span>
                  )}
                  <button
                    onClick={handleSaveNewVersion}
                    disabled={isSavingNewVersion}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full mint-button text-xs font-semibold cursor-pointer transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingNewVersion ? 'Saving...' : 'Save As New Version'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Monaco Canvas */}
            <div className="flex-1">
              {showDiffView ? (
                <DiffEditor
                  height="100%"
                  language="json"
                  original={JSON.stringify(compareVersion?.content_json || {}, null, 2)}
                  modified={editorText}
                  theme="light"
                  options={{
                    fontSize: 12,
                    readOnly: true,
                    renderSideBySide: true,
                  }}
                />
              ) : (
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  value={editorText}
                  onChange={(val) => setEditorText(val || '')}
                  theme="light"
                  options={{
                    fontSize: 12,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              )}
            </div>
          </div>

          {/* Version History Drawer (1 col) */}
          <div className="glass rounded-[23px] border border-white/90 p-5 shadow-[0_8px_25px_-15px_rgba(46,83,68,0.16)] flex flex-col h-[580px] overflow-y-auto space-y-3">
            <div className="text-xs font-bold text-[#123D30] uppercase tracking-wider flex items-center justify-between">
              <span>Version History ({versions.length})</span>
              <History className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="space-y-2 text-xs">
              {versions.map((ver) => {
                const isSelected = selectedVersion?.id === ver.id
                return (
                  <div
                    key={ver.id}
                    onClick={() => handleSelectSpecificVersion(ver)}
                    className={`p-3 rounded-lg border cursor-pointer transition space-y-1.5 ${
                      isSelected
                        ? 'bg-emerald-50/60 border-[#137A56] ring-1 ring-[#137A56]'
                        : 'bg-slate-50 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        Version {ver.version_number}
                      </span>
                      <span
                        className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                          ver.is_approved
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {ver.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {ver.change_summary || 'No summary entered'}
                    </p>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>{ver.author || 'TESSERA'}</span>
                      <span>{ver.created_at ? new Date(ver.created_at).toLocaleTimeString() : ''}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
