import React, { useState } from 'react'
import {
  GitFork, CheckCircle2, AlertCircle, RefreshCw, ArrowRight,
  ShieldCheck, FileText, Check, History, Clock, UserCheck
} from 'lucide-react'
import { api } from '../../api/client'

export const ChangeControlPanel: React.FC = () => {
  const [activeVersion, setActiveVersion] = useState<'1.0' | '2.0'>('1.0')
  const [isApplying, setIsApplying] = useState(false)
  const [changeResult, setChangeResult] = useState<any | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleApplyChange = async () => {
    setIsApplying(true)
    try {
      const res = await api.applyLevel2ChangeRequest()
      setChangeResult(res)
      setActiveVersion('2.0')
      showToast('Policy amendment CHG-001 approved. Generated Version 2.0 configuration.')
    } catch (err: any) {
      alert('Failed to apply change: ' + err.message)
    } finally {
      setIsApplying(false)
    }
  }

  const handleRollback = async () => {
    setIsApplying(true)
    try {
      const res = await api.rollbackLevel2ChangeRequest()
      setChangeResult(null)
      setActiveVersion('1.0')
      showToast('Rollback successful. Restored approved Version 1.0 configuration.')
    } catch (err: any) {
      alert('Rollback failed: ' + err.message)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 glass rounded-[25px] border border-white/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#087553]" />
            <h3 className="font-bold text-sm text-[#16303d]">
              Version Control & Change Review Exercise (CHG-001)
            </h3>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
              activeVersion === '2.0' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-[#d5f4df] text-[#087553]'
            }`}>
              ACTIVE VERSION {activeVersion}
            </span>
          </div>
          <p className="text-xs text-[#627c80] mt-0.5">
            Demonstrates explicit human policy amendment without silent hallucination per 05_Change_Review_Request.md and L2-VER-01.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeVersion === '1.0' ? (
            <button
              onClick={handleApplyChange}
              disabled={isApplying}
              className="mint-button px-5 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#087553]" />
              <span>{isApplying ? 'Processing...' : 'Approve & Deploy v2.0 (Threshold: 70)'}</span>
            </button>
          ) : (
            <button
              onClick={handleRollback}
              disabled={isApplying}
              className="secondary-pill px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-white text-[#c2410c] border-orange-200"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#c2410c]" />
              <span>{isApplying ? 'Restoring...' : 'Rollback to v1.0 (Threshold: 75)'}</span>
            </button>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-900 flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Change Request Specification Card */}
      <div className="glass rounded-[25px] border border-white/90 shadow-[0_8px_30px_-10px_rgba(46,83,68,0.08)] p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#5c8979]/15">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-[#d5f4df] text-[#087553] px-2.5 py-1 rounded-lg">
              CHG-001
            </span>
            <h4 className="font-bold text-sm text-[#16303d]">
              Policy Owner Request: Lower High-Risk AML Threshold from 75 to 70
            </h4>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#627c80]">
            <UserCheck className="w-3.5 h-3.5 text-[#087553]" />
            <span>Actor: policy_owner_demo</span>
          </div>
        </div>

        <p className="text-xs text-[#48636b] leading-relaxed">
          In the approved v1.0 configuration, the high-risk AML cutoff is 75 (Medium: 40–74). A policy owner requests lowering the threshold to 70. TESSERA requires an explicit governance action to adopt this amendment, preserving both versions and regenerating only affected workflow conditions and test suites.
        </p>

        {/* Side by Side Diff */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Version 1.0 */}
          <div className={`p-4 rounded-2xl border transition ${
            activeVersion === '1.0' ? 'bg-white border-[#087553] ring-2 ring-[#087553]/20' : 'bg-gray-50/70 border-gray-200 opacity-60'
          }`}>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
              <span className="font-bold text-xs text-[#16303d]">Version 1.0 (Current Approved)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                PRECEDENCE: PDF 75
              </span>
            </div>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between py-1 bg-gray-50 px-2 rounded">
                <span className="text-gray-500">/risk/high_risk_score_min:</span>
                <span className="font-bold text-[#16303d]">75</span>
              </div>
              <div className="flex justify-between py-1 bg-gray-50 px-2 rounded">
                <span className="text-gray-500">/risk/medium_score_max:</span>
                <span className="font-bold text-[#16303d]">74</span>
              </div>
              <div className="flex justify-between py-1 bg-gray-50 px-2 rounded">
                <span className="text-gray-500">Scenario S04 (Score 74):</span>
                <span className="font-bold text-emerald-700">approved (No EDD)</span>
              </div>
            </div>
          </div>

          {/* Version 2.0 */}
          <div className={`p-4 rounded-2xl border transition ${
            activeVersion === '2.0' ? 'bg-white border-[#087553] ring-2 ring-[#087553]/20' : 'bg-amber-50/60 border-amber-200'
          }`}>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
              <span className="font-bold text-xs text-[#16303d]">Version 2.0 (Proposed Amendment)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                AMENDMENT: CUTOFF 70
              </span>
            </div>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between py-1 bg-amber-50/80 px-2 rounded">
                <span className="text-gray-500">/risk/high_risk_score_min:</span>
                <span className="font-bold text-amber-900">70</span>
              </div>
              <div className="flex justify-between py-1 bg-amber-50/80 px-2 rounded">
                <span className="text-gray-500">/risk/medium_score_max:</span>
                <span className="font-bold text-amber-900">69</span>
              </div>
              <div className="flex justify-between py-1 bg-amber-50/80 px-2 rounded">
                <span className="text-gray-500">Scenario S04 (Score 74):</span>
                <span className="font-bold text-amber-800">pending_edd (Triggers EDD!)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Behavioral Impact Summary Banner */}
        {changeResult?.behavior_impact && (
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-xs text-amber-950 space-y-1.5 animate-fade-in">
            <div className="font-bold uppercase tracking-wider text-[10px] text-amber-900">
              Live Behavioral Impact on Test Suite:
            </div>
            <p className="leading-relaxed">
              {changeResult.behavior_impact.impact_summary}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
