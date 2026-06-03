import type { AgentAction } from '@empire/agent-engine'

export interface WebhookPayload {
  agentId: string
  companyId: string
  action: AgentAction
  data?: Record<string, unknown>
  timestamp: string
}

export interface WebhookResult {
  ok: boolean
  statusCode: number
  body?: unknown
  error?: string
}

/**
 * Webhook client สำหรับส่งผลลัพธ์ไปยัง n8n / Make.com / Zapier
 */
export class WebhookClient {
  private webhookUrl: string
  private secret: string

  constructor(webhookUrl?: string, secret?: string) {
    this.webhookUrl = webhookUrl ?? process.env['WEBHOOK_URL'] ?? ''
    this.secret = secret ?? process.env['WEBHOOK_SECRET'] ?? ''
  }

  async send(payload: Omit<WebhookPayload, 'timestamp'>): Promise<WebhookResult> {
    if (!this.webhookUrl) {
      return { ok: false, statusCode: 0, error: 'WEBHOOK_URL not configured' }
    }

    const body: WebhookPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    }

    try {
      const { default: fetch } = await import('node-fetch')
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': this.secret,
        },
        body: JSON.stringify(body),
      })

      const responseBody = response.headers.get('content-type')?.includes('json')
        ? await response.json()
        : await response.text()

      return {
        ok: response.ok,
        statusCode: response.status,
        body: responseBody,
      }
    } catch (err) {
      return {
        ok: false,
        statusCode: 0,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }
}

export { WebhookClient as default }
