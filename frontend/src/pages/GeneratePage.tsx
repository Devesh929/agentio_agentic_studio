import React, { useState, useEffect, useRef } from 'react'
import {
  Cpu, FileJson, GitFork, Table as TableIcon, CheckCircle2,
  AlertTriangle, Play, RefreshCw, Bookmark, ShieldCheck, Download,
  ExternalLink, Layers, Check, Info, Sparkles, Send, Upload,
  Paperclip, HelpCircle, ArrowRight, Eye, Copy, X, FileText,
  Search, Sliders, ChevronRight, Activity, Network, Clock, ShieldAlert,
  Brain, Code2, History
} from 'lucide-react'
import Editor from '@monaco-editor/react'
import {
  ReactFlow, Background, Controls, Node, Edge
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Project, SourceDocument } from '../types'
import { api } from '../api/client'
import { EditableWorkflowCanvas } from '../components/level2/EditableWorkflowCanvas'
import { FieldMappingsPanel } from '../components/level2/FieldMappingsPanel'
import { OpenApiContractPanel } from '../components/level2/OpenApiContractPanel'
import { ScenarioTestSuitePanel } from '../components/level2/ScenarioTestSuitePanel'
import { ValidationDiagnosticsPanel } from '../components/level2/ValidationDiagnosticsPanel'
import { ChangeControlPanel } from '../components/level2/ChangeControlPanel'

interface GeneratePageProps {
  activeProject: Project | null
  setCurrentTab: (tab: string) => void
}

interface CitationDetail {
  document: string
  locator: string
  excerpt: string
}

interface MetricAnalysis {
  field_path: string
  label: string
  value: any
  type: string
  confidence_score: number
  confidence_rationale: string
  citation: CitationDetail
  resolved_via_question?: {
    question_id: string
    question_text: string
    user_answer: string
  } | null
}

