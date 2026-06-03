// ============================================================
// Zustand Empire Store — State Bridge between React & Phaser
//
// กฎ: React owns state, Phaser subscribes ผ่าน store นี้เท่านั้น
//     ห้าม share state โดยตรง React ↔ Phaser เด็ดขาด
// ============================================================

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// ── Types ─────────────────────────────────────────────────────

export type AgentStatus = 'idle' | 'thinking' | 'working' | 'error' | 'fired'
export type CompanyStatus = 'active' | 'alert' | 'paused'
export type ViewMode = 'cartoon' | 'technical'

export interface AgentData {
  id: string
  name: string
  role: string
  department: string
  status: AgentStatus
  currentTask: string
  qualityScore: number
  tasksCompleted: number
}

export interface CompanyData {
  companyId: string
  name: string
  type: string
  agentCount: number
  status: CompanyStatus
  alertCount: number
  agents: Record<string, AgentData>
}

export interface SGMApproval {
  id: string
  type: string
  companyId: string
  agentId: string
  agentName: string
  message: string
  createdAt: string
}

export interface EmpireState {
  // Data
  companies: Record<string, CompanyData>
  approvalQueue: Record<string, SGMApproval>
  activeCompanyId: string | null
  totalAgents: number
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

  // UI State
  viewMode: ViewMode
  currentView: 'empire_map' | 'company_floor' | 'hr_panel' | 'boss_command' | 'shadow_pm'

  // Actions
  setCompanies: (companies: Record<string, CompanyData>) => void
  updateCompany: (companyId: string, data: Partial<CompanyData>) => void
  updateAgent: (companyId: string, agentId: string, data: Partial<AgentData>) => void
  setActiveCompany: (companyId: string | null) => void
  setApprovals: (approvals: Record<string, SGMApproval>) => void
  addApproval: (approval: SGMApproval) => void
  removeApproval: (approvalId: string) => void
  setConnectionStatus: (status: EmpireState['connectionStatus']) => void
  setViewMode: (mode: ViewMode) => void
  setCurrentView: (view: EmpireState['currentView']) => void
}

// ── Store ─────────────────────────────────────────────────────

export const useEmpireStore = create<EmpireState>()(
  subscribeWithSelector((set) => ({
    companies: {},
    approvalQueue: {},
    activeCompanyId: null,
    totalAgents: 0,
    connectionStatus: 'idle',
    viewMode: 'cartoon',
    currentView: 'empire_map',

    setCompanies: (companies) =>
      set(() => ({
        companies,
        totalAgents: Object.values(companies).reduce((sum, c) => sum + c.agentCount, 0),
      })),

    updateCompany: (companyId, data) =>
      set((state) => ({
        companies: {
          ...state.companies,
          [companyId]: { ...state.companies[companyId]!, ...data },
        },
      })),

    updateAgent: (companyId, agentId, data) =>
      set((state) => {
        const company = state.companies[companyId]
        if (!company) return state
        return {
          companies: {
            ...state.companies,
            [companyId]: {
              ...company,
              agents: {
                ...company.agents,
                [agentId]: { ...company.agents[agentId]!, ...data },
              },
            },
          },
        }
      }),

    setActiveCompany: (companyId) => set(() => ({ activeCompanyId: companyId })),

    setApprovals: (approvals) => set(() => ({ approvalQueue: approvals })),

    addApproval: (approval) =>
      set((state) => ({
        approvalQueue: { ...state.approvalQueue, [approval.id]: approval },
      })),

    removeApproval: (approvalId) =>
      set((state) => {
        const next = { ...state.approvalQueue }
        delete next[approvalId]
        return { approvalQueue: next }
      }),

    setConnectionStatus: (connectionStatus) => set(() => ({ connectionStatus })),

    setViewMode: (mode) => set(() => ({ viewMode: mode })),

    setCurrentView: (view) => set(() => ({ currentView: view })),
  }))
)
