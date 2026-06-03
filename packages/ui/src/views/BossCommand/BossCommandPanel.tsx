import React, { useState } from 'react'
import { useEmpireStore } from '../../store/empireStore.js'
import { sendBossCommand, sendLearnSkill } from '../../net/empireClient.js'

/**
 * BossCommandPanel — SGM ส่ง command ให้ agent
 * รวม: boss command + skill learning order
 */
export function BossCommandPanel() {
  const { companies, activeCompanyId, setCurrentView } = useEmpireStore()

  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [commandText, setCommandText] = useState('')
  const [mode, setMode] = useState<'command' | 'learn'>('command')
  const [skillName, setSkillName] = useState('')
  const [skillContent, setSkillContent] = useState('')
  const [sent, setSent] = useState(false)

  const company = activeCompanyId ? companies[activeCompanyId] : null
  const agents = company ? Object.values(company.agents) : []

  const handleSend = () => {
    if (!selectedAgent || !activeCompanyId) return

    const result = mode === 'command'
      ? sendBossCommand(activeCompanyId, selectedAgent, commandText)
      : sendLearnSkill(activeCompanyId, selectedAgent, skillName, skillContent)

    void result.catch((error: unknown) => {
      console.error('Boss command failed:', error)
      setSent(false)
    })
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <div className="boss-command-panel">
      <header>
        <button onClick={() => setCurrentView('empire_map')}>← กลับ</button>
        <h2>👑 Boss Command Panel</h2>
      </header>

      <div className="mode-toggle">
        <button
          className={mode === 'command' ? 'active' : ''}
          onClick={() => setMode('command')}
        >
          ⚡ สั่งงาน
        </button>
        <button
          className={mode === 'learn' ? 'active' : ''}
          onClick={() => setMode('learn')}
        >
          📚 สั่งเรียน
        </button>
      </div>

      <div className="form">
        <label>เลือก Agent</label>
        <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
          <option value="">-- เลือก agent --</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.role})
            </option>
          ))}
        </select>

        {mode === 'command' ? (
          <>
            <label>คำสั่ง (ภาษาไทย)</label>
            <textarea
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              placeholder="เช่น: ค้นหาเทรนด์ TikTok วันนี้และเขียน caption 3 ชิ้น"
              rows={4}
            />
          </>
        ) : (
          <>
            <label>ชื่อทักษะที่ต้องการเรียน</label>
            <input
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="เช่น: วิเคราะห์ข้อมูล Shopee"
            />
            <label>เนื้อหา/URL สำหรับเรียน</label>
            <textarea
              value={skillContent}
              onChange={(e) => setSkillContent(e.target.value)}
              placeholder="วางเนื้อหาที่ต้องการให้ agent เรียน..."
              rows={6}
            />
          </>
        )}

        <button
          className="btn-send"
          onClick={handleSend}
          disabled={!selectedAgent || (!commandText && !skillName)}
        >
          {sent ? '✅ ส่งแล้ว!' : mode === 'command' ? '⚡ ส่งคำสั่ง' : '📚 สั่งเรียน'}
        </button>
      </div>
    </div>
  )
}
