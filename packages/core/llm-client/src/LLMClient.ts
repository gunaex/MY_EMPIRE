import OpenAI from 'openai'
import { parseLLMResponse, type Result, type LLMError } from './parseLLMResponse'

export interface LLMClientConfig {
  baseURL: string
  apiKey?: string
  model: string
  fallbackModel?: string
  maxRetries?: number
  timeoutMs?: number
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMCallOptions {
  temperature?: number
  maxTokens?: number
  tools?: OpenAI.Chat.ChatCompletionTool[]
}

export class LLMClient {
  private client: OpenAI
  private config: Required<LLMClientConfig>

  constructor(config: LLMClientConfig) {
    this.config = {
      apiKey: 'not-required-for-local',
      fallbackModel: config.model,
      maxRetries: 3,
      timeoutMs: 30_000,
      ...config,
    }

    this.client = new OpenAI({
      baseURL: this.config.baseURL,
      apiKey: this.config.apiKey,
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeoutMs,
    })
  }

  async chat(
    messages: ChatMessage[],
    options: LLMCallOptions = {}
  ): Promise<Result<string, LLMError>> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        tools: options.tools,
      })

      const content = response.choices[0]?.message?.content ?? ''
      return { ok: true, value: content }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        ok: false,
        error: { code: 'API_ERROR', message },
      }
    }
  }

  async chatJSON<T>(
    messages: ChatMessage[],
    options: LLMCallOptions = {}
  ): Promise<Result<T, LLMError>> {
    const rawResult = await this.chat(messages, options)
    if (!rawResult.ok) return rawResult

    return parseLLMResponse<T>(rawResult.value)
  }
}

/**
 * Factory: สร้าง LLMClient จาก environment variables
 */
export function createLLMClientFromEnv(): LLMClient {
  const baseURL = process.env['LLM_BASE_URL'] ?? 'http://127.0.0.1:1234/v1'
  const model = process.env['LLM_DEFAULT_MODEL'] ?? 'local/gemma-4b'
  const fallbackModel = process.env['LLM_FALLBACK_MODEL'] ?? 'openai/gpt-4o'
  const apiKey = process.env['OPENAI_API_KEY'] ?? 'lm-studio'

  return new LLMClient({ baseURL, model, fallbackModel, apiKey })
}

export { parseLLMResponse, parseLLMResponseStrict } from './parseLLMResponse'
export type { Result, LLMError } from './parseLLMResponse'
