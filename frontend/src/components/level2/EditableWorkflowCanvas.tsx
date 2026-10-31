import React, { useState, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
  MarkerType
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  GitFork, Download, RefreshCw, Plus, X, Check, Shield,
  UserCheck, AlertCircle, Sparkles, Layers, Sliders
} from 'lucide-react'

export interface WorkflowNodeData {
  label: string
  stateId: string
  role: string
  category: 'start' | 'automated' | 'manual' | 'terminal_pass' | 'terminal_fail'
  description: string
  citations: string[]
}

const INITIAL_NODES: Node[] = [
  {
    id: 'intake',
    position: { x: 50, y: 150 },
    data: {
      label: 'Intake Portal',
      stateId: 'intake',
      role: 'automated_system',
      category: 'start',
      description: 'Customer application intake and mandatory field completeness validation.',
      citations: ['01_KYC_AML_BRD.docx [P5]', '05_Target_Implementation_Schema.json']
    },
    style: { background: '#f0fdf4', border: '2px solid #087553', borderRadius: '16px', padding: '12px', minWidth: '170px' }
  },
  {
    id: 'incomplete',
    position: { x: 50, y: 350 },
    data: {
      label: 'Incomplete Intake',
      stateId: 'incomplete',
      role: 'customer_service',
      category: 'manual',
      description: 'Mandatory fields missing (DOB, phone, address). Queued for customer service outreach.',
      citations: ['01_KYC_AML_BRD.docx [P5]', 'L2-WF-04']
    },
    style: { background: '#fffbeb', border: '2px solid #d97706', borderRadius: '16px', padding: '12px', minWidth: '170px' }
  },
  {
    id: 'identity_verification',
    position: { x: 270, y: 150 },
    data: {
      label: 'Identity Check',
      stateId: 'identity_verification',
      role: 'automated_system',
      category: 'automated',
      description: 'Automated biometric and government ID verification gateway.',
      citations: ['01_KYC_AML_BRD.docx [P8]', '06_Existing_Approval_Workflow.yaml [WF-02]']
    },
    style: { background: '#f8fafc', border: '2px solid #64748b', borderRadius: '16px', padding: '12px', minWidth: '170px' }
  },
  {
    id: 'manual_identity_review',
    position: { x: 270, y: 350 },
    data: {
      label: 'Manual ID Review',
      stateId: 'manual_identity_review',
      role: 'kyc_analyst',
      category: 'manual',
      description: 'Biometric / government ID mismatch manual review queue.',
      citations: ['06_Existing_Approval_Workflow.yaml [WF-03]', 'L2-WF-04']
    },
    style: { background: '#fffbeb', border: '2px solid #d97706', borderRadius: '16px', padding: '12px', minWidth: '170px' }
  },
  {
    id: 'screening',
    position: { x: 490, y: 150 },
    data: {
      label: 'Sanctions & PEP',
      stateId: 'screening',
      role: 'automated_system',
      category: 'automated',
      description: 'OFAC/UN sanctions list matching and Politically Exposed Person (PEP) check.',
      citations: ['02_KYC_AML_Functional_Spec.pdf [Table 4]', '01_KYC_AML_BRD.docx [P9]']
    },
    style: { background: '#f8fafc', border: '2px solid #64748b', borderRadius: '16px', padding: '12px', minWidth: '170px' }
  },
  {
    id: 'on_hold_screening',
    position: { x: 490, y: 350 },
    data: {
      label: 'Screening Hold',
      stateId: 'on_hold_screening',
      role: 'compliance_officer',
      category: 'manual',
      description: 'Possible name / DOB match on sanctions list. Held for compliance officer resolution.',
      citations: ['06_Existing_Approval_Workflow.yaml [WF-05]', 'L2-WF-03']
    },
    style: { background: '#fffbeb', border: '2px solid #d97706', borderRadius: '16px', padding: '12px', minWidth: '170px' }
  },
  {
    id: 'blocked_sanctions',
    position: { x: 490, y: -40 },
    data: {
      label: 'Blocked (Sanctions)',
      stateId: 'blocked_sanctions',
      role: 'automated_system',
      category: 'terminal_fail',
      description: 'Confirmed sanctions match. Immediate immutable block, overrides all approvals.',
      citations: ['01_KYC_AML_BRD.docx [P9]', 'L2-WF-03']
    },
    style: { background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '16px', padding: '12px', minWidth: '170px' }
  },
  {
    id: 'risk_assessment',
    position: { x: 710, y: 150 },
    data: {
      label: 'Risk Assessment',
      stateId: 'risk_assessment',
      role: 'automated_system',
      category: 'automated',
      description: 'Evaluates 6M income lookback, AML score tier (Low/Med/High), and INR 500k ceiling.',
      citations: ['02_KYC_AML_Functional_Spec.pdf [Table 2]', '01_Level2_Implementation_Addendum.md [DEC-001..003]']
    },
    style: { background: '#f8fafc', border: '2px solid #64748b', borderRadius: '16px', padding: '12px', minWidth: '170px' }
  },
  {
    id: 'manual_income_review',
    position: { x: 930, y: 350 },
    data: {
      label: 'Income Review (L2)',
      stateId: 'manual_income_review',
      role: 'credit_analyst',
      category: 'manual',
      description: 'Self-employed applicant or < 4 salary credits of ₹25,000. New Level 2 state!',
      citations: ['01_Level2_Implementation_Addendum.md [L2-WF-01, DEC-001]']
    },
    style: { background: '#fff7ed', border: '2px solid #f97316', borderRadius: '16px', padding: '12px', minWidth: '170px' }
  },
  {
    id: 'pending_edd',
    position: { x: 930, y: 150 },
    data: {
      label: 'Enhanced Due Diligence',
      stateId: 'pending_edd',
      role: 'compliance_officer',
      category: 'manual',
      description: 'Mandatory EDD: Triggered by PEP flag, High Risk Score >= 75, or Loan >= ₹5,00,000.',
      citations: ['01_KYC_AML_BRD.docx [P11]', '01_Level2_Implementation_Addendum.md [DEC-002, DEC-003]']
    },
    style: { background: '#fffbeb', border: '2px solid #d97706', borderRadius: '16px', padding: '12px', minWidth: '170px' }
  },
  {
    id: 'pending_senior_review',
    position: { x: 1150, y: 150 },
    data: {
      label: 'Senior Compliance',
      stateId: 'pending_senior_review',
      role: 'senior_compliance_officer',
      category: 'manual',
      description: 'Executive compliance sign-off for high-value loans >= ₹5,00,000 (inclusive).',
      citations: ['04_KYC_AML_User_Stories.docx [US-KYC-03]', '01_Level2_Implementation_Addendum.md [DEC-002]']
    },
    style: { background: '#fffbeb', border: '2px solid #d97706', borderRadius: '16px', padding: '12px', minWidth: '170px' }
  },
  {
    id: 'final_decision',
    position: { x: 1370, y: 150 },
    data: {
      label: 'Decision Gate',
      stateId: 'final_decision',
      role: 'automated_system',
      category: 'automated',
      description: 'Verifies all required review queue gates have passed without outstanding holds.',
      citations: ['06_Existing_Approval_Workflow.yaml [WF-10]', 'L2-WF-06']
    },
    style: { background: '#f8fafc', border: '2px solid #64748b', borderRadius: '16px', padding: '12px', minWidth: '170px' }
  },
  {
    id: 'approved',
    position: { x: 1570, y: 150 },
    data: {
      label: 'KYC/AML Cleared',
      stateId: 'approved',
      role: 'automated_system',
      category: 'terminal_pass',
      description: 'Compliance clearance granted. (KYC/AML clearance only; does not mean disbursement).',
      citations: ['01_KYC_AML_BRD.docx [P14]', '01_Level2_Implementation_Addendum.md [L2-WF-06]']
    },
    style: { background: '#ecfdf5', border: '2px solid #10b981', borderRadius: '16px', padding: '12px', minWidth: '170px' }
  },
  {
    id: 'rejected',
    position: { x: 710, y: 550 },
    data: {
      label: 'Application Rejected',
      stateId: 'rejected',
      role: 'automated_system',
      category: 'terminal_fail',
      description: 'Rejection issued by authorized reviewer at any manual review state.',
      citations: ['06_Existing_Approval_Workflow.yaml [WF-12]', 'L2-WF-06']
    },
    style: { background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '16px', padding: '12px', minWidth: '170px' }
  }
]

