import Phaser from 'phaser'
import { useEmpireStore, type AgentData } from '../store/empireStore.js'

interface AgentSprite {
  sprite: Phaser.GameObjects.Rectangle
  nameText: Phaser.GameObjects.Text
  statusBubble: Phaser.GameObjects.Text
  agentId: string
}

/**
 * Phaser Scene สำหรับ Office Floor ของ 1 company
 * Subscribe ต่อ Zustand store — ไม่ communicate โดยตรงกับ React
 */
export class OfficeScene extends Phaser.Scene {
  private agentSprites: Map<string, AgentSprite> = new Map()
  private companyId: string = ''
  private unsubscribe?: () => void

  constructor() {
    super({ key: 'OfficeScene' })
  }

  init(data: { companyId: string }): void {
    this.companyId = data.companyId
  }

  create(): void {
    this.add.rectangle(400, 300, 800, 600, 0x1a1a2e)

    // Grid lines (office floor)
    const graphics = this.add.graphics()
    graphics.lineStyle(1, 0x2a2a4e, 0.5)
    for (let x = 0; x <= 800; x += 80) {
      graphics.lineBetween(x, 0, x, 600)
    }
    for (let y = 0; y <= 600; y += 80) {
      graphics.lineBetween(0, y, 800, y)
    }

    this.add.text(400, 30, `🏢 ${this.companyId}`, {
      fontSize: '18px', color: '#e2e8f0', fontFamily: 'Arial',
    }).setOrigin(0.5)

    // Subscribe to Zustand store for agent updates
    this.unsubscribe = useEmpireStore.subscribe(
      (state) => state.companies[this.companyId]?.agents,
      (agents) => {
        if (agents) this.syncAgents(agents)
      }
    )

    // Initial sync
    const company = useEmpireStore.getState().companies[this.companyId]
    if (company) this.syncAgents(company.agents)
  }

  private syncAgents(agents: Record<string, AgentData>): void {
    const agentList = Object.values(agents)

    agentList.forEach((agent, idx) => {
      const x = 100 + (idx % 4) * 170
      const y = 150 + Math.floor(idx / 4) * 150

      if (!this.agentSprites.has(agent.id)) {
        this.createAgentSprite(agent, x, y)
      } else {
        this.updateAgentSprite(agent)
      }
    })
  }

  private createAgentSprite(agent: AgentData, x: number, y: number): void {
    const color = this.statusColor(agent.status)
    const sprite = this.add.rectangle(x, y, 60, 60, color)

    const nameText = this.add.text(x, y + 40, agent.name, {
      fontSize: '11px', color: '#e2e8f0', fontFamily: 'Arial',
    }).setOrigin(0.5)

    const statusBubble = this.add.text(x, y - 45, this.statusEmoji(agent.status), {
      fontSize: '20px',
    }).setOrigin(0.5)

    this.agentSprites.set(agent.id, { sprite, nameText, statusBubble, agentId: agent.id })
  }

  private updateAgentSprite(agent: AgentData): void {
    const s = this.agentSprites.get(agent.id)
    if (!s) return
    s.sprite.setFillStyle(this.statusColor(agent.status))
    s.statusBubble.setText(this.statusEmoji(agent.status))
  }

  private statusColor(status: AgentData['status']): number {
    const map: Record<string, number> = {
      idle: 0x4ade80,
      thinking: 0xfacc15,
      working: 0x60a5fa,
      error: 0xf87171,
      fired: 0x6b7280,
    }
    return map[status] ?? 0x6b7280
  }

  private statusEmoji(status: AgentData['status']): string {
    const map: Record<string, string> = {
      idle: '😊',
      thinking: '💭',
      working: '⚡',
      error: '😰',
      fired: '🚪',
    }
    return map[status] ?? '❓'
  }

  destroy(): void {
    this.unsubscribe?.()
  }
}
