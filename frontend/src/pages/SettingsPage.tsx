import React, { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon, Shield, Cpu, Key, AlertTriangle,
  CheckCircle2, RefreshCw, Zap, ExternalLink
} from 'lucide-react'
import { ProviderStatus } from '../types'
import { api } from '../api/client'

export const SettingsPage: React.FC = () => {
  const [status, setStatus] = useState<ProviderStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  const loadStatus = async () => {
    setLoading(true)
    try {
      const data = await api.getProviderStatus()
      setStatus(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.testProviderConnection()
      setTestResult(res)
    } catch (err: any) {
      setTestResult({ success: false, message: err.message, offline_mode: true })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#123D30]">Settings & Provider Integrations</h1>
        <p className="text-xs text-[#64736D] mt-0.5">
          Configure API credentials, inspect model connection status, and manage offline demonstration mode.
        </p>
      </div>

      {/* Groq Connection Card */}
      <div className="bg-white rounded-xl border border-[#1e4836]/12 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Groq API Cloud Provider</h3>
              <p className="text-[11px] text-slate-500">
                Ultra-fast LPUs for structured requirement extraction and target schema generation.
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              status?.groq?.configured
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {status?.groq?.configured ? 'CONFIGURED' : 'BLANK PLACEHOLDER'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">API Key Status</div>
            <div className="font-mono text-slate-800 font-medium">
              {status?.groq?.configured ? status.groq.masked_key : 'GROQ_API_KEY (Unset)'}
            </div>
            <div className="text-[10px] text-slate-400">
              Configured via backend <code className="font-mono">.env</code> file. Never exposed in browser.
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Primary Model</div>
            <div className="font-mono text-slate-800 font-medium">
              {status?.groq?.primary_model || 'openai/gpt-oss-20b'}
            </div>
            <div className="text-[10px] text-slate-400">
              Reasoning effort: {status?.groq?.reasoning_effort || 'low'}
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2 rounded-lg bg-[#137A56] hover:bg-[#123D30] text-white text-xs font-semibold cursor-pointer transition shadow-xs"
          >
            {testing ? 'Testing Endpoint...' : 'Test Connection'}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3.5 rounded-lg border text-xs space-y-1 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5">
              {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{testResult.success ? 'Connection Succeeded' : 'Offline Mode Active'}</span>
            </div>
            <p className="text-[11px]">{testResult.message}</p>
          </div>
        )}
      </div>

      {/* LlamaCloud Parser Card */}
      <div className="bg-white rounded-xl border border-[#1e4836]/12 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">LlamaParse Document Extraction Adapter</h3>
              <p className="text-[11px] text-slate-500">
                Deep parser for complex scanned PDF tables and multi-layer layouts.
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              status?.llama_cloud?.configured
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {status?.llama_cloud?.configured ? 'KEY DETECTED' : 'UNCONFIGURED'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Llama Cloud Key</div>
            <div className="font-mono text-slate-800 font-medium">
              {status?.llama_cloud?.configured ? status.llama_cloud.masked_key : 'LLAMA_CLOUD_API_KEY (Unset)'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Parser Tier</div>
            <div className="font-mono text-slate-800 font-medium capitalize">
              {status?.llama_cloud?.tier || 'cost_effective'}
            </div>
            <div className="text-[10px] text-slate-400">
              Local PyMuPDF & docx fallbacks active for standard files.
            </div>
          </div>
        </div>
      </div>

      {/* Offline Demonstration Mode Guarantee */}
      <div className="bg-white rounded-xl border border-[#1e4836]/12 p-6 shadow-2xs space-y-3">
        <h3 className="font-bold text-sm text-[#123D30] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#137A56]" />
          <span>Offline Demonstration Mode & Data Protection Policy</span>
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          In accordance with Section 0 & Section 10 of the Hackathon Build Specification, TESSERA provides a deterministic offline demonstration mode with synthetic financial fixtures. When live API credentials are not provided, all functions (upload, parsing, conflict detection, generation, validation, and editing) remain fully functional without fabricating live external API calls.
        </p>
      </div>
    </div>
  )
}
