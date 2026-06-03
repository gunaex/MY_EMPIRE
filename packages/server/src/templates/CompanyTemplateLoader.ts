import { existsSync, readdirSync, readFileSync } from 'fs'
import { extname, join, resolve } from 'path'
import type { AgentConfig, CompanyConfig, CompanyType } from '@empire/agent-engine'

const companyTypes: CompanyType[] = ['ecommerce', 'content_studio', 'logistics', 'finance', 'custom']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function assertAgentConfig(value: unknown, filePath: string): asserts value is AgentConfig {
  if (!isRecord(value)) throw new Error(`${filePath}: agent must be an object`)

  const requiredStrings = ['id', 'name', 'role', 'department', 'llm', 'fallback_llm']
  for (const key of requiredStrings) {
    if (typeof value[key] !== 'string' || value[key] === '') {
      throw new Error(`${filePath}: agent.${key} is required`)
    }
  }

  if (!isStringArray(value['skills'])) {
    throw new Error(`${filePath}: agent.skills must be a string array`)
  }

  if (typeof value['memory'] !== 'boolean') {
    throw new Error(`${filePath}: agent.memory must be boolean`)
  }
}

function assertCompanyConfig(value: unknown, filePath: string): asserts value is CompanyConfig {
  if (!isRecord(value)) throw new Error(`${filePath}: company template must be an object`)

  if (typeof value['companyId'] !== 'string' || value['companyId'] === '') {
    throw new Error(`${filePath}: companyId is required`)
  }
  if (typeof value['name'] !== 'string' || value['name'] === '') {
    throw new Error(`${filePath}: name is required`)
  }
  if (typeof value['type'] !== 'string' || !companyTypes.includes(value['type'] as CompanyType)) {
    throw new Error(`${filePath}: type must be one of ${companyTypes.join(', ')}`)
  }
  if (!isStringArray(value['departments'])) {
    throw new Error(`${filePath}: departments must be a string array`)
  }
  if (!Array.isArray(value['agents'])) {
    throw new Error(`${filePath}: agents must be an array`)
  }

  for (const agent of value['agents']) {
    assertAgentConfig(agent, filePath)
  }
}

export function getTemplateDir(): string {
  if (process.env['COMPANY_TEMPLATE_DIR']) {
    return resolve(process.env['COMPANY_TEMPLATE_DIR'])
  }

  const candidates = [
    join(process.cwd(), 'src/templates'),
    join(process.cwd(), 'packages/server/src/templates'),
    join(__dirname),
  ]

  return resolve(candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]!)
}

export function loadCompanyTemplates(templateDir = getTemplateDir()): CompanyConfig[] {
  if (!existsSync(templateDir)) {
    console.warn(`Company template directory not found: ${templateDir}`)
    return []
  }

  const templates: CompanyConfig[] = []
  const files = readdirSync(templateDir)
    .filter((file) => extname(file) === '.json')
    .sort()

  for (const file of files) {
    const filePath = join(templateDir, file)
    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    assertCompanyConfig(parsed, filePath)
    templates.push(parsed)
  }

  return templates
}

export function loadCompanyTemplate(companyId: string, templateDir = getTemplateDir()): CompanyConfig | undefined {
  return loadCompanyTemplates(templateDir).find((template) => template.companyId === companyId)
}
