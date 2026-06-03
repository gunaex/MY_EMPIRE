import React, { useState } from 'react'
import { useEmpireStore } from '../../store/empireStore.js'
import { sendSGMDecision } from '../../net/empireClient.js'

/**
 * HRPanel — SGM Approval Queue
 * แสดง pending HR decisions ที่รอการอนุมัติจาก SGM
 */
export function HRPanel() {
  const { approvalQueue, removeApproval, setCurrentView } = useEmpireStore()
  const [selected, setSelected] = useState<string | null>(null)

  const pendingList = Object.values(approvalQueue)

  const handleDecision = (id: string, decision: 'approve' | 'reject') => {
    void sendSGMDecision(id, decision).catch((error: unknown) => {
      console.error('SGM decision failed:', error)
      removeApproval(id)
    })
    setSelected(null)
  }

  return (
    <div className="hr-panel">
      <header>
        <button onClick={() => setCurrentView('empire_map')}>← กลับ</button>
        <h2>👔 HR — รอการอนุมัติ</h2>
      </header>

      {pendingList.length === 0 ? (
        <div className="empty-state">
          <p>✅ ไม่มีเรื่องรอการอนุมัติ</p>
        </div>
      ) : (
        <div className="approval-list">
          {pendingList.map((item) => (
            <div
              key={item.id}
              className={`approval-item ${selected === item.id ? 'selected' : ''}`}
              onClick={() => setSelected(item.id)}
            >
              <div className="drama-scene">
                <p className="hr-message">👔 คุณ HR: &ldquo;{item.message}&rdquo;</p>
                <p className="agent-name">เกี่ยวกับ: {item.agentName}</p>
              </div>

              {selected === item.id && (
                <div className="decision-buttons">
                  <button
                    className="btn-approve"
                    onClick={() => handleDecision(item.id, 'approve')}
                  >
                    ✅ อนุมัติให้เลิกจ้าง
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleDecision(item.id, 'reject')}
                  >
                    ❌ ให้โอกาสอีกครั้ง
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
