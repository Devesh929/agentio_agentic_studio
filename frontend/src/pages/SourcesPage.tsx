import React, { useState, useEffect } from 'react'
import {
  Upload, FileText, AlertTriangle, CheckCircle2, XCircle,
  Eye, RefreshCw, FileCode, Sheet, X, ExternalLink
} from 'lucide-react'
import { Project, SourceDocument, SourceSpan } from '../types'
import { api } from '../api/client'

interface SourcesPageProps {
  activeProject: Project | null
}

export const SourcesPage: React.FC<SourcesPageProps> = ({ activeProject }) => {
  const [sources, setSources] = useState<SourceDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedRole, setSelectedRole] = useState('BRD / Functional Spec')
  const [selectedDoc, setSelectedDoc] = useState<SourceDocument | null>(null)
  const [docPreview, setDocPreview] = useState<{ spans: SourceSpan[]; raw_text: string; report: any } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [activePreviewTab, setActivePreviewTab] = useState<'spans' | 'raw' | 'report'>('spans')

  const loadSources = async () => {
    if (!activeProject) return
    setLoading(true)
    try {
      const data = await api.getProjectSources(activeProject.id)
      setSources(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSources()
  }, [activeProject?.id])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeProject) return
    const file = e.target.files[0]
    setUploading(true)
    try {
      await api.uploadSource(activeProject.id, file, selectedRole)
      await loadSources()
    } catch (err) {
      alert('Upload failed: ' + (err as Error).message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const openPreview = async (doc: SourceDocument) => {
    setSelectedDoc(doc)
    setPreviewLoading(true)
    try {
      const data = await api.getSourcePreview(doc.id)
      setDocPreview(data)
    } catch (err) {
      console.error(err)
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#16303d] tracking-tight">Project Sources & Parsing Pipeline</h1>
          <p className="text-xs text-[#627c80] mt-0.5">
            Manage input documents across BRDs, parameter spreadsheets, user stories, and target JSON schemas.
          </p>
        </div>
        <button
          onClick={loadSources}
          className="secondary-pill px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Upload Zone Card */}
      <div className="glass rounded-[23px] border border-white/90 p-5 shadow-[0_8px_25px_-15px_rgba(46,83,68,0.16)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#d5f4df] text-[#087553] flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#16303d]">Upload Project Document</div>
              <div className="text-[11px] text-[#627c80]">
                Supported: <code className="font-mono text-[#087553]">.docx</code>, <code className="font-mono text-[#087553]">.xlsx</code>, <code className="font-mono text-[#087553]">.pdf</code>, <code className="font-mono text-[#087553]">.txt</code>, <code className="font-mono text-[#087553]">.json</code>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="text-xs bg-white/80 border border-white/90 rounded-full px-3 py-2 text-[#16303d] focus:outline-none"
              >
                <option value="BRD / Functional Spec">Role: BRD / Functional Spec</option>
                <option value="Product Rules / Parameter Sheet">Role: Product Rules / Parameter Sheet</option>
                <option value="User Stories">Role: User Stories</option>
                <option value="Target Configuration Schema">Role: Target Configuration Schema</option>
                <option value="Other">Role: Other Supporting Document</option>
              </select>
            </div>

            <label className="mint-button px-5 py-2 text-xs cursor-pointer flex items-center gap-1.5">
              <span>{uploading ? 'Parsing File...' : 'Choose File'}</span>
              <input
                type="file"
                disabled={uploading}
                onChange={handleFileUpload}
                className="hidden"
                accept=".docx,.xlsx,.xls,.pdf,.txt,.md,.json,.yaml,.yml"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Sources Table */}
      <div className="glass rounded-[23px] border border-white/90 shadow-[0_8px_25px_-15px_rgba(46,83,68,0.16)] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/80 bg-white/60 flex items-center justify-between">
          <span className="text-xs font-bold text-[#16303d] uppercase tracking-wider">
            Document Repository ({sources.length})
          </span>
          <span className="text-[11px] text-[#627c80]">
            Exact paragraph, sheet/cell, and page-block provenance preserved
          </span>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          {sources.length === 0 && (
            <div className="text-center py-12 text-xs text-[#64736D]">
              No documents uploaded yet. Click &quot;Load Sample Personal Loan Project&quot; in Overview or upload a file above.
            </div>
          )}
          {sources.map((doc) => {
            const isParsed = doc.parse_state === 'parsed'
            const isPartial = doc.parse_state === 'partial'
            const isFailed = doc.parse_state === 'failed'

            return (
              <div
                key={doc.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
                    {doc.filename.endsWith('.xlsx') || doc.filename.endsWith('.xls') ? (
                      <Sheet className="w-4 h-4 text-emerald-600" />
                    ) : doc.filename.endsWith('.json') ? (
                      <FileCode className="w-4 h-4 text-amber-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {doc.filename}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700">
                        {doc.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                      <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>
                        {doc.worksheet_count ? `${doc.worksheet_count} worksheets` : `${doc.page_count} units`}
                      </span>
                      {doc.warnings && doc.warnings.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {doc.warnings.length} warning(s)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Parse State Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      isParsed
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isPartial
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {isParsed && <CheckCircle2 className="w-3 h-3" />}
                    {isPartial && <AlertTriangle className="w-3 h-3" />}
                    {isFailed && <XCircle className="w-3 h-3" />}
                    <span>{doc.parse_state.toUpperCase()}</span>
                  </span>

                  <button
                    onClick={() => openPreview(doc)}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Slide-Over Source Inspection Drawer */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900 truncate">
                    {selectedDoc.filename}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800">
                    {selectedDoc.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  ID: <code className="font-mono text-slate-700">{selectedDoc.id}</code> • State: {selectedDoc.parse_state}
                </div>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subnav Tabs */}
            <div className="px-5 border-b border-slate-200 flex gap-4 text-xs font-medium">
              <button
                onClick={() => setActivePreviewTab('spans')}
                className={`py-2.5 border-b-2 cursor-pointer ${
                  activePreviewTab === 'spans'
                    ? 'border-[#137A56] text-[#137A56] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Extracted Spans ({docPreview?.spans?.length || 0})
              </button>
              <button
                onClick={() => setActivePreviewTab('report')}
                className={`py-2.5 border-b-2 cursor-pointer ${
                  activePreviewTab === 'report'
                    ? 'border-[#137A56] text-[#137A56] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Parsing Report & Warnings
              </button>
              <button
                onClick={() => setActivePreviewTab('raw')}
                className={`py-2.5 border-b-2 cursor-pointer ${
                  activePreviewTab === 'raw'
                    ? 'border-[#137A56] text-[#137A56] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Raw Text View
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {previewLoading && (
                <div className="text-center py-12 text-xs text-slate-500">
                  Loading source blocks...
                </div>
              )}

              {!previewLoading && activePreviewTab === 'spans' && (
                <div className="space-y-3">
                  {docPreview?.spans?.map((span) => (
                    <div
                      key={span.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-[#137A56] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {span.locator}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">{span.span_type}</span>
                      </div>
                      <p className="text-xs text-slate-800 font-sans leading-relaxed">
                        {span.excerpt}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {!previewLoading && activePreviewTab === 'report' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-slate-500 text-[11px]">Readable Units</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">
                        {selectedDoc.parse_report?.readable_units ?? 0}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-slate-500 text-[11px]">Unreadable / Partial</div>
                      <div className="text-lg font-bold text-amber-700 mt-1">
                        {selectedDoc.parse_report?.unreadable_units ?? 0}
                      </div>
                    </div>
                  </div>

                  {selectedDoc.warnings && selectedDoc.warnings.length > 0 && (
                    <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Parser Warnings Detected</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-[11px]">
                        {selectedDoc.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-semibold text-slate-700">Metadata Details</div>
                    <pre className="text-[10px] font-mono text-slate-600 overflow-x-auto p-2 bg-white rounded border border-slate-200">
                      {JSON.stringify(selectedDoc.parse_report?.metadata || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {!previewLoading && activePreviewTab === 'raw' && (
                <div>
                  <pre className="text-[11px] font-mono text-slate-800 bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed">
                    {docPreview?.raw_text || 'No raw text extracted.'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
