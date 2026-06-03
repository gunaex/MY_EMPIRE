import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { LLMClient, type LLMClientConfig } from '@empire/llm-client'

export type LLMProvider = 'lm_studio' | 'ollama' | 'litellm' | 'openai' | 'chatgpt' | 'gemini' | 'claude' | 'custom'

export interface LLMSettings {
  provider: LLMProvider
  baseURL: string
  model: string
  fallbackModel: string
  apiKey?: string
  timeoutMs: number
  updatedAt: string
}

export interface PublicLLMSettings extends Omit<LLMSettings, 'apiKey'> {
  hasApiKey: boolean
}

export interface LLMSettingsInput {
  provider?: LLMProvider
  baseURL?: string
  model?: string
  fallbackModel?: string
  apiKey?: string
  timeoutMs?: number
}

const providers: LLMProvider[] = ['lm_studio', 'ollama', 'litellm', 'openai', 'chatgpt', 'gemini', 'claude', 'custom']

function settingsPath(): string {
  return resolve(process.env['LLM_SETTINGS_PATH'] ?? './data/llm-settings.json')
}

function fromEnv(): LLMSettings {
  return {
    provider: (process.env['LLM_PROVIDER'] as LLMProvider | undefined) ?? 'lm_studio',
    baseURL: process.env['LLM_BASE_URL'] ?? 'http://127.0.0.1:1234/v1',
    model: process.env['LLM_DEFAULT_MODEL'] ?? 'local/gemma-4b',
    fallbackModel: process.env['LLM_FALLBACK_MODEL'] ?? 'openai/gpt-4o',
    apiKey: process.env['OPENAI_API_KEY'] || 'lm-studio',
    timeoutMs: parseInt(process.env['LLM_TIMEOUT_MS'] ?? '30000', 10),
    updatedAt: new Date().toISOString(),
  }
}

function assertSettings(value: unknown): asserts value is LLMSettings {
  if (typeof value !== 'object' || value === null) {
    throw new Error('LLM settings must be an object')
  }

  const record = value as Record<string, unknown>
  if (typeof record['provider'] !== 'string' || !providers.includes(record['provider'] as LLMProvider)) {
    throw new Error(`provider must be one of ${providers.join(', ')}`)
  }
  for (const key of ['baseURL', 'model', 'fallbackModel', 'updatedAt']) {
    if (typeof record[key] !== 'string' || record[key] === '') {
      throw new Error(`${key} is required`)
    }
  }
  if (typeof record['timeoutMs'] !== 'number' || record['timeoutMs'] < 1000) {
    throw new Error('timeoutMs must be at least 1000')
  }
}

function normalizeInput(input: LLMSettingsInput, current: LLMSettings): LLMSettings {
  const next: LLMSettings = {
    ...current,
    ...input,
    provider: input.provider ?? current.provider,
    baseURL: input.baseURL?.trim() ?? current.baseURL,
    model: input.model?.trim() ?? current.model,
    fallbackModel: input.fallbackModel?.trim() ?? current.fallbackModel,
    timeoutMs: input.timeoutMs ?? current.timeoutMs,
    updatedAt: new Date().toISOString(),
  }

  if (input.apiKey === '') {
    next.apiKey = undefined
  } else if (typeof input.apiKey === 'string') {
    next.apiKey = input.apiKey
  }

  assertSettings(next)
  return next
}

export class LLMSettingsStore {
  private current: LLMSettings

  constructor() {
    this.current = this.load()
  }

  get(): LLMSettings {
    return this.current
  }

  getPublic(): PublicLLMSettings {
    const { apiKey, ...rest } = this.current
    return { ...rest, hasApiKey: Boolean(apiKey) }
  }

  update(input: LLMSettingsInput): PublicLLMSettings {
    this.current = normalizeInput(input, this.current)
    this.save()
    return this.getPublic()
  }

  createClient(): LLMClient {
    const config: LLMClientConfig = {
      baseURL: this.current.baseURL,
      model: this.current.model,
      fallbackModel: this.current.fallbackModel,
      apiKey: this.current.apiKey || 'not-required-for-local',
      timeoutMs: this.current.timeoutMs,
    }
    return new LLMClient(config)
  }

  private load(): LLMSettings {
    const filePath = settingsPath()
    if (!existsSync(filePath)) return fromEnv()

    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown
    assertSettings(parsed)
    return parsed
  }

  private save(): void {
    const filePath = settingsPath()
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, JSON.stringify(this.current, null, 2))
  }
}

export const llmSettingsStore = new LLMSettingsStore()
