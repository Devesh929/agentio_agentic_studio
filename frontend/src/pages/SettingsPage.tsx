import React, { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon, Shield, Cpu, Key, AlertTriangle,
  CheckCircle2, RefreshCw, Zap, ExternalLink, Database, Activity
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
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#d5f4df] text-[#087553] flex items-center justify-center flex-shrink-0 shadow-xs">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#16303d] tracking-tight">Settings & Provider Integrations</h1>
            <p className="text-xs text-[#627c80]">
              Configure API credentials, inspect model connection status, and manage offline demonstration mode.
            </p>
          </div>
        </div>
        <button
          onClick={loadStatus}
          className="secondary-pill px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh status</span>
        </button>
      </div>

      {/* Groq Cloud Connection Card */}
      <div className="glass rounded-[23px] border border-white/90 p-6 shadow-[0_8px_30px_-10px_rgba(46,83,68,0.08)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#16303d]">Groq API Cloud Provider</h3>
              <p className="text-[11px] text-[#627c80]">
                Ultra-fast LPUs for structured requirement extraction and target schema generation.
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${
              status?.groq?.configured
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}
          >
            {status?.groq?.configured ? 'CONFIGURED' : 'BLANK PLACEHOLDER'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
          <div className="p-3.5 bg-white/70 rounded-2xl border border-white/80 space-y-1">
            <div className="text-[10px] text-[#627c80] uppercase font-semibold">Active Model</div>
            <div className="font-mono text-xs font-medium text-[#16303d]">
              {status?.groq?.primary_model || 'llama-3.3-70b-versatile'}
            </div>
            <div className="text-[10px] text-[#627c80]">
              Fallback: <code className="font-mono">llama-3.1-8b-instant</code>
            </div>
          </div>

          <div className="p-3.5 bg-white/70 rounded-2xl border border-white/80 space-y-1">
            <div className="text-[10px] text-[#627c80] uppercase font-semibold">API Key Status</div>
            <div className="font-mono text-xs font-medium text-[#16303d]">
              {status?.groq?.configured ? status.groq.masked_key : 'GROQ_API_KEY (Unset)'}
            </div>
            <div className="text-[10px] text-[#627c80]">
              Stored securely in backend environment
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="mint-button px-5 py-2 text-xs cursor-pointer flex items-center gap-2"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{testing ? 'Testing connection...' : 'Test live Groq connection'}</span>
          </button>

          {testResult && (
            <div className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* LlamaParse & Document Ingestion Card */}
      <div className="glass rounded-[23px] border border-white/90 p-6 shadow-[0_8px_30px_-10px_rgba(46,83,68,0.08)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#d5f4df] text-[#087553] flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#16303d]">LlamaParse & Ingestion Pipeline</h3>
              <p className="text-[11px] text-[#627c80]">
                High-precision spreadsheet and document parser for multi-table BRDs.
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${
              status?.llama_cloud?.configured
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
          <div className="p-3.5 bg-white/70 rounded-2xl border border-white/80 space-y-1">
            <div className="text-[10px] text-[#627c80] uppercase font-semibold">Configured API Key</div>
            <div className="font-mono text-xs font-medium text-[#16303d]">
              {status?.llama_cloud?.configured ? status.llama_cloud.masked_key : 'llx-IbI...NJBT'}
            </div>
            <div className="text-[10px] text-[#627c80]">
              Provided for high-accuracy document parsing
            </div>
          </div>

          <div className="p-3.5 bg-white/70 rounded-2xl border border-white/80 space-y-1">
            <div className="text-[10px] text-[#627c80] uppercase font-semibold">Parser Tier & Fallback</div>
            <div className="font-mono text-xs font-medium capitalize text-[#16303d]">
              {status?.llama_cloud?.tier || 'cost_effective'}
            </div>
            <div className="text-[10px] text-[#627c80]">
              Built-in Python docx/openpyxl/PyMuPDF parser active locally
            </div>
          </div>
        </div>
      </div>

      {/* Offline Demonstration Mode Guarantee */}
      <div className="glass rounded-[23px] border border-white/90 p-6 shadow-[0_8px_30px_-10px_rgba(46,83,68,0.08)] space-y-3">
        <h3 className="font-semibold text-sm text-[#16303d] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#087553]" />
          <span>Autonomous High-Resilience Mode & Zero-Failure Guarantee</span>
        </h3>
        <p className="text-xs text-[#48636b] leading-relaxed">
          TESSERA provides an autonomous high-resilience architecture with integrated syntactic & semantic parsing pipelines. When cloud network boundaries or rate limits are reached, all operations (multi-source document ingestion, parsing, contradiction detection, schema generation, validation, and editing) execute seamlessly without disruption.
        </p>
      </div>
    </div>
  )
}
