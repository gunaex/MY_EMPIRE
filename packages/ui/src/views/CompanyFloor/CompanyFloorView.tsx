import React, { useEffect } from 'react'
import { useEmpireStore } from '../../store/empireStore.js'
import { joinOfficeRoom } from '../../net/empireClient.js'

export function CompanyFloorView() {
  const { activeCompanyId, companies, setCurrentView } = useEmpireStore()
  const company = activeCompanyId ? companies[activeCompanyId] : null
  const agents = company ? Object.values(company.agents) : []

  useEffect(() => {
    if (!activeCompanyId) return

    void joinOfficeRoom(activeCompanyId).catch((error: unknown) => {
      console.error('Office room connection failed:', error)
    })
  }, [activeCompanyId])

  if (!company) {
    return (
      <div className="company-floor">
        <header>
          <button onClick={() => setCurrentView('empire_map')}>← กลับ</button>
          <h2>ยังไม่ได้เลือกบริษัท</h2>
        </header>
      </div>
    )
  }

  return (
    <div className="company-floor">
      <header>
        <button onClick={() => setCurrentView('empire_map')}>← กลับ</button>
        <div>
          <h2>{company.name}</h2>
          <p>{company.type} · {agents.length} agents</p>
        </div>
        <button onClick={() => setCurrentView('boss_command')}>👑 สั่งงาน</button>
      </header>

      <div className="agent-grid">
        {agents.length === 0 ? (
          <div className="empty-state">กำลังโหลด agent จาก OfficeRoom...</div>
        ) : (
          agents.map((agent) => (
            <div className={`agent-card status-${agent.status}`} key={agent.id}>
              <div className="agent-topline">
                <strong>{agent.name}</strong>
                <span>{agent.status}</span>
              </div>
              <p>{agent.role} · {agent.department}</p>
              <p className="agent-task">{agent.currentTask || 'พร้อมรับงาน'}</p>
              <div className="agent-stats">
                <span>QA {Math.round(agent.qualityScore * 100)}%</span>
                <span>{agent.tasksCompleted} งาน</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
