import React from 'react'
import { useEmpireStore } from '../../store/empireStore.js'

/**
 * ShadowPMDashboard — Daily standup, risk log, role rotation timer
 */
export function ShadowPMDashboard() {
  const { setCurrentView } = useEmpireStore()

  return (
    <div className="shadow-pm-dash">
      <header>
        <button onClick={() => setCurrentView('empire_map')}>← กลับ</button>
        <h2>🧠 Shadow PM Dashboard</h2>
      </header>

      <section className="role-rotation">
        <h3>⏱️ Role Rotation Protocol</h3>
        <div className="time-blocks">
          <div className="block pm">
            <span className="time">08:00–09:00</span>
            <span className="role">📋 PM MODE</span>
            <span className="desc">อ่าน standup · ตัดสินใจ</span>
          </div>
          <div className="block dev">
            <span className="time">09:00–12:00</span>
            <span className="role">💻 DEV MODE</span>
            <span className="desc">Copilot เขียน · review เท่านั้น</span>
          </div>
          <div className="block qa">
            <span className="time">13:00–14:00</span>
            <span className="role">🔍 QA MODE</span>
            <span className="desc">QA Agent รัน tests · judge edge cases</span>
          </div>
          <div className="block close">
            <span className="time">14:00–14:30</span>
            <span className="role">📦 CLOSE</span>
            <span className="desc">Shadow PM update CONTEXT.md</span>
          </div>
        </div>
      </section>

      <section className="standup">
        <h3>☀️ Daily Standup (08:00)</h3>
        <div className="standup-placeholder">
          <p>Shadow PM จะสร้าง standup brief อัตโนมัติ</p>
          <p className="hint">กำหนดให้รันอัตโนมัติเมื่อ Phase 4 เสร็จ</p>
        </div>
      </section>

      <section className="risk-log">
        <h3>⚠️ Risk Flags</h3>
        <div className="risk-placeholder">
          <p>ยังไม่มี risk flags ในขณะนี้</p>
        </div>
      </section>
    </div>
  )
}
