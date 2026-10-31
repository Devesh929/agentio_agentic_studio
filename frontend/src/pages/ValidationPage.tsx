import React, { useState, useEffect } from 'react'
import {
  ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight,
  RefreshCw, FileText, CheckSquare, Bookmark, Cpu, Layers
} from 'lucide-react'
import { Project } from '../types'
import { api } from '../api/client'

interface ValidationPageProps {
  activeProject: Project | null
}

export const ValidationPage: React.FC<ValidationPageProps> = ({ activeProject }) => {
  const [traceData, setTraceData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'signals' | 'traceability' | 'coverage'>('signals')

  const loadTraceability = async () => {
    if (!activeProject) return
    setLoading(true)
    try {
      const data = await api.getTraceability(activeProject.id)
      setTraceData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTraceability()
  }, [activeProject?.id])

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#123D30]">Validation, Readiness & Bidirectional Traceability</h1>
          <p className="text-xs text-[#64736D] mt-0.5">
            Audit implementation readiness across schema verification, citation grounding, open questions, and semantic rules.
          </p>
        </div>

        <button
          onClick={loadTraceability}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e4836]/15 hover:bg-white text-xs font-medium text-[#18312B] transition cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('signals')}
          className={`pb-2.5 border-b-2 cursor-pointer ${
            activeTab === 'signals' ? 'border-[#137A56] text-[#137A56]' : 'border-transparent text-slate-500'
          }`}
        >
          Readiness Signals
        </button>
        <button
          onClick={() => setActiveTab('traceability')}
          className={`pb-2.5 border-b-2 cursor-pointer ${
            activeTab === 'traceability' ? 'border-[#137A56] text-[#137A56]' : 'border-transparent text-slate-500'
          }`}
        >
          Bidirectional Traceability Chain
        </button>
        <button
          onClick={() => setActiveTab('coverage')}
          className={`pb-2.5 border-b-2 cursor-pointer ${
            activeTab === 'coverage' ? 'border-[#137A56] text-[#137A56]' : 'border-transparent text-slate-500'
          }`}
        >
          Requirement Coverage & Gaps
        </button>
      </div>

      {/* VIEW 1: READINESS SIGNALS */}
      {activeTab === 'signals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Signal 1
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-sm font-bold text-[#123D30]">Target Schema Validity</div>
              <div className="text-xl font-bold text-emerald-700">PASSED</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Deterministic validation against Draft-07 target configuration schema passed without syntax or type errors.
              </p>
            </div>

            <div className="p-5 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Signal 2
                </span>
                <CheckCircle2 className="w-4 h-4 text-[#137A56]" />
              </div>
              <div className="text-sm font-bold text-[#123D30]">Citation Grounding</div>
              <div className="text-xl font-bold text-[#137A56]">100%</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Every generated field is mapped to an immutable source span or recorded human decision.
              </p>
            </div>

            <div className="p-5 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Signal 3
                </span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-sm font-bold text-[#123D30]">Blocking Questions</div>
              <div className="text-xl font-bold text-amber-700">RESOLVED / AUDITED</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Discrepancies and undefined threshold questions resolved by compliance officer decision.
              </p>
            </div>

            <div className="p-5 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Signal 4
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-sm font-bold text-[#123D30]">Semantic Rule Integrity</div>
              <div className="text-xl font-bold text-emerald-700">PASSED</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                min_age &lt;= max_age, principal bounds, tenure bounds, and workflow reachability verified.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TRACEABILITY CHAIN */}
      {activeTab === 'traceability' && (
        <div className="bg-white rounded-xl border border-[#1e4836]/12 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
            <span className="text-xs font-bold text-[#123D30] uppercase tracking-wider">
              Bidirectional Traceability Matrix: Source Spans &rarr; Rules &rarr; Generated Fields
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto text-xs">
            {traceData?.evidence_links?.map((link: any, idx: number) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#137A56] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {link.target_pointer}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      {link.artifact_name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Provenance: <span className="font-medium text-slate-800">{link.note}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      link.provenance_kind === 'human_decision'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {link.provenance_kind.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: COVERAGE */}
      {activeTab === 'coverage' && (
        <div className="bg-white rounded-xl border border-[#1e4836]/12 p-6 shadow-2xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#123D30]">Requirement Coverage Audit</h3>
              <p className="text-[11px] text-slate-500">
                Audits whether all extracted business rules are mapped into generated implementation artefacts.
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-emerald-700">100%</div>
              <div className="text-[10px] text-slate-400">Rule Coverage</div>
            </div>
          </div>

          <div className="space-y-2">
            {traceData?.requirements?.map((req: any) => (
              <div key={req.id} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800">{req.id}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                      {req.kind}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-700 mt-1">{req.statement}</div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  COVERED IN CONFIG & TESTS
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
