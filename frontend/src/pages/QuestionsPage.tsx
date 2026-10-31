import React, { useState, useEffect } from 'react'
import {
  HelpCircle, AlertTriangle, CheckCircle2, ArrowRight,
  ShieldAlert, RefreshCw, UserCheck, MessageSquare, ExternalLink
} from 'lucide-react'
import { Project, Question } from '../types'
import { api } from '../api/client'

interface QuestionsPageProps {
  activeProject: Project | null
  setCurrentTab: (tab: string) => void
}

export const QuestionsPage: React.FC<QuestionsPageProps> = ({ activeProject, setCurrentTab }) => {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [rationales, setRationales] = useState<Record<string, string>>({})
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const loadQuestions = async () => {
    if (!activeProject) return
    setLoading(true)
    try {
      const data = await api.getQuestions(activeProject.id)
      setQuestions(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuestions()
  }, [activeProject?.id])

  const handleSelectOption = (questionId: string, value: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleAnswerSubmit = async (q: Question) => {
    const answerVal = selectedAnswers[q.id]
    if (!answerVal) {
      alert('Please select an option or provide an answer.')
      return
    }

    setSubmittingId(q.id)
    try {
      await api.answerQuestion(q.id, {
        selected_option: answerVal,
        rationale: rationales[q.id] || `Decided: ${answerVal}`,
        answered_by: 'Compliance & Risk Officer (Authorized Local Reviewer)',
      })
      alert('Decision recorded! Downstream configuration, workflow, and test cases have been automatically updated.')
      await loadQuestions()
    } catch (err) {
      alert('Failed to submit decision: ' + (err as Error).message)
    } finally {
      setSubmittingId(null)
    }
  }

  const openQuestions = questions.filter((q) => q.status === 'open')
  const answeredQuestions = questions.filter((q) => q.status === 'answered')

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#123D30]">Questions, Ambiguities & Human Review Gates</h1>
          <p className="text-xs text-[#64736D] mt-0.5">
            Structured clarifications where source documents conflict or omit critical thresholds. Approvals are blocked until resolved.
          </p>
        </div>

        <button
          onClick={loadQuestions}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e4836]/15 hover:bg-white text-xs font-medium text-[#18312B] transition cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Alert Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center font-bold text-amber-800">
              {openQuestions.length}
            </div>
            <div>
              <div className="font-bold text-xs">Unresolved Blocking Questions</div>
              <div className="text-[11px] text-amber-800">
                Requires human sign-off before production lock
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center font-bold text-emerald-800">
              {answeredQuestions.length}
            </div>
            <div>
              <div className="font-bold text-xs">Resolved Decisions</div>
              <div className="text-[11px] text-emerald-800">
                Audited and incorporated into artefacts
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Open Questions List */}
      <div className="space-y-4">
        <div className="text-xs font-bold text-[#123D30] uppercase tracking-wider">
          Action Required: Clarification Cards
        </div>

        {openQuestions.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500 shadow-2xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <span className="font-semibold text-slate-800">No unresolved questions!</span>
            <p className="mt-1">All source ambiguities and policy discrepancies have been confirmed and grounded.</p>
          </div>
        )}

        {openQuestions.map((q) => (
          <div
            key={q.id}
            className="bg-white rounded-xl border border-amber-200/80 shadow-2xs p-6 space-y-4 relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    {q.id}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 uppercase">
                    Blocking
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 leading-snug">
                  {q.question_text}
                </h3>
                <p className="text-xs text-slate-500">
                  Impact: <span className="font-medium text-slate-700">{q.impact}</span>
                </p>
              </div>
            </div>

            {/* Competing Evidence Side-by-Side */}
            {q.competing_evidence && q.competing_evidence.length > 0 && (
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Competing Source Evidence
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.competing_evidence.map((ev, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded border border-slate-200 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#137A56]">
                        <span>{ev.source}</span>
                        <span className="bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                          {ev.locator}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-800 italic font-serif">
                        &quot;{ev.excerpt}&quot;
                      </p>
                      <div className="text-[10px] font-semibold text-slate-600">
                        Claimed Policy: {ev.claim}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Options Pill Selection */}
            {q.suggested_options && q.suggested_options.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Select Governing Decision:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {q.suggested_options.map((opt, idx) => {
                    const isSelected = selectedAnswers[q.id] === opt.value
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectOption(q.id, opt.value)}
                        className={`p-3 rounded-lg border text-left text-xs font-semibold cursor-pointer transition ${
                          isSelected
                            ? 'bg-[#137A56] text-white border-[#137A56] shadow-xs'
                            : 'bg-white border-slate-200 hover:border-[#137A56] text-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Rationale & Decision Submission */}
            <div className="pt-2 flex flex-col md:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="Rationale / Governance committee notes..."
                value={rationales[q.id] || ''}
                onChange={(e) => setRationales({ ...rationales, [q.id]: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#137A56]"
              />

              <button
                type="button"
                disabled={submittingId === q.id}
                onClick={() => handleAnswerSubmit(q)}
                className="px-5 py-2 rounded-lg bg-[#137A56] hover:bg-[#123D30] text-white text-xs font-bold whitespace-nowrap cursor-pointer transition shadow-sm"
              >
                {submittingId === q.id ? 'Recording & Regenerating...' : 'Submit Human Decision'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Answered Decisions History */}
      {answeredQuestions.length > 0 && (
        <div className="space-y-3 pt-4">
          <div className="text-xs font-bold text-[#123D30] uppercase tracking-wider">
            Audited Decisions Record
          </div>
          <div className="bg-white rounded-xl border border-[#1e4836]/10 divide-y divide-slate-100 shadow-2xs">
            {answeredQuestions.map((q) => (
              <div key={q.id} className="p-4 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800">{q.id}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      RESOLVED
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900">{q.question_text}</div>
                  <div className="text-[11px] text-slate-500">
                    Decision: <span className="font-bold text-[#137A56]">{q.answer}</span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  Decision ID: {q.decision_id || 'DEC-AUDIT'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
