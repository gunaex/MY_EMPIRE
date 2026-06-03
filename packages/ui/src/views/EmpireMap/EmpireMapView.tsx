import React from 'react'
import { useEmpireStore } from '../../store/empireStore.js'

/**
 * EmpireMapView — top-level view แสดง grid ของทุก company
 * เหมือนแผนที่เมือง แต่ละ card = 1 company
 */
export function EmpireMapView() {
  const { companies, approvalQueue, setActiveCompany, setCurrentView } = useEmpireStore()

  const approvalCount = Object.keys(approvalQueue).length
  const companiesList = Object.values(companies)

  const handleOpenCompany = (companyId: string) => {
    setActiveCompany(companyId)
    setCurrentView('company_floor')
  }

  return (
    <div className="empire-map">
      <header className="empire-header">
        <h1>🌆 AGENT EMPIRE</h1>
        <p className="subtitle">แผนที่บริษัทของคุณ</p>
        {approvalCount > 0 && (
          <button
            className="approval-badge"
            onClick={() => setCurrentView('hr_panel')}
          >
            📬 รอการอนุมัติ: {approvalCount} เรื่อง
          </button>
        )}
      </header>

      <div className="company-grid">
        {companiesList.map((company) => (
          <CompanyCard
            key={company.companyId}
            company={company}
            onClick={() => handleOpenCompany(company.companyId)}
          />
        ))}

        <button
          className="add-company-card"
          onClick={() => setCurrentView('boss_command')}
        >
          <span className="add-icon">➕</span>
          <span>เพิ่มบริษัทใหม่</span>
        </button>
      </div>
    </div>
  )
}

interface CompanyCardProps {
  company: ReturnType<typeof useEmpireStore.getState>['companies'][string]
  onClick: () => void
}

function CompanyCard({ company, onClick }: CompanyCardProps) {
  const typeEmoji: Record<string, string> = {
    ecommerce: '🏬',
    content_studio: '🎬',
    logistics: '🚚',
    finance: '💰',
    custom: '🏢',
  }

  const statusColor: Record<string, string> = {
    active: '#4ade80',
    alert: '#facc15',
    paused: '#6b7280',
  }

  return (
    <button
      className={`company-card status-${company.status}`}
      onClick={onClick}
      style={{ borderColor: statusColor[company.status] ?? '#6b7280' }}
    >
      <div className="company-emoji">{typeEmoji[company.type] ?? '🏢'}</div>
      <div className="company-name">{company.name}</div>
      <div className="company-meta">
        <span>● {company.agentCount} agents</span>
        {company.status === 'alert' ? (
          <span className="alert">⚠ {company.alertCount} แจ้งเตือน</span>
        ) : (
          <span className="ok">✅ ปกติ</span>
        )}
      </div>
    </button>
  )
}
