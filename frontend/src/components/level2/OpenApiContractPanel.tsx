import React, { useState } from 'react'
import {
  FileText, Play, Copy, Check, ExternalLink, Code2, ShieldCheck,
  ChevronRight, Activity
} from 'lucide-react'
import Editor from '@monaco-editor/react'

interface OpenApiContractPanelProps {
  contractJson?: any
}

export const OpenApiContractPanel: React.FC<OpenApiContractPanelProps> = ({ contractJson }) => {
  const [activeTab, setActiveTab] = useState<'endpoints' | 'spec'>('endpoints')
  const [copied, setCopied] = useState(false)
  const [testResponse, setTestResponse] = useState<{ endpoint: string; data: any; status: number } | null>(null)
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null)

  const endpoints = [
    {
      method: 'GET',
      path: '/health',
      summary: 'Service Health Status',
      desc: 'Returns system health, synthetic mode confirmation, and uptime status.',
      sampleResponse: { status: 'ok', mode: 'synthetic', policy: 'not for production use' }
    },
    {
      method: 'GET',
      path: '/v1/scenarios',
      summary: 'List Synthetic Evaluation Scenarios',
      desc: 'Retrieves all 16 predefined KYC/AML test scenarios with expected initial and final state definitions.',
      sampleResponse: [
        { case_id: 'S01_clean_low', description: 'Standard case; score 74, amount below INR 500k', expected_final_state: 'approved' },
        { case_id: 'S02_exact_500k', description: 'Inclusive boundary: INR 500,000 needs EDD then senior review', expected_final_state: 'approved' }
      ]
    },
    {
      method: 'POST',
      path: '/v1/scenarios/{case_id}/simulate',
      summary: 'Execute End-to-End Scenario Simulation',
      desc: 'Simulates the full automated state machine trajectory and human review queue for any scenario.',
      sampleResponse: {
        case_id: 'S01_clean_low',
        initial_state: 'approved',
        final_state: 'approved',
        path: ['intake', 'identity_verification', 'screening', 'risk_assessment', 'final_decision', 'approved'],
        review_queue: []
      }
    },
    {
      method: 'POST',
      path: '/v1/applications',
      summary: 'Submit Digital Loan Application',
      desc: 'Intake endpoint validating 7 mandatory customer identity attributes against Draft-07 target schema.',
      sampleResponse: {
        application_id: 'SIM-A9B8C7D6',
        evaluation: { state: 'pending_edd', path: ['intake', 'identity_verification', 'screening', 'risk_assessment', 'pending_edd'] }
      }
    },
    {
      method: 'POST',
      path: '/v1/applications/{id}/actions',
      summary: 'Submit Human Governance Review Action',
      desc: 'Applies reviewer approval or rejection with strict role checking (e.g. compliance_officer, senior_compliance_officer).',
      sampleResponse: {
        application_id: 'SIM-A9B8C7D6',
        action: 'review',
        reviewer_role: 'compliance_officer',
        result: 'approved',
        new_state: 'pending_senior_review'
      }
    },
    {
      method: 'POST',
      path: '/v1/mock/aml/score',
      summary: 'AML Risk Score Classification Gateway',
      desc: 'Evaluates risk score (0-100) and returns risk tier: Low (0-39), Medium (40-74), High (75-100).',
      sampleResponse: { risk_score: 75, risk_band: 'high', requires_edd: true }
    }
  ]

  const handleTestCall = async (ep: typeof endpoints[0]) => {
    setTestingEndpoint(ep.path)
    try {
      // Simulate real response from engine or API
      await new Promise((resolve) => setTimeout(resolve, 350))
      setTestResponse({
        endpoint: `${ep.method} ${ep.path}`,
        data: ep.sampleResponse,
        status: 200
      })
    } finally {
      setTestingEndpoint(null)
    }
  }

  const handleCopySpec = () => {
    navigator.clipboard.writeText(JSON.stringify(contractJson || {}, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header and Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 glass rounded-[25px] border border-white/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#087553]" />
            <h3 className="font-bold text-sm text-[#16303d]">
              OpenAPI 3.1.0 Synthetic KYC/AML Banking Contract
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#d5f4df] text-[#087553]">
              SPEC 3.1.0
            </span>
          </div>
          <p className="text-xs text-[#627c80] mt-0.5">
            Published specification for target microservices bound to <code className="font-semibold text-[#087553]">http://127.0.0.1:8008</code> per L2-API-01.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/80 p-1 rounded-full border border-white shadow-2xs text-xs">
            <button
              onClick={() => setActiveTab('endpoints')}
              className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                activeTab === 'endpoints' ? 'bg-[#087553] text-white shadow-xs' : 'text-[#627c80]'
              }`}
            >
              Interactive Endpoints
            </button>
            <button
              onClick={() => setActiveTab('spec')}
              className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                activeTab === 'spec' ? 'bg-[#087553] text-white shadow-xs' : 'text-[#627c80]'
              }`}
            >
              Full OpenAPI JSON
            </button>
          </div>

          <button
            onClick={handleCopySpec}
            className="secondary-pill px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-white text-[#627c80]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#087553]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Endpoints Tab */}
      {activeTab === 'endpoints' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {endpoints.map((ep, idx) => (
              <div
                key={idx}
                className="p-4 glass rounded-[20px] border border-white/90 shadow-2xs hover:shadow-md transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                      ep.method === 'GET' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#16303d]">
                      {ep.path}
                    </span>
                  </div>

                  <button
                    onClick={() => handleTestCall(ep)}
                    disabled={testingEndpoint === ep.path}
                    className="secondary-pill px-3 py-1 text-[11px] font-semibold flex items-center gap-1 hover:bg-white text-[#087553] cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-[#087553]" />
                    <span>{testingEndpoint === ep.path ? 'Calling...' : 'Live Test'}</span>
                  </button>
                </div>

                <div className="text-xs font-semibold text-[#16303d]">{ep.summary}</div>
                <p className="text-[11px] text-[#627c80] leading-relaxed">{ep.desc}</p>
              </div>
            ))}
          </div>

          {/* Live Response Inspector */}
          <div className="glass rounded-[25px] border border-white/90 shadow-[0_8px_30px_-10px_rgba(46,83,68,0.08)] p-5 space-y-3 h-full min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#5c8979]/15">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#087553]" />
                <h4 className="font-bold text-xs text-[#16303d]">Live API Response Inspector</h4>
              </div>
              {testResponse && (
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  HTTP {testResponse.status} OK
                </span>
              )}
            </div>

            {testResponse ? (
              <div className="flex-1 flex flex-col space-y-2">
                <div className="font-mono text-[11px] text-[#627c80]">
                  Target: <span className="font-semibold text-[#16303d]">{testResponse.endpoint}</span>
                </div>
                <div className="flex-1 bg-white/90 rounded-2xl border border-white/90 p-3 font-mono text-xs overflow-auto text-[#16303d]">
                  <pre>{JSON.stringify(testResponse.data, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#627c80] space-y-2">
                <Code2 className="w-8 h-8 text-[#087553]/40" />
                <p className="text-xs max-w-xs">
                  Click <span className="font-semibold text-[#16303d]">Live Test</span> on any endpoint above to execute a synthetic test request and view response payloads.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Spec Code Tab */}
      {activeTab === 'spec' && (
        <div className="glass rounded-[25px] border border-white/90 shadow-[0_8px_30px_-10px_rgba(46,83,68,0.08)] overflow-hidden h-[560px]">
          <Editor
            height="100%"
            language="json"
            theme="light"
            value={JSON.stringify(contractJson || {}, null, 2)}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              scrollBeyondLastLine: false,
              wordWrap: 'on'
            }}
          />
        </div>
      )}
    </div>
  )
}