const INITIAL_EDGES: Edge[] = [
  { id: 'e-WF-01', source: 'intake', target: 'incomplete', label: 'Missing Fields', animated: true, style: { stroke: '#d97706' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-02', source: 'intake', target: 'identity_verification', label: 'Complete', style: { stroke: '#087553' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-03', source: 'identity_verification', target: 'manual_identity_review', label: 'ID Mismatch', animated: true, style: { stroke: '#d97706' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-04', source: 'identity_verification', target: 'screening', label: 'Verified', style: { stroke: '#087553' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-05', source: 'manual_identity_review', target: 'screening', label: 'Cleared', style: { stroke: '#087553' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-06', source: 'screening', target: 'on_hold_screening', label: 'Possible Match', animated: true, style: { stroke: '#d97706' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-07', source: 'screening', target: 'blocked_sanctions', label: 'Confirmed Match', style: { stroke: '#ef4444', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-08', source: 'screening', target: 'risk_assessment', label: 'Clear', style: { stroke: '#087553' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-09', source: 'on_hold_screening', target: 'risk_assessment', label: 'Cleared by Officer', style: { stroke: '#087553' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-10', source: 'risk_assessment', target: 'manual_income_review', label: 'Unstable / Self-Employed', animated: true, style: { stroke: '#f97316' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-11', source: 'manual_income_review', target: 'pending_edd', label: 'Income Approved', style: { stroke: '#087553' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-12', source: 'risk_assessment', target: 'pending_edd', label: 'PEP / Score >= 75 / >= 500k', style: { stroke: '#d97706' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-13', source: 'pending_edd', target: 'pending_senior_review', label: 'EDD Approved (>= 500k)', style: { stroke: '#087553' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-14', source: 'risk_assessment', target: 'final_decision', label: 'Low Risk / Standard', style: { stroke: '#087553' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-15', source: 'pending_senior_review', target: 'final_decision', label: 'Senior Approved', style: { stroke: '#087553' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-16', source: 'final_decision', target: 'approved', label: 'All Gates Clear', style: { stroke: '#10b981', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-REJ-1', source: 'manual_identity_review', target: 'rejected', label: 'Reject', style: { stroke: '#ef4444', strokeDasharray: '4' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-REJ-2', source: 'manual_income_review', target: 'rejected', label: 'Reject', style: { stroke: '#ef4444', strokeDasharray: '4' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-REJ-3', source: 'pending_edd', target: 'rejected', label: 'Reject', style: { stroke: '#ef4444', strokeDasharray: '4' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-WF-REJ-4', source: 'pending_senior_review', target: 'rejected', label: 'Reject', style: { stroke: '#ef4444', strokeDasharray: '4' }, markerEnd: { type: MarkerType.ArrowClosed } }
]

const ROLE_OPTIONS = [
  { value: 'automated_system', label: 'Automated System Engine' },
  { value: 'customer_service', label: 'Customer Service Representative' },
  { value: 'kyc_analyst', label: 'KYC Analyst (Level 1)' },
  { value: 'compliance_officer', label: 'Compliance Officer (Screening / EDD)' },
  { value: 'credit_analyst', label: 'Credit Analyst (Manual Income Review)' },
  { value: 'senior_compliance_officer', label: 'Senior Compliance Officer (Executive)' }
]

export const EditableWorkflowCanvas: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  )

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    const data = node.data as any
    setEditLabel(data?.label || node.id)
    setEditRole(data?.role || 'automated_system')
    setEditDescription(data?.description || '')
  }

  const handleSaveNodeEdit = () => {
    if (!selectedNode) return
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const updatedData = {
            ...(n.data as any),
            label: editLabel,
            role: editRole,
            description: editDescription
          }
          return {
            ...n,
            data: updatedData
          }
        }
        return n
      })
    )
    showToast(`Updated state '${selectedNode.id}' successfully.`)
    setSelectedNode(null)
  }

  const handleExportYAML = () => {
    const yamlString = `workflow_id: digital_loan_kyc_aml
version: '2.0'
mode: synthetic_demo_only
source_refs: [BRD-02, BRD-03, BRD-05, BRD-06, BRD-07, US-01, DEC-001, DEC-002, DEC-003, L2-WF-01, L2-WF-02]
states:
${nodes.map((n) => `  - ${n.id}`).join('\n')}
manual_approvers:
${nodes
  .filter((n) => (n.data as any)?.role !== 'automated_system')
  .map((n) => `  ${n.id}: ${(n.data as any)?.role}`)
  .join('\n')}
rules:
  mandatory_missing: {from: intake, to: incomplete}
  mandatory_complete: {from: intake, to: identity_verification}
  identity_failed: {from: identity_verification, to: manual_identity_review}
  identity_verified: {from: identity_verification, to: screening}
  sanctions_possible_match: {from: screening, to: on_hold_screening}
  sanctions_confirmed_match: {from: screening, to: blocked_sanctions}
  sanctions_clear: {from: screening, to: risk_assessment}
  income_failed_or_self_employed: {from: risk_assessment, to: manual_income_review}
  edd_trigger: {from: risk_assessment, to: pending_edd, when: 'PEP == true OR score >= 75 OR loan_amount_inr >= 500000'}
  senior_review: {from: risk_assessment, to: pending_senior_review, when: 'loan_amount_inr >= 500000'}
  review_order: [manual_income_review, pending_edd, pending_senior_review]
  authorized_rejection: {from: manual_review_state, to: rejected}
  all_gates_approved: {from: final_decision, to: approved}
`
    const blob = new Blob([yamlString], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '04_Expected_Workflow_Level2.yaml'
    a.click()
    URL.revokeObjectURL(url)
    showToast('Exported 04_Expected_Workflow_Level2.yaml')
  }

  const handleExportJSON = () => {
    const payload = {
      workflow_id: 'digital_loan_kyc_aml',
      nodes: nodes.map((n) => ({ id: n.id, ...n.data, position: n.position })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label }))
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'workflow_state_machine.json'
    a.click()
    URL.revokeObjectURL(url)
    showToast('Exported workflow_state_machine.json')
  }

  const handleResetLayout = () => {
    setNodes(INITIAL_NODES)
    setEdges(INITIAL_EDGES)
    setSelectedNode(null)
    showToast('Workflow layout reset to approved Level 2 specification.')
  }

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 glass rounded-[20px] border border-white/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#087553] animate-pulse" />
            <h3 className="font-bold text-sm text-[#16303d]">
              Level 2 KYC/AML State Machine Workflow (14 States, 20 Edges)
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#d5f4df] text-[#087553]">
              LIVE EDITABLE
            </span>
          </div>
          <p className="text-xs text-[#627c80] mt-0.5">
            Includes <code className="text-[#087553] font-semibold">manual_income_review</code> per DEC-001 & L2-WF-01 with strict review ordering: Income &rarr; EDD &rarr; Senior Review. Click any state node to inspect or modify approver roles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportYAML}
            className="secondary-pill px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-white text-[#16303d]"
            title="Download authoritative Level 2 YAML"
          >
            <Download className="w-3.5 h-3.5 text-[#087553]" />
            <span>Export YAML</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="secondary-pill px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-white text-[#16303d]"
          >
            <Download className="w-3.5 h-3.5 text-[#087553]" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={handleResetLayout}
            className="secondary-pill px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-white text-[#627c80]"
            title="Reset to 14 standard states"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative glass rounded-[25px] border border-white/90 shadow-[0_8px_30px_-10px_rgba(46,83,68,0.08)] overflow-hidden h-[600px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls className="bg-white/80 border border-white rounded-xl shadow-xs" />
        </ReactFlow>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-white shadow-md text-[11px] space-y-1.5 z-10 pointer-events-none">
          <div className="font-bold text-[#16303d] text-[10px] uppercase tracking-wider mb-1">State Categories</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#087553]" />
            <span className="text-[#48636b]">Start / Ingestion</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
            <span className="text-[#48636b]">Automated Gateway</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]" />
            <span className="text-[#48636b]">Manual Review Queue (Role Assigned)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            <span className="text-[#48636b]">Approved (KYC/AML Cleared)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span className="text-[#48636b]">Terminal Blocked / Rejected</span>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 right-4 bg-[#16303d] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 z-30 animate-fade-in">
            <Check className="w-3.5 h-3.5 text-[#55f5b5]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Node Detail / Edit Drawer */}
        {selectedNode && (
          <div className="absolute top-0 right-0 w-96 h-full bg-white/95 backdrop-blur-xl border-l border-white/90 shadow-2xl p-6 z-20 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#087553]" />
                  <h4 className="font-bold text-sm text-[#16303d]">Edit State Node</h4>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 rounded-full hover:bg-gray-100 text-[#627c80] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#627c80] uppercase tracking-wider block mb-1">
                  State Machine Identifier
                </label>
                <div className="font-mono text-xs font-semibold text-[#16303d] bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                  {selectedNode.id}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#627c80] uppercase tracking-wider block mb-1">
                  Display Label
                </label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 text-[#16303d] focus:outline-none focus:border-[#087553]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#627c80] uppercase tracking-wider block mb-1">
                  Assigned Approver Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 text-[#16303d] focus:outline-none focus:border-[#087553]"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#627c80] uppercase tracking-wider block mb-1">
                  Routing Rule / Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 text-[#16303d] focus:outline-none focus:border-[#087553]"
                />
              </div>

              {(selectedNode.data as any)?.citations && (
                <div>
                  <label className="text-[10px] font-bold text-[#627c80] uppercase tracking-wider block mb-1">
                    Grounded Document Citations
                  </label>
                  <div className="space-y-1">
                    {((selectedNode.data as any).citations as string[]).map((cit, idx) => (
                      <span
                        key={idx}
                        className="inline-block text-[10px] font-medium bg-[#d5f4df] text-[#087553] px-2.5 py-1 rounded-md mr-1 mb-1"
                      >
                        {cit}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center gap-2">
              <button
                onClick={handleSaveNodeEdit}
                className="mint-button flex-1 py-2 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-[#087553]" />
                <span>Save Node Changes</span>
              </button>
              <button
                onClick={() => setSelectedNode(null)}
                className="secondary-pill px-3 py-2 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
