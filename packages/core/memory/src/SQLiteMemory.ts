import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

export interface AgentMemoryRecord {
  id?: number
  agentId: string
  companyId: string
  key: string
  value: string
  createdAt: string
  updatedAt: string
}

export interface AgentSkillRecord {
  skillId: string
  name: string
  agentId: string
  toolDefinition: string   // JSON-stringified LLMToolDefinition
  learnedAt: string
  sourceDocuments: string  // JSON array
  usageCount: number
}

/**
 * L2 Memory — SQLite long-term storage per agent/company
 */
export class SQLiteMemory {
  private db: Database.Database

  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? process.env['DB_PATH'] ?? './data/empire.sqlite'
    const dir = path.dirname(resolvedPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    this.db = new Database(resolvedPath)
    this.migrate()
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_memory (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id   TEXT NOT NULL,
        company_id TEXT NOT NULL,
        key        TEXT NOT NULL,
        value      TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(agent_id, company_id, key)
      );

      CREATE TABLE IF NOT EXISTS agent_skills (
        skill_id         TEXT PRIMARY KEY,
        name             TEXT NOT NULL,
        agent_id         TEXT NOT NULL,
        tool_definition  TEXT NOT NULL,
        learned_at       TEXT NOT NULL DEFAULT (datetime('now')),
        source_documents TEXT NOT NULL DEFAULT '[]',
        usage_count      INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS agent_productivity (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id          TEXT NOT NULL,
        company_id        TEXT NOT NULL,
        date              TEXT NOT NULL,
        tasks_completed   INTEGER NOT NULL DEFAULT 0,
        tasks_assigned    INTEGER NOT NULL DEFAULT 0,
        quality_score     REAL NOT NULL DEFAULT 0,
        response_time_avg REAL NOT NULL DEFAULT 0,
        UNIQUE(agent_id, company_id, date)
      );
    `)
  }

  set(agentId: string, companyId: string, key: string, value: unknown): void {
    const serialized = JSON.stringify(value)
    this.db
      .prepare(
        `INSERT INTO agent_memory (agent_id, company_id, key, value, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(agent_id, company_id, key) DO UPDATE
         SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(agentId, companyId, key, serialized)
  }

  get<T>(agentId: string, companyId: string, key: string): T | null {
    const row = this.db
      .prepare(
        `SELECT value FROM agent_memory WHERE agent_id = ? AND company_id = ? AND key = ?`
      )
      .get(agentId, companyId, key) as { value: string } | undefined

    if (!row) return null
    try {
      return JSON.parse(row.value) as T
    } catch {
      return row.value as unknown as T
    }
  }

  getAll(agentId: string, companyId: string): Record<string, unknown> {
    const rows = this.db
      .prepare(`SELECT key, value FROM agent_memory WHERE agent_id = ? AND company_id = ?`)
      .all(agentId, companyId) as { key: string; value: string }[]

    return Object.fromEntries(
      rows.map((r) => {
        try {
          return [r.key, JSON.parse(r.value)]
        } catch {
          return [r.key, r.value]
        }
      })
    )
  }

  registerSkill(skill: Omit<AgentSkillRecord, 'usageCount'>): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO agent_skills
         (skill_id, name, agent_id, tool_definition, learned_at, source_documents, usage_count)
         VALUES (?, ?, ?, ?, ?, ?, 0)`
      )
      .run(
        skill.skillId,
        skill.name,
        skill.agentId,
        skill.toolDefinition,
        skill.learnedAt,
        skill.sourceDocuments
      )
  }

  getSkills(agentId: string): AgentSkillRecord[] {
    return this.db
      .prepare(`SELECT * FROM agent_skills WHERE agent_id = ?`)
      .all(agentId) as AgentSkillRecord[]
  }

  recordProductivity(
    agentId: string,
    companyId: string,
    data: { tasksCompleted: number; tasksAssigned: number; qualityScore: number; responseTimeAvg: number }
  ): void {
    const today = new Date().toISOString().split('T')[0]!
    this.db
      .prepare(
        `INSERT INTO agent_productivity
           (agent_id, company_id, date, tasks_completed, tasks_assigned, quality_score, response_time_avg)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(agent_id, company_id, date) DO UPDATE SET
           tasks_completed   = tasks_completed + excluded.tasks_completed,
           tasks_assigned    = tasks_assigned + excluded.tasks_assigned,
           quality_score     = excluded.quality_score,
           response_time_avg = excluded.response_time_avg`
      )
      .run(agentId, companyId, today, data.tasksCompleted, data.tasksAssigned, data.qualityScore, data.responseTimeAvg)
  }

  getProductivityLast(agentId: string, companyId: string, days: number) {
    return this.db
      .prepare(
        `SELECT * FROM agent_productivity
         WHERE agent_id = ? AND company_id = ?
           AND date >= date('now', ?)
         ORDER BY date DESC`
      )
      .all(agentId, companyId, `-${days} days`)
  }

  close(): void {
    this.db.close()
  }
}
