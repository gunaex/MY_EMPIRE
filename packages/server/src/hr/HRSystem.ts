import { SQLiteMemory } from '@empire/memory'
import type { Room } from 'colyseus'
import type { EmpireRoomState } from '../rooms/EmpireRoomState'

const LAZY_THRESHOLD_DAYS = 3

/**
 * HR System — ตรวจสอบ productivity และ flag lazy agents
 * รันทุกวันโดย BullMQ scheduler
 */
export class HRSystem {
  private memory: SQLiteMemory

  constructor(memory: SQLiteMemory) {
    this.memory = memory
  }

  /**
   * ตรวจสอบ productivity ของทุก agent ใน company
   * เรียกโดย scheduler ทุกวัน
   */
  async auditCompany(
    companyId: string,
    agentIds: string[],
    threshold: number,
    empireRoom: Room<EmpireRoomState>
  ): Promise<void> {
    for (const agentId of agentIds) {
      const records = this.memory.getProductivityLast(agentId, companyId, LAZY_THRESHOLD_DAYS) as Array<{
        tasks_completed: number
        tasks_assigned: number
        quality_score: number
      }>

      if (records.length < LAZY_THRESHOLD_DAYS) continue

      const allLow = records.every((r) => {
        if (r.tasks_assigned === 0) return false
        const score = (r.tasks_completed / r.tasks_assigned) * 10
        return score < threshold
      })

      if (allLow) {
        const agentName = this.memory.get<string>(agentId, companyId, 'name') ?? agentId

        // ส่งไปที่ SGM approval queue ผ่าน EmpireRoom
        ;(empireRoom as unknown as { addApprovalRequest: Function }).addApprovalRequest('fire_agent', {
          companyId,
          agentId,
          agentName: agentName,
          reason: `ประสิทธิภาพต่ำกว่ามาตรฐาน ${LAZY_THRESHOLD_DAYS} วันติดต่อกัน`,
        })
      }
    }
  }
}
