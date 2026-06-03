// Resource profile ที่ปรับตาม RESOURCE_MODE env
const RESOURCE_PROFILES = {
  notebook: {
    maxConcurrentThinks: 2,
    thinkCooldownMs: 5000,
    maxAgentsPerCompany: 5,
    llmModel: 'local/gemma-4b',
  },
  server: {
    maxConcurrentThinks: 10,
    thinkCooldownMs: 1000,
    maxAgentsPerCompany: 20,
    llmModel: 'local/llama3-70b',
  },
} as const

type ResourceMode = keyof typeof RESOURCE_PROFILES

export const resourceConfig =
  RESOURCE_PROFILES[(process.env['RESOURCE_MODE'] as ResourceMode) ?? 'notebook']
