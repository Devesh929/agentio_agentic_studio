import React, { useState, useEffect } from 'react'
import {
  Cpu, FileJson, GitFork, Table as TableIcon, CheckCircle2,
  AlertTriangle, Play, RefreshCw, Bookmark, ShieldCheck, Download,
  ExternalLink, Layers, Check, Info, Sparkles, Send
} from 'lucide-react'
import Editor from '@monaco-editor/react'
import {
  ReactFlow, Background, Controls, Node, Edge
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Project, Artifact, ArtifactVersion, SourceDocument } from '../types'
import { api } from '../api/client'

interface GeneratePageProps {
  activeProject: Project | null
  setCurrentTab: (tab: string) => void
}

export const GeneratePage: React.FC<GeneratePageProps> = ({ activeProject, setCurrentTab }) => {
  const [activeMode, setActiveMode] = useState<'configuration' | 'workflow' | 'mapping' | 'tests'>('configuration')
  const [prompt, setPrompt] = useState(
    'Using @personal_loan_brd.docx and @loan_parameters.xlsx, generate personal loan implementation artefacts.'
  )
  const [modelProfile, setModelProfile] = useState('Balanced')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progressEvents, setProgressEvents] = useState<Array<{ step: string; message: string }>>([])

  // Artifact States
  const [configArtifact, setConfigArtifact] = useState<{ artifact: Artifact; latest_version: ArtifactVersion } | null>(null)
  const [workflowArtifact, setWorkflowArtifact] = useState<{ artifact: Artifact; latest_version: ArtifactVersion } | null>(null)
  const [mappingArtifact, setMappingArtifact] = useState<{ artifact: Artifact; latest_version: ArtifactVersion } | null>(null)
  const [testsArtifact, setTestsArtifact] = useState<{ artifact: Artifact; latest_version: ArtifactVersion } | null>(null)

  // Editor states
  const [editorContent, setEditorContent] = useState('')
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [saveSuccessToast, setSaveSuccessToast] = useState(false)

  // Autocomplete mentions
  const [sources, setSources] = useState<SourceDocument[]>([])
  const [showMentionPicker, setShowMentionPicker] = useState(false)

  const loadProjectArtifacts = async () => {
    if (!activeProject) return
    try {
      const arts = await api.getArtifacts(activeProject.id)
      for (const item of arts) {
        if (item.artifact.artifact_type === 'configuration') {
          setConfigArtifact(item)
          if (item.latest_version?.content_json) {
            setEditorContent(JSON.stringify(item.latest_version.content_json, null, 2))
          }
        } else if (item.artifact.artifact_type === 'workflow') {
          setWorkflowArtifact(item)
        } else if (item.artifact.artifact_type === 'mapping') {
          setMappingArtifact(item)
        } else if (item.artifact.artifact_type === 'test_suite') {
          setTestsArtifact(item)
        }
      }
      const sDocs = await api.getProjectSources(activeProject.id)
      setSources(sDocs)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadProjectArtifacts()
  }, [activeProject?.id])

  const handleRunGeneration = async () => {
    if (!activeProject) return
    setIsGenerating(true)
    setProgressEvents([
      { step: 'INTAKE', message: 'Analyzing prompt scope and source references...' },
      { step: 'RECONCILIATION', message: 'Checking extracted requirements and human decisions...' },
      { step: 'SYNTHESIS', message: 'Synthesizing configuration, workflow graph, mappings, and boundary tests...' },
      { step: 'VALIDATION', message: 'Executing deterministic schema and cross-field constraint validation...' }
    ])

    try {
      await api.triggerGeneration(activeProject.id, prompt, modelProfile)
      await loadProjectArtifacts()
    } catch (err) {
      alert('Generation run failed: ' + (err as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!configArtifact) return
    try {
      const parsed = JSON.parse(editorContent)
      await api.saveNewArtifactVersion(configArtifact.artifact.id, parsed, 'Manual consultant edits from workbench')
      setSaveSuccessToast(true)
      setTimeout(() => setSaveSuccessToast(false), 3000)
      await loadProjectArtifacts()
    } catch (err) {
      alert('Invalid JSON syntax: ' + (err as Error).message)
    }
  }

  const handleApprove = async () => {
    if (!configArtifact?.latest_version) return
    try {
      await api.approveArtifactVersion(configArtifact.latest_version.id, 'Chief Risk Officer')
      alert('Configuration successfully approved and locked for production dispatch!')
      await loadProjectArtifacts()
    } catch (err: any) {
      alert('Approval blocked: ' + err.message)
    }
  }

  const validationSummary = configArtifact?.latest_version?.validation_summary
  const signals = validationSummary?.readiness_signals

  // React Flow data
  const rawWf = workflowArtifact?.latest_version?.content_json
  const wfNodes: Node[] = rawWf?.nodes || []
  const wfEdges: Edge[] = rawWf?.edges || []

  // Mapping data
  const rawMappings = mappingArtifact?.latest_version?.content_json?.mappings || []

  // Tests data
  const rawTests = testsArtifact?.latest_version?.content_json?.test_cases || []

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Workbench Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#123D30]">AI Generation Workbench</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#D7F4E4] text-[#137A56] border border-[#137A56]/20">
              Interactive Studio
            </span>
          </div>
          <p className="text-xs text-[#64736D] mt-0.5">
            Prompt with @source mentions to generate schemas, workflows, field mappings, and test cases with verified provenance.
          </p>
        </div>

        {/* 4 Internal Modes Segmented Control */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-[#1e4836]/12 shadow-2xs self-start">
          <button
            onClick={() => setActiveMode('configuration')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
              activeMode === 'configuration' ? 'bg-[#137A56] text-white shadow-xs' : 'text-[#64736D] hover:text-[#18312B]'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Configuration</span>
          </button>
          <button
            onClick={() => setActiveMode('workflow')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
              activeMode === 'workflow' ? 'bg-[#137A56] text-white shadow-xs' : 'text-[#64736D] hover:text-[#18312B]'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Workflow</span>
          </button>
          <button
            onClick={() => setActiveMode('mapping')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
              activeMode === 'mapping' ? 'bg-[#137A56] text-white shadow-xs' : 'text-[#64736D] hover:text-[#18312B]'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Data Mapping</span>
          </button>
          <button
            onClick={() => setActiveMode('tests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
              activeMode === 'tests' ? 'bg-[#137A56] text-white shadow-xs' : 'text-[#64736D] hover:text-[#18312B]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Tests</span>
          </button>
        </div>
      </div>

      {/* AI Instruction Composer */}
      <div className="bg-white rounded-xl border border-[#1e4836]/12 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs text-[#64736D]">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#137A56]" />
            Natural Language Instruction Composer
          </span>
          <div className="flex items-center gap-2">
            <span>Model Profile:</span>
            <select
              value={modelProfile}
              onChange={(e) => setModelProfile(e.target.value)}
              className="text-xs font-medium px-2 py-1 bg-[#F0F5F1] rounded border border-slate-200 focus:outline-none"
            >
              <option value="Economy">Economy (Instant 8B)</option>
              <option value="Balanced">Balanced (Strict Schema 20B)</option>
              <option value="Thorough">Thorough (Deep Analysis 120B)</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value)
              if (e.target.value.endsWith('@')) {
                setShowMentionPicker(true)
              }
            }}
            placeholder="e.g. Using @personal_loan_brd.docx and @loan_parameters.xlsx, generate the personal loan configuration against @target_loan_config.schema.json..."
            className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#137A56] bg-slate-50/40"
          />

          {/* @ Mention Autocomplete Dropdown */}
          {showMentionPicker && (
            <div className="absolute left-0 bottom-full mb-1 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-30 p-2 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Mention Project Source
              </div>
              {sources.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setPrompt((prev) => prev.slice(0, -1) + `@${s.filename} `)
                    setShowMentionPicker(false)
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-[#F0F5F1] rounded flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium text-slate-800 truncate">@{s.filename}</span>
                  <span className="text-[10px] text-slate-400">{s.role}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowMentionPicker(false)}
                className="w-full text-center text-[10px] text-slate-400 hover:text-slate-600 py-1"
              >
                Close Picker
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-[#64736D]">
            <span>Active Sources:</span>
            {sources.map((s) => (
              <span key={s.id} className="px-2 py-0.5 rounded bg-[#F0F5F1] text-slate-700 font-mono text-[10px]">
                @{s.filename}
              </span>
            ))}
          </div>

          <button
            onClick={handleRunGeneration}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#137A56] hover:bg-[#123D30] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Synthesizing Artefacts...' : 'Generate / Regenerate'}</span>
          </button>
        </div>

        {/* Progress Pipeline Events */}
        {isGenerating && (
          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 text-xs space-y-1 animate-pulse">
            <div className="font-semibold text-[#137A56] flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Pipeline In-Progress</span>
            </div>
            {progressEvents.map((ev, idx) => (
              <div key={idx} className="text-[11px] text-slate-600 flex items-center gap-2">
                <span className="font-mono text-[10px] text-slate-400">[{ev.step}]</span>
                <span>{ev.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4-Signal Independent Readiness Bar */}
      {signals && (
        <div className="bg-white rounded-xl border border-[#1e4836]/12 p-4 shadow-2xs grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase font-bold">1. Target Schema</div>
            <div className="font-bold text-sm text-emerald-700 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{signals.target_schema}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase font-bold">2. Citation Coverage</div>
            <div className="font-bold text-sm text-[#137A56] mt-0.5">
              {signals.citation_coverage}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase font-bold">3. Blocking Questions</div>
            <div className="font-bold text-sm text-amber-700 mt-0.5">
              {signals.unresolved_questions}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase font-bold">4. Semantic Checks</div>
            <div className="font-bold text-sm text-emerald-700 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{signals.semantic_rule_checks}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Internal Mode Views */}

      {/* MODE 1: CONFIGURATION */}
      {activeMode === 'configuration' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monaco Editor (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-[#1e4836]/12 overflow-hidden shadow-2xs flex flex-col h-[520px]">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-[#137A56]" />
                <span className="font-bold text-xs text-slate-900">
                  {configArtifact?.artifact?.name || 'Personal Loan Product Configuration'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-200 text-slate-700">
                  v{configArtifact?.latest_version?.version_number || 1}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {saveSuccessToast && (
                  <span className="text-[11px] text-emerald-600 font-semibold animate-pulse">
                    Saved as new revision!
                  </span>
                )}
                <button
                  onClick={handleSaveDraft}
                  className="px-3 py-1.5 rounded-lg bg-[#137A56] hover:bg-[#123D30] text-white text-xs font-medium cursor-pointer transition"
                >
                  Save Draft Revision
                </button>
                <button
                  onClick={handleApprove}
                  className="px-3 py-1.5 rounded-lg border border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold cursor-pointer transition"
                >
                  Submit Approval
                </button>
              </div>
            </div>

            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="json"
                value={editorContent}
                onChange={(val) => setEditorContent(val || '')}
                theme="light"
                options={{
                  fontSize: 12,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                }}
              />
            </div>
          </div>

          {/* Citations & Evidence Panel (1 col) */}
          <div className="bg-white rounded-xl border border-[#1e4836]/12 p-4 shadow-2xs flex flex-col h-[520px] overflow-y-auto space-y-3">
            <div className="text-xs font-bold text-[#123D30] uppercase tracking-wider flex items-center justify-between">
              <span>Field-Level Provenance</span>
              <span className="text-[10px] text-slate-400">Exact citations</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-mono text-[11px] font-bold text-[#137A56]">
                  /eligibility/min_age
                </div>
                <div className="text-[11px] text-slate-600">
                  Grounding: <span className="font-semibold text-slate-800">personal_loan_brd.docx [P2]</span>
                </div>
                <div className="text-[10px] text-slate-500 italic">
                  &quot;Eligible applicants must be between 21 and 60 years old...&quot;
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 space-y-1">
                <div className="font-mono text-[11px] font-bold text-amber-800 flex items-center justify-between">
                  <span>/eligibility/max_age</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold uppercase">
                    Discrepancy
                  </span>
                </div>
                <div className="text-[11px] text-slate-700">
                  Competing Sources: <span className="font-semibold">BRD [P2] (60)</span> vs <span className="font-semibold">loan_parameters.xlsx [Eligibility!B3] (65)</span>
                </div>
                <button
                  onClick={() => setCurrentTab('questions')}
                  className="text-[10px] font-bold text-[#137A56] hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                >
                  <span>Resolve in Questions Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-mono text-[11px] font-bold text-[#137A56]">
                  /limits/max_loan_amount
                </div>
                <div className="text-[11px] text-slate-600">
                  Grounding: <span className="font-semibold text-slate-800">personal_loan_brd.docx [P3] & xlsx [Loan Limits!C2]</span>
                </div>
                <div className="text-[10px] text-slate-500 italic">
                  &quot;...maximum loan amount is ₹25,00,000...&quot;
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 space-y-1">
                <div className="font-mono text-[11px] font-bold text-amber-800 flex items-center justify-between">
                  <span>/workflow/committee_approval_threshold</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold uppercase">
                    Ambiguity
                  </span>
                </div>
                <div className="text-[11px] text-slate-700">
                  BRD states &apos;large loans need additional approval&apos;; Parameter sheet Approvals tab defines L2 limit as ₹15,00,000.
                </div>
                <button
                  onClick={() => setCurrentTab('questions')}
                  className="text-[10px] font-bold text-[#137A56] hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                >
                  <span>Resolve in Questions Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: WORKFLOW (React Flow) */}
      {activeMode === 'workflow' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-[#1e4836]/12 overflow-hidden shadow-2xs h-[520px]">
            <ReactFlow
              nodes={wfNodes}
              edges={wfEdges}
              onNodeClick={(_, node) => setSelectedNode(node)}
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>

          {/* Workflow Property Inspector */}
          <div className="bg-white rounded-xl border border-[#1e4836]/12 p-4 shadow-2xs flex flex-col h-[520px] overflow-y-auto space-y-3">
            <div className="text-xs font-bold text-[#123D30] uppercase tracking-wider">
              Workflow Node Inspector
            </div>

            {selectedNode ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#F0F5F1] rounded-lg border border-[#1e4836]/10">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Node Label</div>
                  <div className="font-bold text-sm text-[#123D30] mt-0.5">
                    {selectedNode.data?.label}
                  </div>
                  <div className="text-[11px] text-[#137A56] font-mono mt-0.5">
                    ID: {selectedNode.id} • Kind: {selectedNode.data?.kind}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-semibold text-slate-700">Configuration Details</div>
                  <pre className="text-[10px] font-mono text-slate-700 bg-slate-50 p-3 rounded border border-slate-200 overflow-x-auto">
                    {JSON.stringify(selectedNode.data, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-slate-500">
                Click any workflow node in the canvas to inspect its validation rules, conditions, and CBS integration triggers.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: DATA MAPPING */}
      {activeMode === 'mapping' && (
        <div className="bg-white rounded-xl border border-[#1e4836]/12 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-[#123D30] uppercase tracking-wider">
              Source-to-Target Data Mapping Specification ({rawMappings.length} Fields)
            </span>
            <span className="text-[11px] text-slate-500">
              Target Schema: AzentioPersonalLoanConfig Draft-07
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-4 py-2.5">Target Field</th>
                  <th className="px-4 py-2.5">Source Document & Field</th>
                  <th className="px-4 py-2.5">Source Type</th>
                  <th className="px-4 py-2.5">Target Type</th>
                  <th className="px-4 py-2.5">Transformation</th>
                  <th className="px-4 py-2.5">Evidence Citation</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rawMappings.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-[#137A56] font-semibold">
                      {m.target_field}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{m.source_field}</div>
                      <div className="text-[10px] text-slate-500">{m.source_file}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{m.source_type}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{m.target_type}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-700 bg-slate-50 px-2 py-1 rounded">
                      {m.transformation}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                      {m.evidence}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {m.validation_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODE 4: TESTS (Boundary + Positive + Negative) */}
      {activeMode === 'tests' && (
        <div className="bg-white rounded-xl border border-[#1e4836]/12 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#123D30] uppercase tracking-wider">
                Boundary & Conformance Test Suite ({rawTests.length} Generated Test Cases)
              </span>
              <p className="text-[11px] text-slate-500">
                Automated tests derived from confirmed business rules. Tests the inclusive 21 to 60/65 age boundaries (20, 21, 60, 61) and loan amounts.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-4 py-2.5">Test ID</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Scenario Description</th>
                  <th className="px-4 py-2.5">Test Inputs</th>
                  <th className="px-4 py-2.5">Expected Outcome</th>
                  <th className="px-4 py-2.5">Source Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rawTests.map((t: any) => {
                  const isReject = t.expected_result === 'REJECT'
                  return (
                    <tr key={t.test_id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        {t.test_id}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {t.description}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        {JSON.stringify(t.inputs)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isReject
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {t.expected_result} ({t.expected_code})
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                        {t.source_citation}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
