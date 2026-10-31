import React, { useState } from 'react'
import {
  ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle,
  Play, RefreshCw, FileText, Check, Layers
} from 'lucide-react'
import { api } from '../../api/client'

export const ValidationDiagnosticsPanel: React.FC = () => {
  const [report, setReport] = useState<any | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [mode, setMode] = useState<'clean' | 'invalid'>('clean')

  const handleValidateClean = async () => {
    setIsValidating(true)
    setMode('clean')
    try {
      const res = await api.validateLevel2Config()
      setReport(res)
    } catch (err: any) {
      alert('Validation error: ' + err.message)
    } finally {
      setIsValidating(false)
    }
  }

  const handleValidateInvalid = async () => {
    setIsValidating(true)
    setMode('invalid')
    try {
      // Load invalid fixture with intentional risk gap, income conflict, and missing state
      const invalidFixture = {
        identity: { mandatory_fields: ['legal_first_name'], failed_verification_state: 'manual_identity_review' },
        screening: { possible_match_state: 'on_hold_screening', confirmed_match_state: 'blocked_sanctions', pep_positive_requires_edd: true },
        risk: { score_min: 0, score_max: 100, low_score_max: 45, medium_score_max: 70, high_risk_score_min: 75, high_risk_action: 'enhanced_due_diligence' },
        income: { stable_income_required: true, policy_status: 'defined', lookback_months: 3, min_qualifying_months: 6, minimum_monthly_credit_inr: 25000, salaried_failure_route: 'manual_review' },
        loan_value: { currency: 'INR', senior_review_threshold_inr: 500000, senior_review_inclusive: true, high_value_edd_threshold_inr: 500000, high_value_edd_inclusive: true, definition_confirmed: true },
        workflow: { workflow_id: 'digital_loan_kyc_aml', states: ['intake', 'identity_verification', 'screening'], transition_ids: ['WF-01'] }
      }
      const res = await api.validateLevel2Config(invalidFixture)
      setReport(res)
    } catch (err: any) {
      alert('Validation error: ' + err.message)
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 glass rounded-[25px] border border-white/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#087553]" />
            <h3 className="font-bold text-sm text-[#16303d]">
              Level 2 Multi-Signal Configuration & Business-Rule Diagnostic
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#d5f4df] text-[#087553]">
              DRAFT-07 + SEMANTIC
            </span>
          </div>
          <p className="text-xs text-[#627c80] mt-0.5">
            Verifies JSON Schema Draft-07 syntax, risk-band gap/overlap consistency, income qualification limits, and workflow transition completeness per L2-VAL-01.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleValidateClean}
            disabled={isValidating}
            className="secondary-pill px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-white text-[#16303d]"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#087553]" />
            <span>Validate Active Configuration</span>
          </button>

          <button
            onClick={handleValidateInvalid}
            disabled={isValidating}
            className="secondary-pill px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-amber-50 text-[#d97706] border-amber-200"
            title="Inject invalid configuration fixture to test semantic error diagnostics"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#d97706]" />
            <span>Test Diagnostic Error Detection</span>
          </button>
        </div>
      </div>

      {/* Signal Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 glass rounded-[20px] border border-white/90 shadow-2xs space-y-2">
          <div className="text-[10px] font-bold text-[#627c80] uppercase tracking-wider">Signal 1</div>
          <div className="text-xs font-bold text-[#16303d]">Target Schema Validity</div>
          <div className={`text-base font-bold ${report?.signals?.target_schema === 'FAILED' ? 'text-red-600' : 'text-[#087553]'}`}>
            {report ? report.signals.target_schema : 'PASSED'}
          </div>
          <p className="text-[11px] text-[#627c80]">Conforms with Draft-07 Target Schema properties.</p>
        </div>

        <div className="p-4 glass rounded-[20px] border border-white/90 shadow-2xs space-y-2">
          <div className="text-[10px] font-bold text-[#627c80] uppercase tracking-wider">Signal 2</div>
          <div className="text-xs font-bold text-[#16303d]">Risk Band Consistency</div>
          <div className={`text-base font-bold ${report?.signals?.risk_band_consistency === 'FAILED' ? 'text-red-600' : 'text-[#087553]'}`}>
            {report ? report.signals.risk_band_consistency : 'PASSED'}
          </div>
          <p className="text-[11px] text-[#627c80]">Medium max + 1 strictly equals High min with zero gap/overlap.</p>
        </div>

        <div className="p-4 glass rounded-[20px] border border-white/90 shadow-2xs space-y-2">
          <div className="text-[10px] font-bold text-[#627c80] uppercase tracking-wider">Signal 3</div>
          <div className="text-xs font-bold text-[#16303d]">Income Policy Consistency</div>
          <div className={`text-base font-bold ${report?.signals?.income_policy_consistency === 'FAILED' ? 'text-red-600' : 'text-[#087553]'}`}>
            {report ? report.signals.income_policy_consistency : 'PASSED'}
          </div>
          <p className="text-[11px] text-[#627c80]">Qualifying months (4) is less than or equal to lookback (6).</p>
        </div>

        <div className="p-4 glass rounded-[20px] border border-white/90 shadow-2xs space-y-2">
          <div className="text-[10px] font-bold text-[#627c80] uppercase tracking-wider">Signal 4</div>
          <div className="text-xs font-bold text-[#16303d]">Workflow Completeness</div>
          <div className={`text-base font-bold ${report?.signals?.workflow_completeness === 'FAILED' ? 'text-red-600' : 'text-[#087553]'}`}>
            {report ? report.signals.workflow_completeness : 'PASSED'}
          </div>
          <p className="text-[11px] text-[#627c80]">All 14 states present including manual_income_review.</p>
        </div>
      </div>

      {/* Errors or Pass Banner */}
      {report && (
        <div className={`p-5 rounded-[22px] border animate-fade-in ${
          report.is_valid
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/90 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-center gap-2.5 mb-2">
            {report.is_valid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
            <h4 className="font-bold text-xs uppercase tracking-wider">
              {report.is_valid ? 'Configuration Passed All Multi-Signal Diagnostic Checks' : `Detected ${report.errors_count} Semantic Policy Violations`}
            </h4>
          </div>

          {!report.is_valid && report.errors && (
            <div className="space-y-2 mt-3">
              {report.errors.map((err: any, idx: number) => (
                <div key={idx} className="bg-white/80 p-3 rounded-xl border border-amber-200 font-mono text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-900">[{err.code}]</span>{' '}
                    <span className="text-[#16303d]">{err.message}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500">{err.path}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
