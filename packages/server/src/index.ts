import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { Server } from 'colyseus'
import { createServer } from 'http'
import { monitor } from '@colyseus/monitor'
import { OfficeRoom } from './rooms/OfficeRoom'
import { EmpireRoom } from './rooms/EmpireRoom'
import type { AgentAction } from '@empire/agent-engine'
import { llmSettingsStore, type LLMSettingsInput } from './config/LLMSettings'

const PORT = parseInt(process.env['SERVER_PORT'] ?? '3000', 10)

const app = express()
app.use(cors())
app.use(express.json())

// ── Colyseus ──────────────────────────────────────────────────
const httpServer = createServer(app)
const gameServer = new Server({ server: httpServer })

gameServer.define('empire', EmpireRoom)
gameServer.define('office', OfficeRoom)

// Colyseus monitor (dev only)
if (process.env['NODE_ENV'] !== 'production') {
  app.use('/colyseus', monitor())
}

// ── Webhook Endpoint (n8n / Make.com / Zapier) ────────────────
app.post('/agent/action', (req, res) => {
  const secret = req.headers['x-webhook-secret']
  if (secret !== process.env['WEBHOOK_SECRET']) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { agentId, companyId, action, payload } = req.body as {
    agentId: string
    companyId: string
    action: AgentAction
    payload?: Record<string, unknown>
  }

  if (!agentId || !companyId || !action) {
    res.status(400).json({ error: 'Missing required fields: agentId, companyId, action' })
    return
  }

  // Forward to agent via Colyseus room message
  // (rooms broadcast result back to subscribers)
  res.json({ ok: true, queued: true, agentId, action })
})

// ── Runtime LLM Settings ─────────────────────────────────────
app.get('/api/settings/llm', (_req, res) => {
  res.json(llmSettingsStore.getPublic())
})

app.put('/api/settings/llm', (req, res) => {
  try {
    const settings = llmSettingsStore.update(req.body as LLMSettingsInput)
    res.json(settings)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(400).json({ error: message })
  }
})

app.post('/api/settings/llm/test', async (_req, res) => {
  const client = llmSettingsStore.createClient()
  const result = await client.chat([
    { role: 'system', content: 'ตอบกลับสั้น ๆ เป็นภาษาไทย' },
    { role: 'user', content: 'ทดสอบการเชื่อมต่อ LLM ตอบว่า พร้อมทำงาน' },
  ], { maxTokens: 64, temperature: 0.1 })

  if (result.ok) {
    res.json({ ok: true, reply: result.value })
    return
  }

  res.status(502).json({ ok: false, error: result.error })
})

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    service: 'AgentEmpire Server',
    status: 'ok',
    endpoints: {
      health: '/health',
      llmSettings: '/api/settings/llm',
      colyseusMonitor: '/colyseus',
      webhook: '/agent/action',
    },
    timestamp: new Date().toISOString(),
  })
})

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

httpServer.listen(PORT, () => {
  console.log(`🏢 AgentEmpire Server running on http://localhost:${PORT}`)
  console.log(`🎮 Colyseus monitor: http://localhost:${PORT}/colyseus`)
  console.log(`🔌 Webhook: POST http://localhost:${PORT}/agent/action`)
  console.log(`📊 Resource mode: ${process.env['RESOURCE_MODE'] ?? 'notebook'}`)
})
