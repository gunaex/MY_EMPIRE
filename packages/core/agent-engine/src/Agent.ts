import type { AgentConfig, AgentState, AgentAction } from './types'
import { LLMClient, parseLLMResponse } from '@empire/llm-client'
import { SQLiteMemory } from '@empire/memory'

export interface ThinkResult {
  thought: string
  action?: AgentAction
  actionPayload?: Record<string, unknown>
  reply?: string
}

/**
 * Core agent think-loop
 * Observe → Think → Act → Record
 */
export class Agent {
  readonly state: AgentState
  private llmClient: LLMClient
  private memory: SQLiteMemory

  constructor(config: AgentConfig, companyId: string, llmClient: LLMClient, memory: SQLiteMemory) {
    this.llmClient = llmClient
    this.memory = memory
    this.state = {
      config,
      companyId,
      status: 'idle',
      productivity: {
        tasksCompleted: 0,
        tasksAssigned: 0,
        qualityScore: 1.0,
        responseTimeAvg: 0,
        consecutiveLowPerformanceDays: 0,
      },
    }
  }

  get id(): string {
    return this.state.config.id
  }

  get name(): string {
    return this.state.config.name
  }

  /**
   * Main think cycle — เรียกโดย BullMQ scheduler
   */
  async think(taskDescription: string): Promise<ThinkResult> {
    this.state.status = 'thinking'
    this.state.currentTask = taskDescription
    const start = Date.now()

    // Load long-term memory context
    const memContext = this.memory.getAll(this.id, this.state.companyId)
    const memSummary = Object.keys(memContext).length > 0
      ? `ความจำระยะยาว:\n${JSON.stringify(memContext, null, 2)}`
      : 'ยังไม่มีความจำระยะยาว'

    const messages = [
      {
        role: 'system' as const,
        content: `คุณคือ ${this.name} ทำหน้าที่ ${this.state.config.role} ในแผนก ${this.state.config.department}
ทักษะที่มี: ${this.state.config.skills.join(', ')}
${memSummary}

ตอบเป็น JSON ในรูปแบบ:
{
  "thought": "ความคิดของคุณ (ภาษาไทย)",
  "action": "ชื่อ action ที่จะทำ (ถ้ามี)",
  "actionPayload": {},
  "reply": "ข้อความแสดงผล (ภาษาไทย)"
}`,
      },
      {
        role: 'user' as const,
        content: taskDescription,
      },
    ]

    try {
      const rawResult = await this.llmClient.chat(messages)
      const elapsed = Date.now() - start

      if (!rawResult.ok) {
        this.state.status = 'error'
        return { thought: `เกิดข้อผิดพลาด: ${rawResult.error.message}` }
      }

      const parsed = await parseLLMResponse<ThinkResult>(rawResult.value)
      const result: ThinkResult = parsed.ok
        ? parsed.value
        : { thought: rawResult.value, reply: rawResult.value }

      // Record productivity
      this.memory.recordProductivity(this.id, this.state.companyId, {
        tasksCompleted: 1,
        tasksAssigned: 1,
        qualityScore: 1.0,
        responseTimeAvg: elapsed,
      })

      this.state.status = 'idle'
      this.state.lastActiveAt = new Date()
      return result
    } catch (err) {
      this.state.status = 'error'
      return { thought: `Exception: ${String(err)}` }
    }
  }

  /**
   * Boss command — สั่งให้ agent เรียนทักษะใหม่
   */
  async learnSkill(skillName: string, sourceContent: string): Promise<void> {
    const messages = [
      {
        role: 'system' as const,
        content: `คุณคือ ${this.name} กำลังเรียนทักษะใหม่: "${skillName}"
อ่านเนื้อหาต่อไปนี้และสรุปเป็นความรู้ที่นำไปใช้งานได้ทันที ตอบเป็นภาษาไทย`,
      },
      { role: 'user' as const, content: sourceContent },
    ]

    const result = await this.llmClient.chat(messages)
    if (!result.ok) return

    // Save learned knowledge to L2 memory
    const skillKey = `skill:${skillName.toLowerCase().replace(/\s+/g, '_')}`
    this.memory.set(this.id, this.state.companyId, skillKey, {
      name: skillName,
      summary: result.value,
      learnedAt: new Date().toISOString(),
    })

    // Register in skill registry
    this.memory.registerSkill({
      skillId: `${this.id}:${skillKey}`,
      name: skillName,
      agentId: this.id,
      toolDefinition: JSON.stringify({
        type: 'function',
        function: {
          name: skillKey,
          description: `ทักษะ: ${skillName} — ${result.value.substring(0, 100)}`,
          parameters: { type: 'object', properties: {} },
        },
      }),
      learnedAt: new Date().toISOString(),
      sourceDocuments: JSON.stringify([]),
    })
  }

  isLazy(threshold: number): boolean {
    const p = this.state.productivity
    if (p.tasksAssigned === 0) return false
    const score = p.tasksCompleted / p.tasksAssigned
    return score < threshold / 10
  }
}
