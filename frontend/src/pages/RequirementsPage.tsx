import React, { useState, useEffect } from 'react'
import {
  CheckSquare, AlertTriangle, ShieldCheck, CheckCircle2,
  XCircle, Filter, Search, Edit3, ExternalLink, RefreshCw, Layers
} from 'lucide-react'
import { Project, Requirement, SourceSpan } from '../types'
import { api } from '../api/client'

interface RequirementsPageProps {
  activeProject: Project | null
  setCurrentTab: (tab: string) => void
}

export const RequirementsPage: React.FC<RequirementsPageProps> = ({ activeProject, setCurrentTab }) => {
  const [requirementsData, setRequirementsData] = useState<Array<{ requirement: Requirement; spans: SourceSpan[]; questions: any[] }>>([])
  const [loading, setLoading] = useState(false)
  const [filterKind, setFilterKind] = useState('all')
  const [filterConflictOnly, setFilterConflictOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReqItem, setSelectedReqItem] = useState<{ requirement: Requirement; spans: SourceSpan[]; questions: any[] } | null>(null)

  // Edit form state
  const [editedStatement, setEditedStatement] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const loadRequirements = async () => {
    if (!activeProject) return
    setLoading(true)
    try {
      const data = await api.getRequirements(activeProject.id)
      setRequirementsData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequirements()
  }, [activeProject?.id])

  const handleSelectReq = (item: { requirement: Requirement; spans: SourceSpan[]; questions: any[] }) => {
    setSelectedReqItem(item)
    setEditedStatement(item.requirement.statement)
  }

  const handleSaveCorrection = async () => {
    if (!selectedReqItem) return
    setSavingEdit(true)
    try {
      await api.updateRequirement(selectedReqItem.requirement.id, {
        statement: editedStatement,
        status: 'corrected',
      })
      await loadRequirements()
      alert('Requirement successfully updated and audit record logged.')
    } catch (err) {
      alert('Failed to update requirement')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleStatusChange = async (reqId: string, status: Requirement['status']) => {
    try {
      await api.updateRequirement(reqId, { status })
      await loadRequirements()
    } catch (err) {
      alert('Failed to update status')
    }
  }

  // Filter items
  const filtered = requirementsData.filter(({ requirement }) => {
    if (filterConflictOnly && !requirement.has_conflict) return false
    if (filterKind !== 'all' && requirement.kind !== filterKind) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        requirement.statement.toLowerCase().includes(q) ||
        requirement.id.toLowerCase().includes(q) ||
        requirement.original_text.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#16303d] tracking-tight">Structured Requirements & Policy Reconciliation</h1>
          <p className="text-xs text-[#627c80] mt-0.5">
            Normalized business rules, workflow steps, and field constraints extracted from project documents with conflict detection.
          </p>
        </div>

        <button
          onClick={loadRequirements}
          className="secondary-pill px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Discrepancy Highlight Banner if conflicts exist */}
      {requirementsData.some((r) => r.requirement.has_conflict) && (
        <div className="glass rounded-[23px] border border-amber-200/80 bg-amber-50/50 p-5 shadow-[0_4px_20px_rgba(180,130,30,0.08)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Cross-Document Discrepancies Detected</span>
            </div>
            <button
              onClick={() => setCurrentTab('questions')}
              className="text-xs font-semibold text-[#087553] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Resolve in Questions Inbox</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            The engine detected competing source statements (e.g. Personal Loan BRD specifies max applicant age 60, while Parameter Sheet specifies age 65). The system will not silently guess a value; human confirmation is required before final production sign-off.
          </p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass rounded-[20px] border border-white/90 p-4 shadow-[0_4px_16px_rgba(46,83,68,0.04)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/90 bg-white/80 w-64">
            <Search className="w-3.5 h-3.5 text-[#627c80]" />
            <input
              type="text"
              placeholder="Search statements or REQ ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs focus:outline-none text-[#16303d]"
            />
          </div>

          <select
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value)}
            className="px-3 py-1.5 bg-white/80 border border-white/90 rounded-full text-[#16303d] font-medium focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="business_rule">Business Rules</option>
            <option value="workflow_step">Workflow Steps</option>
            <option value="field_validation">Field Validations</option>
            <option value="dependency">Dependencies</option>
          </select>

          <label className="flex items-center gap-1.5 text-[#16303d] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterConflictOnly}
              onChange={(e) => setFilterConflictOnly(e.target.checked)}
              className="rounded text-[#087553]"
            />
            <span className="font-semibold text-amber-900">Conflicts Only</span>
          </label>
        </div>

        <div className="text-[11px] text-[#627c80]">
          Showing {filtered.length} of {requirementsData.length} extracted rules
        </div>
      </div>

      {/* Main Split Layout: Requirements Table + Side Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table (2 cols) */}
        <div className="lg:col-span-2 glass rounded-[23px] border border-white/90 shadow-[0_8px_25px_-15px_rgba(46,83,68,0.16)] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-xs text-slate-500">
                No matching requirements found.
              </div>
            )}
            {filtered.map((item) => {
              const req = item.requirement
              const isSelected = selectedReqItem?.requirement.id === req.id
              return (
                <div
                  key={req.id}
                  onClick={() => handleSelectReq(item)}
                  className={`p-4 cursor-pointer transition ${
                    isSelected ? 'bg-emerald-50/50 border-l-4 border-[#137A56]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">{req.id}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {req.kind.replace('_', ' ')}
                      </span>
                      {req.has_conflict && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Conflict
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        req.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'conflict'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {req.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-900 mt-2 leading-relaxed">
                    {req.statement}
                  </p>

                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                    <span>Evidence citations:</span>
                    {item.spans.map((sp) => (
                      <span
                        key={sp.id}
                        className="font-mono px-1.5 py-0.5 rounded bg-slate-100 text-[#137A56] font-medium"
                      >
                        {sp.locator}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Side Inspector & Rule Editor (1 col) */}
        <div className="glass rounded-[23px] border border-white/90 p-5 shadow-[0_8px_25px_-15px_rgba(46,83,68,0.16)] flex flex-col h-[520px] overflow-y-auto space-y-4">
          <div className="text-xs font-bold text-[#123D30] uppercase tracking-wider">
            Requirement Detail & Source Provenance
          </div>

          {selectedReqItem ? (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Requirement ID</div>
                <div className="font-mono font-bold text-slate-900 text-sm">
                  {selectedReqItem.requirement.id}
                </div>
                <div className="text-[11px] text-slate-600">
                  Category: <span className="font-medium text-slate-800">{selectedReqItem.requirement.kind}</span>
                </div>
              </div>

              {/* Conflict details if present */}
              {selectedReqItem.requirement.has_conflict && selectedReqItem.requirement.conflict_details && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 space-y-2">
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Competing Evidence Details</span>
                  </div>
                  <p className="text-[11px]">
                    {selectedReqItem.requirement.conflict_details.explanation}
                  </p>
                  <div className="space-y-1 text-[10px] font-mono">
                    {selectedReqItem.requirement.conflict_details.sources.map((s: any, idx: number) => (
                      <div key={idx} className="p-1.5 bg-white/80 rounded border border-amber-200">
                        {s.doc} [{s.locator}]: Claimed Value = {s.claimed_value}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Side-by-side: Original vs Corrected Statement */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Original Extracted Clause
                </label>
                <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600 text-[11px] italic font-serif">
                  &quot;{selectedReqItem.requirement.original_text || selectedReqItem.requirement.statement}&quot;
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Edit / Correct Statement
                </label>
                <textarea
                  rows={3}
                  value={editedStatement}
                  onChange={(e) => setEditedStatement(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#137A56] bg-slate-50/50"
                />
                <button
                  onClick={handleSaveCorrection}
                  disabled={savingEdit}
                  className="w-full py-2 rounded-full mint-button text-xs font-semibold cursor-pointer transition"
                >
                  {savingEdit ? 'Saving...' : 'Save Correction & Log Audit'}
                </button>
              </div>

              {/* Structured Rule JSON */}
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-700">Normalized Rule Expression</div>
                <pre className="text-[10px] font-mono text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 overflow-x-auto">
                  {JSON.stringify(selectedReqItem.requirement.structured_rule, null, 2)}
                </pre>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-2 border-t border-slate-100">
                <button
                  onClick={() => handleStatusChange(selectedReqItem.requirement.id, 'confirmed')}
                  className="flex-1 py-1.5 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold cursor-pointer border border-emerald-200 transition"
                >
                  Approve Rule
                </button>
                <button
                  onClick={() => handleStatusChange(selectedReqItem.requirement.id, 'rejected')}
                  className="flex-1 py-1.5 rounded bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-semibold cursor-pointer border border-rose-200 transition"
                >
                  Reject Rule
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-500">
              Select any requirement from the list to inspect source evidence and modify rules.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
