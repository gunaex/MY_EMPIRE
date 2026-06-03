import React, { useEffect } from 'react'
import { useEmpireStore } from '../store/empireStore.js'
import { EmpireMapView } from './EmpireMap/EmpireMapView.js'
import { HRPanel } from './HRPanel/HRPanel.js'
import { BossCommandPanel } from './BossCommand/BossCommandPanel.js'
import { ShadowPMDashboard } from './ShadowPMDash/ShadowPMDashboard.js'
import { CompanyFloorView } from './CompanyFloor/CompanyFloorView.js'
import { connectEmpireRoom } from '../net/empireClient.js'

/**
 * ViewMode toggle — 🎮 Cartoon / 📊 Technical
 */
function ViewModeToggle() {
  const { viewMode, setViewMode } = useEmpireStore()
  return (
    <div className="view-mode-toggle">
      <button
        className={viewMode === 'cartoon' ? 'active' : ''}
        onClick={() => setViewMode('cartoon')}
      >
        🎮 Cartoon
      </button>
      <button
        className={viewMode === 'technical' ? 'active' : ''}
        onClick={() => setViewMode('technical')}
      >
        📊 Technical
      </button>
    </div>
  )
}

/**
 * Root app router — swaps views based on currentView in store
 */
export function AppRouter() {
  const currentView = useEmpireStore((s) => s.currentView)
  const connectionStatus = useEmpireStore((s) => s.connectionStatus)

  useEffect(() => {
    void connectEmpireRoom().catch((error: unknown) => {
      console.error('Empire room connection failed:', error)
    })
  }, [])

  const ViewMap: Record<typeof currentView, React.ReactElement> = {
    empire_map: <EmpireMapView />,
    company_floor: <CompanyFloorView />,
    hr_panel: <HRPanel />,
    boss_command: <BossCommandPanel />,
    shadow_pm: <ShadowPMDashboard />,
  }

  return (
    <div className="app">
      <ViewModeToggle />
      <div className={`connection-pill status-${connectionStatus}`}>
        {connectionStatus}
      </div>
      {ViewMap[currentView]}
    </div>
  )
}
