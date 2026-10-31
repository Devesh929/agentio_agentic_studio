import React, { useState } from 'react'
import {
  Table as TableIcon, CheckCircle2, AlertTriangle, Play,
  Copy, Check, ArrowRight, ShieldCheck, Download, RefreshCw
} from 'lucide-react'
import { api } from '../../api/client'

interface FieldMapping {
  map_id: string
  source_path: string
  target_path: string
  transformation: string
  required: boolean
}

const DEFAULT_MAPPINGS: FieldMapping[] = [
  { map_id: 'MAP-01', source_path: 'customer.first_name', target_path: 'customer.legal_first_name', transformation: 'trim', required: true },
  { map_id: 'MAP-02', source_path: 'customer.last_name', target_path: 'customer.legal_last_name', transformation: 'trim', required: true },
  { map_id: 'MAP-03', source_path: 'customer.dob_iso', target_path: 'customer.date_of_birth', transformation: 'ISO 8601 parse', required: true },
  { map_id: 'MAP-04', source_path: 'customer.govt_id_masked', target_path: 'customer.masked_government_id', transformation: 'preserve masked value', required: true },
  { map_id: 'MAP-05', source_path: 'customer.phone_e164', target_path: 'customer.phone_number', transformation: 'preserve E.164 format', required: true },
  { map_id: 'MAP-06', source_path: 'customer.residential_address', target_path: 'customer.residential_address', transformation: 'trim', required: true },
  { map_id: 'MAP-07', source_path: 'application.requested_loan_inr', target_path: 'loan.requested_amount_inr', transformation: 'identity', required: true },
  { map_id: 'MAP-08', source_path: 'screening.sanctions_status', target_path: 'screening.sanctions_result', transformation: 'identity', required: true },
  { map_id: 'MAP-09', source_path: 'screening.pep_flag', target_path: 'screening.pep_positive', transformation: 'identity', required: true },
  { map_id: 'MAP-10', source_path: 'aml.risk_score', target_path: 'risk.score', transformation: 'clamp none; validate 0..100', required: true },
  { map_id: 'MAP-11', source_path: 'income.employment_type', target_path: 'income.employment_type', transformation: 'identity', required: true },
  { map_id: 'MAP-12', source_path: 'income.salary_credits', target_path: 'income.salary_credits', transformation: 'preserve month and INR amount', required: false },
]

export const FieldMappingsPanel: React.FC = () => {
  const [mappings] = useState<FieldMapping[]>(DEFAULT_MAPPINGS)
  const [testResult, setTestResult] = useState<any | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [activeTestMode, setActiveTestMode] = useState<'clean' | 'missing' | null>(null)
  const [copied, setCopied] = useState(false)

  const handleTestClean = async () => {
    setIsValidating(true)
    setActiveTestMode('clean')
    try {
      const res = await api.validateLevel2Mappings(false)
      setTestResult(res)
    } catch (err: any) {
      alert('Mapping validation error: ' + err.message)
    } finally {
      setIsValidating(false)
    }
  }

  const handleTestMissingField = async () => {
    setIsValidating(true)
    setActiveTestMode('missing')
    try {
      const res = await api.validateLevel2Mappings(true)
      setTestResult(res)
    } catch (err: any) {
      alert('Mapping test error: ' + err.message)
    } finally {
      setIsValidating(false)
    }
  }

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(mappings, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header and Test Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 glass rounded-[25px] border border-white/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-[#087553]" />
            <h3 className="font-bold text-sm text-[#16303d]">
              Level 2 Source-to-Target Field Mappings (12 Active Rules)
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#d5f4df] text-[#087553]">
              100% PARITY
            </span>
          </div>
          <p className="text-xs text-[#627c80] mt-0.5">
            Extracts fields from Source API contract into Target Core Banking Schema with strict data transformations per L2-MAP-01.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleTestClean}
            disabled={isValidating}
            className="secondary-pill px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-white text-[#16303d]"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#087553]" />
            <span>Validate Mappings</span>
          </button>

          <button
            onClick={handleTestMissingField}
            disabled={isValidating}
            className="secondary-pill px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-amber-50 text-[#d97706] border-amber-200"
            title="Inject invalid mapping missing customer.dob_iso to test error detection"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#d97706]" />
            <span>Test Missing Field Detection</span>
          </button>

          <button
            onClick={handleCopyJSON}
            className="secondary-pill px-3 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-white text-[#627c80]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#087553]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>
        </div>
      </div>

      {/* Live Validation Test Result Card */}
      {testResult && (
        <div className={`p-5 rounded-[22px] border transition animate-fade-in ${
          testResult.valid
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/80 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-black/5">
            <div className="flex items-center gap-2.5">
              {testResult.valid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  {testResult.valid ? 'All 12 Mappings Verified Clean' : 'Missing Source Field Flagged (L2-MAP-02 Test)'}
                </h4>
                <p className="text-[11px] opacity-80">
                  {testResult.valid
                    ? 'Successfully mapped 12/12 required and optional fields against source application record.'
                    : 'Target schema integrity guard active: detected missing DOB field in source without inventing false data.'}
                </p>
              </div>
            </div>

            <span className={`text-[11px] font-mono font-bold px-3 py-1 rounded-full ${
              testResult.valid ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-900'
            }`}>
              {testResult.valid ? 'PARITY: 100%' : 'STATUS: REJECTED'}
            </span>
          </div>

          {!testResult.valid && testResult.issues && (
            <div className="mt-3 pt-1 space-y-1.5 text-xs">
              <span className="font-semibold text-amber-900 block">Diagnostic Failure Logs:</span>
              {testResult.issues.map((iss: any, idx: number) => (
                <div key={idx} className="font-mono text-[11px] bg-white/70 p-2.5 rounded-xl border border-amber-200 text-amber-900 flex items-center justify-between">
                  <span>[CODE: {iss.code}] Required source path: <code>{iss.source}</code> not present in intake document.</span>
                  <span className="font-bold text-red-600">BLOCKING</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mappings Table */}
      <div className="glass rounded-[25px] border border-white/90 shadow-[0_8px_30px_-10px_rgba(46,83,68,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#5c8979]/15 bg-white/60 text-[#627c80] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Map ID</th>
                <th className="py-3 px-4">Source JSON Path</th>
                <th className="py-3 px-4"></th>
                <th className="py-3 px-4">Target Core Banking Path</th>
                <th className="py-3 px-4">Transformation</th>
                <th className="py-3 px-4">Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#5c8979]/10">
              {mappings.map((m) => (
                <tr key={m.map_id} className="hover:bg-white/80 transition">
                  <td className="py-3 px-4 font-mono font-semibold text-[#087553]">
                    {m.map_id}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#16303d]">
                    {m.source_path}
                  </td>
                  <td className="py-3 px-2 text-[#627c80]">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-[#16303d]">
                    {m.target_path}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[11px] bg-white px-2.5 py-1 rounded-lg border border-gray-200 text-[#48636b]">
                      {m.transformation}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {m.required ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Mandatory
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        Optional
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
