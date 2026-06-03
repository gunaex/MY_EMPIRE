import { LLMClient, parseLLMResponse } from '@empire/llm-client'
import fs from 'fs'
import path from 'path'

/**
 * Shadow PM — Solo developer survival system
 * - Daily standup brief
 * - Context Capsule auto-update
 * - Risk flagging
 */
export class ShadowPM {
  private llmClient: LLMClient
  private contextPath: string

  constructor(llmClient: LLMClient, contextPath?: string) {
    this.llmClient = llmClient
    this.contextPath = contextPath ?? path.join(process.cwd(), 'project-brain', 'CONTEXT.md')
  }

  /**
   * สร้าง daily standup brief (08:00)
   */
  async generateStandup(recentWork: string[]): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: `คุณคือ Shadow PM ผู้ช่วย Solo Developer
สร้าง daily standup brief ภาษาไทย ให้กระชับ ชัดเจน ในรูปแบบ:
✅ เสร็จแล้ว (เมื่อวาน)
🔄 วันนี้จะทำ
⚠️ ติดขัด/เสี่ยง
🎯 เป้าหมายวันนี้`,
      },
      {
        role: 'user' as const,
        content: `งานล่าสุด:\n${recentWork.join('\n')}`,
      },
    ]

    const result = await this.llmClient.chat(messages)
    return result.ok ? result.value : '⚠️ Shadow PM ไม่สามารถสร้าง standup ได้'
  }

  /**
   * อัพเดต Context Capsule หลัง work session
   */
  async updateContextCapsule(sessionNotes: string): Promise<void> {
    const currentContext = fs.existsSync(this.contextPath)
      ? fs.readFileSync(this.contextPath, 'utf-8')
      : ''

    const messages = [
      {
        role: 'system' as const,
        content: `คุณคือ Shadow PM กำลัง update Context Capsule
อัพเดตส่วน "สถานะปัจจุบัน" ใน CONTEXT.md ให้สะท้อน session ล่าสุด
คงโครงสร้างเดิมไว้ เปลี่ยนแค่ข้อมูลที่เกี่ยวข้อง
ตอบเป็น markdown เต็มไฟล์`,
      },
      {
        role: 'user' as const,
        content: `Context ปัจจุบัน:\n${currentContext}\n\nSession notes:\n${sessionNotes}`,
      },
    ]

    const result = await this.llmClient.chat(messages)
    if (result.ok) {
      const dir = path.dirname(this.contextPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(this.contextPath, result.value, 'utf-8')
    }
  }

  /**
   * ตรวจสอบ risk flags จาก task list
   */
  async flagRisks(tasks: { name: string; dueDate?: string; status: string }[]): Promise<string[]> {
    const messages = [
      {
        role: 'system' as const,
        content: `คุณคือ Shadow PM วิเคราะห์ความเสี่ยงจาก task list
ตอบ JSON array ของ risk messages ภาษาไทย เช่น:
["⚠️ งาน X ใกล้ deadline แต่ยังไม่เริ่ม", "🔴 มี scope creep ในส่วน Y"]`,
      },
      {
        role: 'user' as const,
        content: JSON.stringify(tasks, null, 2),
      },
    ]

    const result = await this.llmClient.chatJSON<string[]>(messages)
    return result.ok && Array.isArray(result.value) ? result.value : []
  }
}
