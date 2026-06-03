export type LLMProvider = 'lm_studio' | 'ollama' | 'litellm' | 'openai' | 'custom'

export interface PublicLLMSettings {
  provider: LLMProvider
  baseURL: string
  model: string
  fallbackModel: string
  timeoutMs: number
  updatedAt: string
  hasApiKey: boolean
}

export interface LLMSettingsInput {
  provider: LLMProvider
  baseURL: string
  model: string
  fallbackModel: string
  apiKey?: string
  timeoutMs: number
}

const wsUrl = import.meta.env['VITE_SERVER_WS_URL'] as string | undefined
const explicitHttpUrl = import.meta.env['VITE_SERVER_HTTP_URL'] as string | undefined

function getApiBaseUrl(): string {
  if (explicitHttpUrl) return explicitHttpUrl.replace(/\/$/, '')
  if (wsUrl) {
    return wsUrl.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:').replace(/\/$/, '')
  }
  return `${window.location.protocol}//${window.location.hostname}:3000`
}

const apiBaseUrl = getApiBaseUrl()

export async function fetchLLMSettings(): Promise<PublicLLMSettings> {
  const response = await fetch(`${apiBaseUrl}/api/settings/llm`)
  if (!response.ok) throw new Error(`โหลดการตั้งค่า LLM ไม่สำเร็จ (${response.status})`)
  return response.json() as Promise<PublicLLMSettings>
}

export async function saveLLMSettings(settings: LLMSettingsInput): Promise<PublicLLMSettings> {
  const response = await fetch(`${apiBaseUrl}/api/settings/llm`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `บันทึกไม่สำเร็จ (${response.status})` })) as { error?: string }
    throw new Error(error.error ?? `บันทึกไม่สำเร็จ (${response.status})`)
  }

  return response.json() as Promise<PublicLLMSettings>
}

export async function testLLMSettings(): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/api/settings/llm/test`, { method: 'POST' })
  const body = await response.json().catch(() => ({})) as { ok?: boolean; reply?: string; error?: { message?: string } }
  if (!response.ok || !body.ok) {
    throw new Error(body.error?.message ?? `ทดสอบไม่สำเร็จ (${response.status})`)
  }

  return body.reply ?? 'พร้อมทำงาน'
}
