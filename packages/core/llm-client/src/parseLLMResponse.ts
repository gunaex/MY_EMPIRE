// ============================================================
// parseLLMResponse — CRITICAL utility for LLM output hardening
// ใช้กับทุก LLM call ไม่มีข้อยกเว้น (รวม local models < 7B)
// ============================================================

export type Result<T, E = LLMError> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export interface LLMError {
  code: 'PARSE_FAILED' | 'EMPTY_RESPONSE' | 'TIMEOUT' | 'API_ERROR'
  message: string
  raw?: string
}

/**
 * 3-tier LLM response parser — never throws uncaught errors
 *
 * Tier 1: direct JSON.parse()
 * Tier 2: strip markdown fences (```json) and retry
 * Tier 3: return raw text as fallback string value
 */
export async function parseLLMResponse<T>(
  raw: string | null | undefined
): Promise<Result<T, LLMError>> {
  if (!raw || raw.trim() === '') {
    return {
      ok: false,
      error: { code: 'EMPTY_RESPONSE', message: 'LLM returned empty response' },
    }
  }

  const trimmed = raw.trim()

  // Tier 1: direct JSON.parse
  try {
    const parsed = JSON.parse(trimmed) as T
    return { ok: true, value: parsed }
  } catch {
    // continue to Tier 2
  }

  // Tier 2: strip markdown fences (```json ... ``` or ``` ... ```)
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim()) as T
      return { ok: true, value: parsed }
    } catch {
      // continue to Tier 3
    }
  }

  // Tier 3: raw text fallback — caller decides how to handle
  return {
    ok: true,
    value: trimmed as unknown as T,
  }
}

/**
 * Strict variant — fails if result is not a proper object/array (not raw text)
 */
export async function parseLLMResponseStrict<T extends object>(
  raw: string | null | undefined
): Promise<Result<T, LLMError>> {
  const result = await parseLLMResponse<T>(raw)
  if (!result.ok) return result

  if (typeof result.value !== 'object' || result.value === null) {
    return {
      ok: false,
      error: {
        code: 'PARSE_FAILED',
        message: 'Response is not a JSON object',
        raw: typeof raw === 'string' ? raw : undefined,
      },
    }
  }

  return result
}
