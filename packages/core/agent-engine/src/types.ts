// ============================================================
// Agent Type Definitions
// สอดคล้องกับ Company Template JSON format
// ============================================================

export type LLMModelId = string  // เช่น "local/gemma-4b", "openai/gpt-4o"

export type CompanyType = 'ecommerce' | 'content_studio' | 'logistics' | 'finance' | 'custom'

export type AgentAction =
  | 'post_social'
  | 'fetch_sales_data'
  | 'send_email'
  | 'search_web'
  | 'update_spreadsheet'
  | 'notify_slack'

export interface AgentConfig {
  id: string
  name: string           // ชื่อภาษาไทย เช่น "น้องมาร์ค"
  role: string
  department: string
  llm: LLMModelId
  fallback_llm: LLMModelId
  skills: string[]
  memory: boolean
  rag_collection?: string
  schedule?: string      // cron expression
  productivity_threshold?: number
}

export interface CompanyConfig {
  companyId: string
  name: string           // ชื่อภาษาไทย เช่น "ร้านขายดี Shop"
  type: CompanyType
  departments: string[]
  agents: AgentConfig[]
}

export interface AgentState {
  config: AgentConfig
  companyId: string
  status: 'idle' | 'thinking' | 'working' | 'error' | 'fired'
  currentTask?: string
  lastActiveAt?: Date
  productivity: {
    tasksCompleted: number
    tasksAssigned: number
    qualityScore: number
    responseTimeAvg: number
    consecutiveLowPerformanceDays: number
  }
}

export interface LLMToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface AgentSkill {
  skillId: string
  name: string
  agentId: string
  toolDefinition: LLMToolDefinition
  learnedAt: Date
  sourceDocuments: string[]
  usageCount: number
}
