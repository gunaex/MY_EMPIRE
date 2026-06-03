import { Room, type Client } from 'colyseus'
import { EmpireRoomState, CompanyCardSchema, SGMApprovalItem } from './EmpireRoomState'
import { randomUUID } from 'crypto'
import type { CompanyConfig } from '@empire/agent-engine'
import { loadCompanyTemplates } from '../templates/CompanyTemplateLoader'

/**
 * EmpireRoom — top-level room ที่ track ทุก company พร้อมกัน
 * SGM (Super General Manager) เชื่อมต่อกับ room นี้
 */
export class EmpireRoom extends Room<EmpireRoomState> {
  private companies: Map<string, CompanyConfig> = new Map()

  onCreate(): void {
    this.setState(new EmpireRoomState())
    this.setupMessageHandlers()
    this.loadInitialCompanies()
  }

  private setupMessageHandlers(): void {
    // SGM adds a new company
    this.onMessage('add_company', (_client, config: CompanyConfig) => {
      this.registerCompany(config)
      this.broadcast('company_added', { companyId: config.companyId })
    })

    // SGM approves/rejects HR request
    this.onMessage('sgm_approval', (_client, msg: { approvalId: string; decision: 'approve' | 'reject' }) => {
      this.handleSGMDecision(msg.approvalId, msg.decision)
    })

    // HR system flags lazy agent → adds to approval queue
    this.onMessage('hr_flag', (_client, flag: { companyId: string; agentId: string; agentName: string; reason: string }) => {
      this.addApprovalRequest('fire_agent', flag)
    })

    this.onMessage('request_snapshot', (client) => {
      client.send('empire_snapshot', this.createSnapshot())
    })
  }

  private loadInitialCompanies(): void {
    const templates = loadCompanyTemplates()
    for (const template of templates) {
      this.registerCompany(template)
    }

    if (templates.length > 0) {
      console.log(`Loaded ${templates.length} company template(s) into EmpireRoom`)
    }
  }

  onJoin(client: Client): void {
    client.send('empire_snapshot', this.createSnapshot())
  }

  registerCompany(config: CompanyConfig): void {
    const existing = this.companies.get(config.companyId)
    if (existing) {
      this.state.totalAgents -= existing.agents.length
    }

    this.companies.set(config.companyId, config)

    const card = new CompanyCardSchema()
    card.companyId = config.companyId
    card.name = config.name
    card.type = config.type
    card.agentCount = config.agents.length
    card.status = 'active'
    card.alertCount = 0

    this.state.companies.set(config.companyId, card)
    this.state.totalAgents += config.agents.length
    this.state.activeCompanies = this.state.companies.size
  }

  addApprovalRequest(
    type: string,
    data: { companyId: string; agentId: string; agentName: string; reason: string }
  ): void {
    const id = randomUUID()
    const item = new SGMApprovalItem()
    item.id = id
    item.type = type
    item.companyId = data.companyId
    item.agentId = data.agentId
    item.agentName = data.agentName
    item.message = `⚠️ ${data.agentName} ${data.reason}`
    item.createdAt = new Date().toISOString()

    this.state.approvalQueue.set(id, item)

    // Update company alert count
    const card = this.state.companies.get(data.companyId)
    if (card) {
      card.alertCount += 1
      card.status = 'alert'
    }

    this.broadcast('sgm_notification', { id, agentName: data.agentName, message: item.message })
  }

  private handleSGMDecision(approvalId: string, decision: 'approve' | 'reject'): void {
    const item = this.state.approvalQueue.get(approvalId)
    if (!item) return

    const card = this.state.companies.get(item.companyId)
    if (card && card.alertCount > 0) {
      card.alertCount -= 1
      if (card.alertCount === 0) card.status = 'active'
    }

    this.state.approvalQueue.delete(approvalId)

    this.broadcast('sgm_decision', {
      approvalId,
      decision,
      agentName: item.agentName,
    })
  }

  private createSnapshot(): {
    companies: Array<{
      companyId: string
      name: string
      type: string
      agentCount: number
      status: string
      alertCount: number
    }>
    approvalQueue: Array<{
      id: string
      type: string
      companyId: string
      agentId: string
      agentName: string
      message: string
      createdAt: string
    }>
    totalAgents: number
    activeCompanies: number
  } {
    return {
      companies: Array.from(this.state.companies.values()).map((company) => ({
        companyId: company.companyId,
        name: company.name,
        type: company.type,
        agentCount: company.agentCount,
        status: company.status,
        alertCount: company.alertCount,
      })),
      approvalQueue: Array.from(this.state.approvalQueue.values()).map((item) => ({
        id: item.id,
        type: item.type,
        companyId: item.companyId,
        agentId: item.agentId,
        agentName: item.agentName,
        message: item.message,
        createdAt: item.createdAt,
      })),
      totalAgents: this.state.totalAgents,
      activeCompanies: this.state.activeCompanies,
    }
  }
}