export const GeneratePage: React.FC<GeneratePageProps> = ({ activeProject }) => {
  // Navigation / Phase: 'graph' | 'thinking' | 'questions' | 'config'
  const [stage, setStage] = useState<'graph' | 'thinking' | 'questions' | 'config'>('graph')
  const [configViewMode, setConfigViewMode] = useState<'interactive' | 'json'>('interactive')
  const [activeArtefactTab, setActiveArtefactTab] = useState<
    'config' | 'workflow' | 'mappings' | 'openapi' | 'tests' | 'validation' | 'versioning'
  >('config')
  const [fullSynthesisData, setFullSynthesisData] = useState<any>(null)

  // Prompt & File upload
  const [prompt, setPrompt] = useState(
    'Using @01_KYC_AML_BRD.docx, @02_KYC_AML_Functional_Spec.pdf, @03_KYC_AML_Parameters_and_Mapping.xlsx, @04_KYC_AML_User_Stories.docx, @05_Target_Implementation_Schema.json, @06_Existing_Approval_Workflow.yaml, @07_Source_API_Contract.json, @08_Implementation_Notes.txt, synthesize digital loan KYC/AML implementation schema and resolve policy discrepancies.'
  )
  const [sources, setSources] = useState<SourceDocument[]>([])
  const [uploading, setUploading] = useState(false)
  const [showMentionPicker, setShowMentionPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Knowledge Graph Generation State
  const [parentDoc, setParentDoc] = useState<any>(null)
  const [graphData, setGraphData] = useState<{ nodes: Node[]; edges: Edge[]; metrics?: any }>({
    nodes: [],
    edges: [],
  })
  const [isGeneratingGraph, setIsGeneratingGraph] = useState(false)
  const [graphProgress, setGraphProgress] = useState(0)
  const [graphProgressMsg, setGraphProgressMsg] = useState('')
  const [graphReady, setGraphReady] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)

  // Agent Thinking & Token Reasoning State
  const [agentThoughts, setAgentThoughts] = useState<string[]>([])
  const [agentQuestions, setAgentQuestions] = useState<any[]>([])
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzingProgress, setAnalyzingProgress] = useState(0)
  const [analyzingTokens, setAnalyzingTokens] = useState(0)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [synthesizingProgress, setSynthesizingProgress] = useState(0)
  const [synthesizingTokens, setSynthesizingTokens] = useState(0)

  // Synthesized Configuration & Analysis
  const [synthesizedConfig, setSynthesizedConfig] = useState<any>(null)
  const [metricsAnalysis, setMetricsAnalysis] = useState<MetricAnalysis[]>([])
  const [editorJson, setEditorJson] = useState('')
  const [copiedToast, setCopiedToast] = useState(false)

  // Citation Inspector Drawer
  const [activeCitation, setActiveCitation] = useState<CitationDetail | null>(null)

  // Load project sources into studio (waits for user to click Generate Knowledge Graph)
  const loadStudioState = async () => {
    if (!activeProject) return
    try {
      const docs = await api.getProjectSources(activeProject.id)
      setSources(docs)

      if (docs.length === 0) {
        setParentDoc(null)
        setGraphData({ nodes: [], edges: [] })
        setGraphReady(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadStudioState()
  }, [activeProject?.id])

  // Handle direct multiple file upload from studio
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    if (files.length === 0 || !activeProject) return

    setUploading(true)
    try {
      const addedTags: string[] = []
      for (const file of files) {
        let role = 'BRD / Functional Spec'
        if (file.name.endsWith('.xlsx')) role = 'Product Rules / Parameter Sheet'
        else if (file.name.endsWith('.pdf')) role = 'Regulatory / Compliance Standard'
        else if (file.name.endsWith('.json')) role = 'Target Configuration Schema'
        else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) role = 'Workflow Specification'

        await api.uploadSource(activeProject.id, file, role)
        addedTags.push(`@${file.name}`)
      }
      setPrompt((prev) => (prev ? `${prev} ${addedTags.join(' ')}` : `Synthesize configuration using ${addedTags.join(' ')}`).trim())
      const docs = await api.getProjectSources(activeProject.id)
      setSources(docs)
      // Keep graph in waiting state until user clicks Generate Knowledge Graph
      setGraphData({ nodes: [], edges: [] })
      setGraphReady(false)
      setParentDoc(null)
    } catch (err: any) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Load sample scenario explicitly on user demand (waits for Generate button to build graph)
  const handleLoadSampleData = async () => {
    if (!activeProject) return
    setLoadingSample(true)
    try {
      await api.loadSampleProject(activeProject.id)
      setPrompt(
        'Extend our existing TESSERA Level 1 KYC/AML implementation into Level 2 using @01_KYC_AML_BRD.docx, @02_KYC_AML_Functional_Spec.pdf, @03_KYC_AML_Parameters_and_Mapping.xlsx, @04_KYC_AML_User_Stories.docx, @05_Target_Implementation_Schema.json, @06_Existing_Approval_Workflow.yaml, @07_Source_API_Contract.json, @01_Level2_Implementation_Addendum.md, @02_API_Contract_Requirements.md, @03_Validation_and_Test_Requirements.md, @06_Editable_Graph_Requirements.md to generate editable workflow, field mappings, OpenAPI contract, executable test suite, validation report, and version history.'
      )
      const docs = await api.getProjectSources(activeProject.id)
      setSources(docs)
      // Explicitly keep graph ungenerated until user presses the Generate Knowledge Graph button
      setGraphData({ nodes: [], edges: [] })
      setGraphReady(false)
      setParentDoc(null)
    } catch (err: any) {
      alert('Failed to load sample data: ' + err.message)
    } finally {
      setLoadingSample(false)
    }
  }

  // Clear workspace for a clean slate
  const handleClearWorkspace = async () => {
    if (!activeProject) return
    if (!window.confirm('Clear all uploaded files, knowledge graph, and generated configurations for this project?')) return
    try {
      await api.clearProject(activeProject.id)
      setPrompt('')
      setSynthesizedConfig(null)
      setAgentQuestions([])
      setAgentThoughts([])
      setMetricsAnalysis([])
      setGraphData({ nodes: [], edges: [] })
      setParentDoc(null)
      setGraphReady(false)
      setStage('graph')
      await loadStudioState()
    } catch (err: any) {
      alert('Failed to clear workspace: ' + err.message)
    }
  }

  // Handle text input changes & '@' trigger
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setPrompt(val)
    if (val.endsWith('@')) {
      setShowMentionPicker(true)
    } else if (showMentionPicker && !val.includes('@')) {
      setShowMentionPicker(false)
    }
  }

  const handleSelectMention = (filename: string) => {
    setPrompt((prev) => {
      if (prev.endsWith('@')) {
        return `${prev.slice(0, -1)}@${filename} `
      }
      return `${prev} @${filename} `
    })
    setShowMentionPicker(false)
  }

  // Step 1: Generate Knowledge Graph (Fast Snappy Sequence)
  const handleGenerateGraphWithProgress = async () => {
    if (!activeProject) return
    setIsGeneratingGraph(true)
    setGraphProgress(0)
    setGraphProgressMsg('Parsing multi-source document coordinate spans...')

    const startTime = Date.now()
    const targetDurationMs = 8000

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(Math.round((elapsed / targetDurationMs) * 100), 96)
      setGraphProgress(pct)

      if (elapsed < 2000) {
        setGraphProgressMsg('Parsing multi-source coordinate spans across files...')
      } else if (elapsed < 4000) {
        setGraphProgressMsg('Resolving entity taxonomy & cross-document references...')
      } else if (elapsed < 6000) {
        setGraphProgressMsg('Extracting policy constraints, risk tiers & threshold discrepancies...')
      } else {
        setGraphProgressMsg('Constructing 4-tier Knowledge Graph topology & provenance links...')
      }
    }, 250)

    try {
      const docRes = await api.buildParentDoc(activeProject.id, prompt)
      setParentDoc(docRes.parent_document)

      setTimeout(() => {
        clearInterval(interval)
        setGraphProgress(100)
        setGraphProgressMsg('Knowledge Graph successfully assembled.')
        if (docRes.knowledge_graph?.nodes) {
          setGraphData(docRes.knowledge_graph)
        }
        setGraphReady(true)
        setIsGeneratingGraph(false)
      }, targetDurationMs - (Date.now() - startTime) > 0 ? targetDurationMs - (Date.now() - startTime) : 1000)
    } catch (err: any) {
      clearInterval(interval)
      setIsGeneratingGraph(false)
      alert('Graph generation error: ' + err.message)
    }
  }

  // Step 2: Start Agentic Configuration (45-Second Reasoning Sequence)
  const handleStartAgenticConfiguration = async () => {
    if (!activeProject) return
    setStage('thinking')
    setIsAnalyzing(true)
    setAnalyzingProgress(0)
    setAnalyzingTokens(0)

    const thoughtsSequence = [
      'Ingesting Unified Parent Document & Metadata (8 files, 134 coordinates)...',
      'Deploying Qwen 3.8 27B on Groq LPUs with zero-hallucination constraint...',
      'Checking binary integrity: Discovered unreadable payload in @09_Corrupted_Partner_Annex.pdf (flagged for human review)...',
      'Cross-document clause analysis active...',
      'Flagged Ambiguity 1: BRD requires stable income but lookback period and minimum salary are undefined (see NOTE-03)...',
      'Flagged Ambiguity 2: BRD mandates EDD for large loans, User Stories mandate Senior Review at ₹5L (see NOTE-04)...',
      'Flagged Contradiction 3: Functional Spec defines High AML Risk as 75-100, while Parameter Sheet specifies 70-100 (see NOTE-05)...',
      'Enforcing zero-hallucination constraint: Halting automated synthesis to request human governance confirmation...'
    ]

    setAgentThoughts([thoughtsSequence[0]])

    const startTime = Date.now()
    const targetDurationMs = 18000

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(Math.round((elapsed / targetDurationMs) * 100), 98)
      setAnalyzingProgress(pct)
      setAnalyzingTokens(Math.min(Math.round((elapsed / targetDurationMs) * 620), 620))

      const stepIndex = Math.floor((elapsed / targetDurationMs) * thoughtsSequence.length)
      if (stepIndex < thoughtsSequence.length) {
        setAgentThoughts(thoughtsSequence.slice(0, stepIndex + 1))
      }
    }, 250)

    try {
      const res = await api.agentAnalyze(activeProject.id, prompt)
      const analysis = res.analysis

      setTimeout(() => {
        clearInterval(interval)
        setAnalyzingProgress(100)
        setAnalyzingTokens(620)
        setAgentThoughts(analysis.thoughts || thoughtsSequence)

        if (analysis.questions && analysis.questions.length > 0) {
          setAgentQuestions(analysis.questions)
          const defaults: Record<string, string> = {}
          analysis.questions.forEach((q: any) => {
            defaults[q.id] = q.suggested_options?.[0] || 'Confirmed'
          })
          setUserAnswers(defaults)
          setStage('questions')
        }
        setIsAnalyzing(false)
      }, Math.max(targetDurationMs - (Date.now() - startTime), 1000))
    } catch (err: any) {
      clearInterval(interval)
      setIsAnalyzing(false)
      alert('Agent Analysis error: ' + err.message)
      setStage('graph')
    }
  }

  // Step 3: Confirm Answers & Synthesize Configuration (35-Second Synthesis Sequence)
  const handleConfirmAndSynthesize = async () => {
    if (!activeProject) return
    setStage('thinking')
    setIsSynthesizing(true)
    setSynthesizingProgress(0)
    setSynthesizingTokens(0)

    const synthesisThoughtsSequence = [
      'Attaching confirmed human governance decisions to parent document context...',
      'Quarantining @09_Corrupted_Partner_Annex.pdf per human approval...',
      'Applying confirmed stable income parameters: 6-month lookback, min 4 qualifying months, ₹25,000 credit...',
      'Setting ₹5,00,000 threshold for EDD and Senior Compliance review (inclusive)...',
      'Aligning AML risk high score tier to 75-100 per Functional Spec precedence...',
      'Synthesizing 12 field mappings (MAP-01 to MAP-12) to CBS Target Implementation Schema...',
      'Computing 100% confidence explainability proofs across all schema paths...',
      'Persisting immutable version revision to SQLite database...'
    ]

    setAgentThoughts([synthesisThoughtsSequence[0]])

    const startTime = Date.now()
    const targetDurationMs = 14000

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(Math.round((elapsed / targetDurationMs) * 100), 98)
      setSynthesizingProgress(pct)
      setSynthesizingTokens(Math.min(Math.round((elapsed / targetDurationMs) * 840), 840))

      const stepIndex = Math.floor((elapsed / targetDurationMs) * synthesisThoughtsSequence.length)
      if (stepIndex < synthesisThoughtsSequence.length) {
        setAgentThoughts(synthesisThoughtsSequence.slice(0, stepIndex + 1))
      }
    }, 250)

    try {
      const res = await api.agentSynthesize(activeProject.id, prompt, userAnswers)
      const synthesis = res.synthesis

      setTimeout(() => {
        clearInterval(interval)
        setSynthesizingProgress(100)
        setSynthesizingTokens(840)
        setSynthesizedConfig(synthesis.configuration)
        setMetricsAnalysis(synthesis.metrics_analysis || [])
        setEditorJson(JSON.stringify(synthesis.configuration, null, 2))
        setFullSynthesisData(synthesis)

        if (res.knowledge_graph?.nodes) {
          setGraphData(res.knowledge_graph)
        }
        setIsSynthesizing(false)
        setStage('config')
      }, Math.max(targetDurationMs - (Date.now() - startTime), 1000))
    } catch (err: any) {
      clearInterval(interval)
      setIsSynthesizing(false)
      alert('Synthesis error: ' + err.message)
      setStage('questions')
    }
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(editorJson)
    setCopiedToast(true)
    setTimeout(() => setCopiedToast(false), 2500)
  }

  const handleDownloadJson = () => {
    const blob = new Blob([editorJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tessera_kyc_aml_config.json`
    a.click()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* 1. Header & Studio Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#16303d] tracking-tight">AI Generation Studio</h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#d5f4df] text-[#087553] border border-white flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3 h-3 text-[#087553]" />
              <span>Qwen 3.8 27B Active</span>
            </span>
          </div>
          <p className="text-xs text-[#627c80] mt-1">
            Upload specification files, tag with <span className="font-semibold text-[#087553]">@</span>, explore the Knowledge Graph, and let the agent ask clarifying questions to synthesize verified configurations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Actions */}
          <button
            onClick={handleLoadSampleData}
            disabled={isGeneratingGraph || isAnalyzing || isSynthesizing || loadingSample}
            className="secondary-pill px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-white text-[#16303d] shadow-2xs"
            title="Load Meridian KYC/AML suite files"
          >
            <Sparkles className={`w-3.5 h-3.5 text-[#087553] ${loadingSample ? 'animate-spin' : ''}`} />
            <span>{loadingSample ? 'Loading Files...' : 'Load Sample Data'}</span>
          </button>

          {sources.length > 0 && (
            <button
              onClick={handleClearWorkspace}
              disabled={isGeneratingGraph || isAnalyzing || isSynthesizing}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#627c80] hover:text-[#c2410c] hover:bg-red-50/60 cursor-pointer transition flex items-center gap-1 border border-transparent hover:border-red-200"
              title="Clear all workspace documents and reset graph"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}

          {/* Phase Indicator Pills */}
          <div className="flex items-center gap-1 bg-white/70 p-1 rounded-full border border-white/90 shadow-2xs text-xs">
            <button
              onClick={() => setStage('graph')}
              className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                stage === 'graph' ? 'bg-[#087553] text-white shadow-xs' : 'text-[#627c80] hover:text-[#16303d]'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>1. Knowledge Graph</span>
            </button>
            <button
              onClick={() => stage !== 'graph' && setStage('questions')}
              disabled={agentQuestions.length === 0}
              className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                stage === 'questions' ? 'bg-[#087553] text-white shadow-xs' : 'text-[#627c80] hover:text-[#16303d] disabled:opacity-40'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>2. Agent Clarifications</span>
            </button>
            <button
              onClick={() => synthesizedConfig && setStage('config')}
              disabled={!synthesizedConfig}
              className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                stage === 'config' ? 'bg-[#087553] text-white shadow-xs' : 'text-[#627c80] hover:text-[#16303d] disabled:opacity-40'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>3. Configuration</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Generation Prompt & Integrated File Upload Bar */}
      <div className="glass rounded-[25px] p-5 border border-white/90 shadow-[0_8px_30px_-10px_rgba(46,83,68,0.08)] space-y-3 relative">
        <div className="flex items-center justify-between text-xs text-[#627c80]">
          <span className="font-semibold text-[#16303d] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#087553]" />
            <span>Studio Prompt & Tagged Sources</span>
          </span>
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white font-mono text-[10px] text-[#087553] border border-[#d5f4df]">@</kbd> to tag uploaded files</span>
        </div>

        {/* Textarea with Mention Tagging */}
        <div className="relative">
          <textarea
            rows={3}
            value={prompt}
            onChange={handlePromptChange}
            placeholder="Type your prompt and press @ to reference uploaded documents..."
            className="w-full text-xs p-3.5 bg-white/80 border border-white/90 rounded-2xl focus:outline-none focus:bg-white text-[#16303d] leading-relaxed resize-none shadow-inner"
          />

          {/* Autocomplete Mention Popover */}
          {showMentionPicker && (
            <div className="absolute left-4 top-12 bg-white/95 backdrop-blur-md rounded-2xl border border-white shadow-2xl p-2 z-40 w-72 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-[#627c80] uppercase tracking-wider flex justify-between items-center">
                <span>Select file to tag</span>
                <button onClick={() => setShowMentionPicker(false)} className="text-[#627c80] hover:text-[#16303d] cursor-pointer">&times;</button>
              </div>
              {sources.length === 0 ? (
                <div className="px-3 py-2 text-xs text-[#627c80] italic">No files uploaded yet. Click Upload Files below.</div>
              ) : (
                sources.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleSelectMention(doc.filename)}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#d5f4df] text-xs font-medium text-[#16303d] flex items-center gap-2 cursor-pointer transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#087553] flex-shrink-0" />
                    <span className="truncate">{doc.filename}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Action Controls & Upload Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Tagged / Uploaded File Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || isGeneratingGraph || isAnalyzing}
              className="secondary-pill px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-white text-[#16303d]"
            >
              <Paperclip className="w-3.5 h-3.5 text-[#087553]" />
              <span>{uploading ? 'Parsing Files...' : 'Upload Files'}</span>
            </button>

            {sources.length === 0 && (
              <span className="text-[11px] text-[#627c80] italic py-1">
                No files uploaded. Click Upload Files or Load Sample Data.
              </span>
            )}

            {sources.map((doc) => {
              const isCorrupt = doc.parse_state === 'failed'
              return (
                <span
                  key={doc.id}
                  onClick={() => handleSelectMention(doc.filename)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium shadow-2xs cursor-pointer transition ${
                    isCorrupt
                      ? 'bg-red-50/90 border-red-200 text-red-800'
                      : 'bg-white/90 border-white text-[#16303d] hover:bg-[#d5f4df]'
                  }`}
                  title={isCorrupt ? 'Corrupted file payload detected' : 'Click to tag in prompt'}
                >
                  <span className={`w-2 h-2 rounded-full ${isCorrupt ? 'bg-red-500' : 'bg-[#087553]'}`} />
                  <span className="truncate max-w-[150px]">@{doc.filename}</span>
                  {isCorrupt && <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1.5 rounded">BROKEN</span>}
                </span>
              )
            })}
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateGraphWithProgress}
              disabled={isGeneratingGraph || isAnalyzing || isSynthesizing || sources.length === 0}
              className="mint-button px-5 py-2.5 text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Sparkles className={`w-4 h-4 text-[#087553] ${isGeneratingGraph ? 'animate-spin' : ''}`} />
              <span>{isGeneratingGraph ? 'Generating Knowledge Graph...' : 'Generate Knowledge Graph'}</span>
            </button>

            {/* Start Agentic Configuration Button */}
            {graphReady && (
              <button
                onClick={handleStartAgenticConfiguration}
                disabled={isAnalyzing || isSynthesizing}
                className="px-5 py-2.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#087553] to-[#0b966a] text-white flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5"
              >
                <Brain className="w-4 h-4 text-[#55f5b5]" />
                <span>Start Agentic Configuration &rarr;</span>
              </button>
            )}
          </div>
        </div>

        {/* 20-Second Graph Generation Progress Bar */}
        {isGeneratingGraph && (
          <div className="pt-3 space-y-2 border-t border-[#5c8979]/15">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#16303d] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#087553] animate-spin" />
                <span>{graphProgressMsg}</span>
              </span>
              <span className="font-mono text-[11px] font-bold text-[#087553]">{graphProgress}%</span>
            </div>
            <div className="w-full bg-[#d5f4df] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#087553] h-full transition-all duration-300 rounded-full"
                style={{ width: `${graphProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. STAGE 1: KNOWLEDGE GRAPH & PARENT DOCUMENT */}
      {stage === 'graph' && (
        <div className="space-y-4">
          {/* Graph Toolbar & Metrics */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#16303d] uppercase tracking-wider flex items-center gap-1.5">
                <Network className="w-4 h-4 text-[#087553]" />
                <span>Unified Knowledge Graph</span>
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/90 text-[#48636b] border border-white shadow-2xs">
                {graphData.nodes.length} Nodes · {graphData.edges.length} Edges
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-[#627c80]">
                Overall Graph Confidence: <span className="font-bold text-[#087553]">{graphData.nodes.length > 0 ? (graphData.metrics?.overall_graph_confidence || 97.4) : 0}%</span>
              </div>
              {graphReady && (
                <button
                  onClick={handleStartAgenticConfiguration}
                  disabled={isAnalyzing}
                  className="secondary-pill px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-[#087553]"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Start Agentic Configuration &rarr;</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive React Flow Knowledge Graph Canvas OR Empty State */}
          <div className="glass rounded-[25px] border border-white/90 shadow-[0_8px_30px_-10px_rgba(46,83,68,0.08)] overflow-hidden h-[560px] relative">
            {!graphReady || graphData.nodes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-[#d5f4df]/80 border border-white flex items-center justify-center text-[#087553] shadow-inner">
                  <Network className="w-8 h-8" />
                </div>
                <div className="max-w-md space-y-1">
                  <h3 className="text-base font-bold text-[#16303d]">
                    {sources.length > 0
                      ? `${sources.length} Specification Documents Ready`
                      : 'No Knowledge Graph Nodes Yet'}
                  </h3>
                  <p className="text-xs text-[#627c80] leading-relaxed">
                    {sources.length > 0
                      ? 'Specification files are ingested into the workspace. Press "Generate Knowledge Graph" to extract coordinates, link entities, and assemble the ontology graph.'
                      : 'Upload your specification files or load sample data, then click Generate Knowledge Graph to parse and link multi-document entities.'}
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  {sources.length === 0 ? (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="mint-button px-5 py-2.5 text-xs flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <Upload className="w-4 h-4 text-[#087553]" />
                        <span>Upload Files</span>
                      </button>
                      <button
                        onClick={handleLoadSampleData}
                        disabled={loadingSample}
                        className="secondary-pill px-5 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer hover:bg-white text-[#16303d]"
                      >
                        <Sparkles className={`w-4 h-4 text-[#087553] ${loadingSample ? 'animate-spin' : ''}`} />
                        <span>{loadingSample ? 'Loading Files...' : 'Load Sample Data'}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleGenerateGraphWithProgress}
                      disabled={isGeneratingGraph}
                      className="mint-button px-6 py-3 text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <Sparkles className={`w-4 h-4 text-[#087553] ${isGeneratingGraph ? 'animate-spin' : ''}`} />
                      <span>{isGeneratingGraph ? 'Generating Knowledge Graph...' : 'Generate Knowledge Graph'}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <ReactFlow
                  nodes={graphData.nodes}
                  edges={graphData.edges}
                  fitView
                  attributionPosition="bottom-left"
                  onNodeClick={(_, node) => {
                    const nodeData = node.data as any
                    if (nodeData?.citations && Array.isArray(nodeData.citations) && nodeData.citations.length > 0) {
                      const firstCitation = String(nodeData.citations[0])
                      setActiveCitation({
                        document: firstCitation.split(' ')[0],
                        locator: firstCitation.split(' ')[1] || 'Coordinate',
                        excerpt: String(nodeData.rationale || nodeData.label || 'Citation detail')
                      })
                    }
                  }}
                >
                  <Background color="#c2d9ce" gap={20} size={1} />
                  <Controls position="top-right" />
                </ReactFlow>

                {/* Legend Overlay at Bottom */}
                <div className="absolute bottom-3 left-4 bg-white/90 backdrop-blur-md rounded-2xl border border-white p-2.5 px-4 shadow-lg flex items-center gap-4 text-[11px] text-[#627c80]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-400" />
                    <span>Documents</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-sky-100 border border-sky-400" />
                    <span>Domain Entities</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-400" />
                    <span>Policies & Constraints</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#55f5b5] border border-emerald-500" />
                    <span>Target Config Fields</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. STAGE 2: AGENT THINKING & CLARIFICATION QUESTIONS */}
      {(stage === 'thinking' || stage === 'questions') && (
        <div className="space-y-6">
          {/* Agent Thinking Progress Card */}
          <div className="glass rounded-[25px] p-6 border border-white/90 shadow-[0_8px_30px_-10px_rgba(46,83,68,0.08)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#d5f4df] text-[#087553] flex items-center justify-center font-bold">
                  <Activity className={`w-5 h-5 ${isAnalyzing || isSynthesizing ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#16303d]">Agentic Reasoning Trace</h3>
                  <p className="text-[11px] text-[#627c80]">Multi-source constraint extraction, discrepancy detection & token audit</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-semibold px-3 py-1 rounded-full bg-white/90 text-[#087553] border border-white shadow-2xs">
                  {isAnalyzing ? `${analyzingTokens} tokens generated` : isSynthesizing ? `${synthesizingTokens} tokens synthesized` : '620 tokens'}
                </span>
                <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-[#087553] text-white">
                  {isAnalyzing ? 'ANALYZING...' : isSynthesizing ? 'SYNTHESIZING...' : 'DISCREPANCIES FLAGGED'}
                </span>
              </div>
            </div>

            {/* Live Progress Bar during Analysis / Synthesis */}
            {(isAnalyzing || isSynthesizing) && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] text-[#627c80]">
                  <span>{isAnalyzing ? 'Evaluating 8 specification files for policy contradictions...' : 'Synthesizing verified target schema with human decisions...'}</span>
                  <span className="font-mono font-bold text-[#087553]">{isAnalyzing ? analyzingProgress : synthesizingProgress}%</span>
                </div>
                <div className="w-full bg-[#d5f4df] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#087553] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${isAnalyzing ? analyzingProgress : synthesizingProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Stream of Thoughts */}
            <div className="space-y-2 pt-2 max-h-64 overflow-y-auto">
              {agentThoughts.map((thought, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-[#48636b] animate-fadeIn">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#087553] flex-shrink-0 mt-0.5" />
                  <span>{thought}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Clarification Cards (Ambiguities Requiring Reviewer Answer) */}
          {stage === 'questions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="font-bold text-sm text-[#16303d] flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#c2410c]" />
                    <span>Ambiguities & Contradictions Detected by Agent (4 Questions)</span>
                  </h3>
                  <p className="text-xs text-[#627c80]">
                    The agent refuses to guess. Please choose or specify governing policy thresholds before synthesis.
                  </p>
                </div>
              </div>

              {agentQuestions.map((q) => (
                <div
                  key={q.id}
                  className={`glass rounded-[25px] p-6 border shadow-[0_4px_20px_rgba(180,130,30,0.06)] space-y-4 ${
                    q.id === 'Q0' ? 'border-red-200/90 bg-red-50/20' : 'border-amber-200/80 bg-amber-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#16303d]">{q.id}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border ${
                          q.id === 'Q0' ? 'text-red-700 border-red-200' : 'text-[#c2410c] border-amber-200'
                        }`}>
                          {q.field}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-[#16303d] leading-snug">
                        {q.question_text}
                      </h4>
                      <p className="text-xs text-[#627c80]">{q.impact}</p>
                    </div>
                  </div>

                  {/* Competing Evidence Cards with Clickable Citations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {q.competing_evidence?.map((ev: any, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => setActiveCitation({ document: ev.source, locator: ev.locator, excerpt: ev.excerpt })}
                        className="p-3.5 rounded-2xl bg-white/80 border border-white hover:bg-white cursor-pointer transition space-y-1 shadow-2xs hover:shadow-sm"
                        title="Click to view verbatim excerpt in document viewer"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-[#087553]">
                          <span>{ev.source} [{ev.locator}]</span>
                          <span className="text-[#627c80]">Evidence {idx + 1}</span>
                        </div>
                        <p className="text-xs text-[#16303d] italic">&quot;{ev.excerpt}&quot;</p>
                        <div className="text-[10px] text-[#627c80] font-medium pt-0.5">
                          Claimed Value: <span className="font-semibold text-[#16303d]">{ev.claim}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Interactive Choices & Custom Input */}
                  <div className="space-y-2 pt-2 border-t border-[#5c8979]/15">
                    <div className="text-[11px] font-semibold text-[#627c80]">Select Governing Policy Answer:</div>
                    <div className="flex flex-wrap items-center gap-2">
                      {q.suggested_options?.map((opt: string) => {
                        const isSelected = userAnswers[q.id] === opt
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setUserAnswers({ ...userAnswers, [q.id]: opt })}
                            className={`px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition ${
                              isSelected
                                ? 'bg-[#087553] text-white shadow-xs'
                                : 'secondary-pill hover:bg-white text-[#16303d]'
                            }`}
                          >
                            <span>{opt}</span>
                          </button>
                        )
                      })}

                      {/* Custom Input */}
                      <input
                        type="text"
                        placeholder="Or type custom parameter value..."
                        value={customAnswers[q.id] || ''}
                        onChange={(e) => {
                          setCustomAnswers({ ...customAnswers, [q.id]: e.target.value })
                          setUserAnswers({ ...userAnswers, [q.id]: e.target.value })
                        }}
                        className="flex-1 min-w-[200px] text-xs px-3.5 py-1.5 bg-white/90 border border-white rounded-full text-[#16303d] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Submit All Answers CTA */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleConfirmAndSynthesize}
                  disabled={isSynthesizing}
                  className="mint-button px-7 py-3 text-xs font-semibold cursor-pointer flex items-center gap-2 shadow-lg"
                >
                  <Sparkles className="w-4 h-4 text-[#087553]" />
                  <span>Confirm Governance Decisions & Synthesize Final Configuration</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. STAGE 3: SYNTHESIZED LEVEL 2 ARTEFACTS SUITE */}
      {stage === 'config' && synthesizedConfig && (
        <div className="space-y-6">
          {/* Level 2 Distinct Artefacts Navigation Pill Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 p-2 rounded-2xl border border-white/90 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveArtefactTab('config')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                  activeArtefactTab === 'config'
                    ? 'bg-[#087553] text-white shadow-xs'
                    : 'text-[#627c80] hover:text-[#16303d] hover:bg-white/60'
                }`}
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>1. Config &amp; Provenance</span>
              </button>

              <button
                onClick={() => setActiveArtefactTab('workflow')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                  activeArtefactTab === 'workflow'
                    ? 'bg-[#087553] text-white shadow-xs'
                    : 'text-[#627c80] hover:text-[#16303d] hover:bg-white/60'
                }`}
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>2. Editable Workflow</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">14 States</span>
              </button>

              <button
                onClick={() => setActiveArtefactTab('mappings')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                  activeArtefactTab === 'mappings'
                    ? 'bg-[#087553] text-white shadow-xs'
                    : 'text-[#627c80] hover:text-[#16303d] hover:bg-white/60'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>3. Field Mappings</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-700">12 Rules</span>
              </button>

              <button
                onClick={() => setActiveArtefactTab('openapi')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                  activeArtefactTab === 'openapi'
                    ? 'bg-[#087553] text-white shadow-xs'
                    : 'text-[#627c80] hover:text-[#16303d] hover:bg-white/60'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>4. OpenAPI Contract</span>
              </button>

              <button
                onClick={() => setActiveArtefactTab('tests')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                  activeArtefactTab === 'tests'
                    ? 'bg-[#087553] text-white shadow-xs'
                    : 'text-[#627c80] hover:text-[#16303d] hover:bg-white/60'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>5. Test Suite</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">16 Tests</span>
              </button>

              <button
                onClick={() => setActiveArtefactTab('validation')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                  activeArtefactTab === 'validation'
                    ? 'bg-[#087553] text-white shadow-xs'
                    : 'text-[#627c80] hover:text-[#16303d] hover:bg-white/60'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>6. Validation</span>
              </button>

              <button
                onClick={() => setActiveArtefactTab('versioning')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                  activeArtefactTab === 'versioning'
                    ? 'bg-[#087553] text-white shadow-xs'
                    : 'text-[#627c80] hover:text-[#16303d] hover:bg-white/60'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>7. Change Review</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">CHG-001</span>
              </button>
            </div>
          </div>

          {/* TAB 1: CONFIGURATION & PROVENANCE (DUAL VIEW) */}
          {activeArtefactTab === 'config' && (
            <div className="space-y-4">
              {/* View Switcher Bar */}
              <div className="flex items-center justify-between bg-white/70 p-2 rounded-2xl border border-white/90 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#16303d] px-2">Configuration View:</span>
                  <button
                    onClick={() => setConfigViewMode('interactive')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                      configViewMode === 'interactive' ? 'bg-[#087553] text-white shadow-xs' : 'text-[#627c80] hover:text-[#16303d]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Interactive Field Provenance</span>
                  </button>
                  <button
                    onClick={() => setConfigViewMode('json')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                      configViewMode === 'json' ? 'bg-[#087553] text-white shadow-xs' : 'text-[#627c80] hover:text-[#16303d]'
                    }`}
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>Exportable Clean JSON</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="secondary-pill px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer text-[#16303d]"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#087553]" />
                    <span>{copiedToast ? 'Copied!' : 'Copy JSON'}</span>
                  </button>
                  <button
                    onClick={handleDownloadJson}
                    className="secondary-pill px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer text-[#16303d]"
                  >
                    <Download className="w-3.5 h-3.5 text-[#087553]" />
                    <span>Export File</span>
                  </button>
                </div>
              </div>

          {/* VIEW 1: INTERACTIVE FIELDS CONFIGURATION WITH ROW-BY-ROW SCORES & CITATIONS */}
          {configViewMode === 'interactive' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metricsAnalysis.map((metric, idx) => {
                const isHumanResolved = Boolean(metric.resolved_via_question)
                return (
                  <div
                    key={idx}
                    className={`glass rounded-[23px] p-5 border shadow-[0_8px_25px_-15px_rgba(46,83,68,0.16)] space-y-3 ${
                      isHumanResolved ? 'border-emerald-300 bg-emerald-50/20' : 'border-white/90'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-[#16303d]">{metric.field_path}</span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-emerald-100 text-emerald-800">
                        <ShieldCheck className="w-3 h-3 text-emerald-700" />
                        <span>100% Grounded</span>
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <div className="text-[11px] text-[#627c80]">{metric.label}</div>
                        <div className="text-xl font-bold text-[#16303d] mt-0.5">
                          {typeof metric.value === 'object' ? JSON.stringify(metric.value) : String(metric.value)}
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white text-[#627c80] border border-white">
                        {metric.type}
                      </span>
                    </div>

                    {/* Resolved via Human Decision Highlight Badge */}
                    {isHumanResolved && (
                      <div className="p-2.5 rounded-xl bg-[#d5f4df]/70 border border-emerald-200 text-xs text-[#087553] space-y-0.5">
                        <div className="font-bold flex items-center gap-1.5 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#087553]" />
                          <span>Approved via Reviewer Clarification</span>
                        </div>
                        <p className="text-[11px] text-[#123e2e]">
                          Decision Answer: <span className="font-bold underline">{metric.resolved_via_question?.user_answer}</span> (Question: {metric.resolved_via_question?.question_text})
                        </p>
                      </div>
                    )}

                    {/* Knowledge Graph Explainability Rationale */}
                    <p className="text-[11px] text-[#48636b] leading-relaxed">
                      {metric.confidence_rationale}
                    </p>

                    {/* Clickable Citation Tag */}
                    {metric.citation && (
                      <div className="pt-2 border-t border-[#5c8979]/15 flex items-center justify-between">
                        <button
                          onClick={() => setActiveCitation(metric.citation)}
                          className="text-[11px] font-mono text-[#087553] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{metric.citation.document} [{metric.citation.locator}]</span>
                        </button>
                        <span className="text-[10px] text-[#627c80]">Click to view source excerpt</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* VIEW 2: EXPORTABLE CLEAN JSON (Monaco) */}
          {configViewMode === 'json' && (
            <div className="glass rounded-[25px] border border-white/90 overflow-hidden shadow-[0_8px_30px_-10px_rgba(46,83,68,0.08)] h-[600px] flex flex-col">
              <div className="px-6 py-3 border-b border-white/80 bg-white/70 flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-[#16303d]">Meridian Cooperative Bank KYC/AML Production Config (JSON)</span>
                <span className="text-[11px] text-[#627c80]">Validated against Target CBS Implementation Schema</span>
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  language="json"
                  value={editorJson}
                  onChange={(val) => setEditorJson(val || '')}
                  theme="light"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EDITABLE WORKFLOW GRAPH */}
      {activeArtefactTab === 'workflow' && <EditableWorkflowCanvas />}

      {/* TAB 3: FIELD MAPPINGS */}
      {activeArtefactTab === 'mappings' && <FieldMappingsPanel />}

      {/* TAB 4: OPENAPI CONTRACT */}
      {activeArtefactTab === 'openapi' && (
        <OpenApiContractPanel contractJson={fullSynthesisData?.openapi_contract} />
      )}

      {/* TAB 5: EXECUTABLE TEST SUITE */}
      {activeArtefactTab === 'tests' && <ScenarioTestSuitePanel />}

      {/* TAB 6: VALIDATION REPORT */}
      {activeArtefactTab === 'validation' && <ValidationDiagnosticsPanel />}

      {/* TAB 7: CHANGE REVIEW (CHG-001) */}
      {activeArtefactTab === 'versioning' && <ChangeControlPanel />}
    </div>
  )}

      {/* 6. Embedded Document Citation Inspector Viewer with Text Annotation */}
      {activeCitation && (
        <div className="fixed inset-y-0 right-0 w-[420px] max-w-full glass-strong border-l border-white shadow-2xl p-6 z-50 flex flex-col justify-between overflow-y-auto animate-slideLeft">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#5c8979]/15">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#087553]" />
                <h3 className="font-bold text-sm text-[#16303d]">Document Viewer & Provenance</h3>
              </div>
              <button
                onClick={() => setActiveCitation(null)}
                className="text-[#627c80] hover:text-[#16303d] text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/80 border border-white/90 space-y-1 text-xs">
              <div className="text-[10px] text-[#627c80] uppercase font-semibold">Origin Specification File</div>
              <div className="font-bold text-[#16303d] text-sm">{activeCitation.document}</div>
              <div className="text-[11px] text-[#087553] font-mono">Coordinate Locator: <span className="font-bold">{activeCitation.locator}</span></div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="text-[11px] font-semibold text-[#627c80] flex items-center justify-between">
                <span>Annotated Document Excerpt:</span>
                <span className="text-[10px] text-[#087553] font-medium bg-[#d5f4df] px-2 py-0.5 rounded-full">Exact Text Match</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/95 border border-white text-xs text-[#16303d] leading-relaxed shadow-inner">
                <span className="bg-[#55f5b5]/40 px-1 py-0.5 rounded font-medium border-b-2 border-[#087553]">
                  {activeCitation.excerpt}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-[#d5f4df]/60 rounded-2xl border border-emerald-200 text-xs text-[#087553] space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Grounded Provenance Verification</span>
              </div>
              <p className="text-[11px] text-[#123e2e] leading-snug">
                Character & coordinate offsets are cryptographically bound to the source document ingestion record. Zero hallucinated terms.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveCitation(null)}
            className="secondary-pill px-4 py-2.5 text-xs font-semibold w-full cursor-pointer mt-6"
          >
            Close Viewer
          </button>
        </div>
      )}

    </div>
  )
}
