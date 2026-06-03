import { Room, type Client } from 'colyseus'
import { OfficeRoomState, AgentStateSchema } from './OfficeRoomState'
import { Agent } from '@empire/agent-engine'
import { SQLiteMemory } from '@empire/memory'
import type { CompanyConfig } from '@empire/agent-engine'
import { loadCompanyTemplate } from '../templates/CompanyTemplateLoader'
import { llmSettingsStore } from '../config/LLMSettings'

/**
 * OfficeRoom — Colyseus room สำหรับ 1 company
 * Extend จาก existing Agent-office-thai pattern
 */
export class OfficeRoom extends Room<OfficeRoomState> {
  private agents: Map<string, Agent> = new Map()
  private llmClient!: ReturnType<typeof llmSettingsStore.createClient>
  private memory!: SQLiteMemory
  private thinkIntervals: Map<string, ReturnType<typeof setInterval>> = new Map()
  private llmSettingsUpdatedAt: string = ''

  private readonly thinkCooldownMs: number =
    parseInt(process.env['THINK_COOLDOWN_MS'] ?? '5000', 10)

  onCreate(options: { company?: CompanyConfig; companyId?: string }): void {
    this.setState(new OfficeRoomState())

    const company = options.company ?? (options.companyId ? loadCompanyTemplate(options.companyId) : undefined)
    if (!company) {
      throw new Error(`Company config not found for office room: ${options.companyId ?? 'missing companyId'}`)
    }

    this.state.companyId = company.companyId
    this.state.companyName = company.name

    this.refreshLLMClient()

    this.memory = new SQLiteMemory()

    // Spawn agents from company config
    for (const agentConfig of company.agents) {
      const agent = new Agent(agentConfig, company.companyId, this.llmClient, this.memory)
      this.agents.set(agentConfig.id, agent)

      const schema = new AgentStateSchema()
      schema.id = agentConfig.id
      schema.name = agentConfig.name
      schema.role = agentConfig.role
      schema.department = agentConfig.department
      schema.status = 'idle'
      this.state.agents.set(agentConfig.id, schema)
    }

    this.state.activeAgentCount = this.agents.size
    this.startThinkLoops()

    this.onMessage('boss_command', (client, message: { agentId: string; command: string }) => {
      void this.handleBossCommand(message.agentId, message.command)
    })

    this.onMessage('learn_skill', (client, message: { agentId: string; skillName: string; content: string }) => {
      void this.handleLearnSkill(message.agentId, message.skillName, message.content)
    })

    this.onMessage('request_snapshot', (client) => {
      client.send('office_snapshot', this.createSnapshot())
    })
  }

  onJoin(client: Client): void {
    client.send('office_snapshot', this.createSnapshot())
  }

  private startThinkLoops(): void {
    for (const [agentId, agent] of this.agents) {
      const interval = setInterval(() => {
        void this.runAgentThink(agentId, agent)
      }, this.thinkCooldownMs)

      this.thinkIntervals.set(agentId, interval)
    }
  }

  private async runAgentThink(agentId: string, agent: Agent): Promise<void> {
    const schema = this.state.agents.get(agentId)
    if (!schema) return

    this.refreshLLMClient()
    schema.status = 'thinking'

    const result = await agent.think(`ทำงานประจำของ ${agent.name} ในฐานะ ${agent.state.config.role}`)

    schema.status = 'idle'
    schema.currentTask = result.reply ?? result.thought
    schema.tasksCompleted += 1
  }

  private async handleBossCommand(agentId: string, command: string): Promise<void> {
    const agent = this.agents.get(agentId)
    const schema = this.state.agents.get(agentId)
    if (!agent || !schema) return

    this.refreshLLMClient()
    schema.status = 'working'
    schema.currentTask = command

    await agent.think(command)

    schema.status = 'idle'
  }

  private async handleLearnSkill(agentId: string, skillName: string, content: string): Promise<void> {
    const agent = this.agents.get(agentId)
    const schema = this.state.agents.get(agentId)
    if (!agent || !schema) return

    this.refreshLLMClient()
    schema.status = 'working'
    schema.currentTask = `กำลังเรียน: ${skillName}`

    await agent.learnSkill(skillName, content)

    schema.status = 'idle'
    schema.currentTask = `เรียนจบแล้ว: ${skillName} ✨`
  }

  onLeave(client: Client): void {
    // clients are observers; agents keep running
  }

  onDispose(): void {
    for (const interval of this.thinkIntervals.values()) {
      clearInterval(interval)
    }
    this.memory.close()
  }

  private createSnapshot(): {
    companyId: string
    companyName: string
    agents: Array<{
      id: string
      name: string
      role: string
      department: string
      status: string
      currentTask: string
      qualityScore: number
      tasksCompleted: number
    }>
    activeAgentCount: number
  } {
    return {
      companyId: this.state.companyId,
      companyName: this.state.companyName,
      agents: Array.from(this.state.agents.values()).map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        department: agent.department,
        status: agent.status,
        currentTask: agent.currentTask,
        qualityScore: agent.qualityScore,
        tasksCompleted: agent.tasksCompleted,
      })),
      activeAgentCount: this.state.activeAgentCount,
    }
  }

  private refreshLLMClient(): void {
    const settings = llmSettingsStore.get()
    if (settings.updatedAt === this.llmSettingsUpdatedAt && this.llmClient) return

    this.llmClient = llmSettingsStore.createClient()
    this.llmSettingsUpdatedAt = settings.updatedAt

    for (const agent of this.agents.values()) {
      agent.setLLMClient(this.llmClient)
    }
  }
}
