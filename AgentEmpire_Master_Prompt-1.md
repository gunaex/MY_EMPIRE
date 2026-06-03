# 🎮 AgentEmpire: Master Prompt & Roadmap
> **Version**: 1.0 Final  
> **Target**: GitHub Copilot / Cursor AI / Windsurf  
> **Base Repos**: devpanitan/Agent-office-thai + pixel-agents-hq/pixel-agents  
> **Context**: 1-person team (PM + Dev + QA) replacing a 10-person team using AI

---

## 🧭 Project Vision

Build a **pixel-art multi-agent office empire** where:
- Users create **multiple companies** in one empire (e-commerce, content studio, logistics, etc.)
- Each company has **AI agents** with defined roles in department rooms
- Agents work **24/7 autonomously**, report up the org chart, learn new skills, and can be fired/hired
- A **single human** acts as the SGM (Super General Manager) — approving key decisions only
- The system turns a **1-person operation into a 10-person team equivalent**

---

## 📦 Tech Stack

### Backend
- **Node.js + TypeScript** monorepo (extend existing Colyseus structure from Agent-office-thai)
- **LLM Router via LiteLLM**: unified interface supporting:
  - Local: LM Studio / Ollama → `http://127.0.0.1:1234` (Gemma, Llama, etc.)
  - Cloud: OpenAI GPT-4o, Anthropic Claude, Google Gemini
  - Config per-agent or per-company in JSON template
  - **Fallback rule**: if cloud API fails → auto-fallback to local model
- **Agent Framework**: LangGraph or Vercel AI SDK (TypeScript-native, avoid Python sidecar)
- **Memory per agent**:
  - Short-term: in-context window
  - Long-term: SQLite via `better-sqlite3` (already in repo)
  - Episodic / RAG: ChromaDB or pgvector
- **Task Scheduler**: BullMQ for 24/7 autonomous task scheduling (cron-based per agent)
- **LLM Response Hardening** (CRITICAL for local models):
  ```typescript
  // Wrap ALL LLM calls in this utility
  async function parseLLMResponse<T>(raw: string): Promise<Result<T, LLMError>> {
    // Step 1: attempt direct JSON.parse()
    // Step 2: strip markdown fences (```json) and retry
    // Step 3: extract raw text as fallback reply
    // NEVER throw uncaught — always return typed Result<T, LLMError>
    // Critical for LM Studio / Ollama with models < 7B params
  }
  ```

### Frontend
- **React + Phaser** (existing pixel art engine from Agent-office-thai)
- **State Management Bridge** (CRITICAL):
  ```typescript
  // Use Zustand — NOT direct Phaser↔React coupling
  // React owns: business logic state (agents, tasks, HR queue, empire data)
  // Phaser subscribes: via Zustand store listeners only
  // Rule: Never share mutable state directly between React and Phaser
  import { create } from 'zustand'
  const useEmpireStore = create<EmpireState>(...)
  ```
- **Views to add**:
  - `EmpireMapView` — top-level pixel map showing all companies as buildings
  - `CompanyFloorView` — existing office layout (one room per company)
  - `HRPanel` — hire/fire agents with SGM approval modal
  - `BossCommandPanel` — human GM sends skill-learning orders to agents
  - `ShadowPMDashboard` — daily standup, risk log, deadline tracker

### Automation Layer ("Arms")
- Expose webhook endpoints: `POST /agent/action`
- Compatible with **n8n**, **Make.com**, **Zapier**
- Supported action types:
  ```typescript
  type AgentAction =
    | 'post_social'        // Facebook, TikTok, Line, Instagram
    | 'fetch_sales_data'   // Shopee, Lazada, etc.
    | 'send_email'
    | 'search_web'
    | 'update_spreadsheet'
    | 'notify_slack'
  ```

---

## 🏢 Company Template System

Each company defined by JSON config:

```json
{
  "companyId": "ecom-001",
  "name": "ร้านขายดี Shop",
  "type": "ecommerce",
  "departments": ["Marketing", "Sales", "CustomerSupport", "Operations", "QA"],
  "agents": [
    {
      "id": "agent-mkt-01",
      "name": "น้องมาร์ค",
      "role": "Content Creator",
      "department": "Marketing",
      "llm": "local/gemma-4b",
      "fallback_llm": "openai/gpt-4o",
      "skills": ["write_thai_caption", "search_trends", "post_facebook"],
      "memory": true,
      "rag_collection": "brand_guidelines",
      "schedule": "*/30 * * * *",
      "productivity_threshold": 3
    }
  ]
}
```

**Supported company types**: `ecommerce` | `content_studio` | `logistics` | `finance` | `custom`

---

## 🎭 Use Case 1: E-Commerce Content Bot (7/24 Autonomous)

```
Flow:
ContentCreator agent (scheduled)
  → web_search: find trending topics
  → LLM: generate Thai caption
  → QA agent: review content quality
    → [PASS] → webhook → n8n → post to Facebook/TikTok/Line
    → [FAIL] → feedback loop → ContentCreator revises

Analytics agent (daily)
  → fetch Shopee/Lazada sales data via webhook
  → LLM: analyze performance
  → report to Manager agent
  → Manager agent: update strategy prompt for ContentCreator
```

**Lazy Agent Detection & HR Flow**:
```
Track per agent daily:
- tasks_completed / tasks_assigned
- quality_score (QA pass rate)
- response_time_avg

If productivity_score < threshold for N consecutive days:
  → HR agent flags agent → generates performance report
  → SGM receives approval modal:
    "⚠️ น้องมาร์ค ประสิทธิภาพต่ำกว่ามาตรฐาน 3 วันติดต่อกัน
     อนุมัติการเลิกจ้างและจ้าง Agent ใหม่? [✅ อนุมัติ] [❌ ปฏิเสธ] [📋 ดูรายงาน]"
  → On approval: archive agent state → spawn new agent with fresh persona
```

---

## 🧠 Use Case 2: Self-Learning Agents with Boss Commands

**Memory Architecture**:
```
Agent Memory Layers:
├── L1: In-context (current session)
├── L2: SQLite long-term (facts, preferences, past decisions)
└── L3: RAG collection (ChromaDB) — searchable knowledge base per agent
```

**Boss Command → Skill Learning Flow**:
```
1. Boss/GM sends: "น้องมาร์ค เรียนวิธีวิเคราะห์ข้อมูล Shopee"
2. System creates LearningTask → agent reads docs/URLs via web_search tool
3. Agent summarizes → stores in L3 RAG collection "shopee_analytics"
4. New skill registered: analyze_shopee_data() as callable tool in DB
5. Agent uses this skill autonomously in future scheduled tasks
```

**Skill Registry Schema**:
```typescript
interface AgentSkill {
  skillId: string
  name: string
  agentId: string
  toolDefinition: LLMToolDefinition  // function calling format
  learnedAt: Date
  sourceDocuments: string[]          // RAG source references
  usageCount: number
}
```

---

## 🏙️ Empire Architecture

```
EmpireMap (top-level view)
├── 🏬 Company A: ร้านขายดี Shop      [ecommerce]  8 agents  ● ACTIVE
├── 🎬 Company B: คอนเทนต์สตูดิโอ    [content]    5 agents  ● ACTIVE
├── 🚚 Company C: โลจิสติกส์เร็ว      [logistics]  6 agents  ⚠ 1 ALERT
└── [➕ Add Company]

Shared across all companies:
- SGM Approval Queue (single inbox for human decisions)
- Cross-company Knowledge Base (shared RAG namespace)
- Empire Analytics Dashboard
- Global Agent Pool (transfer agents between companies)

Isolation per company:
- Colyseus room namespace
- Agent memory (SQLite db per company)
- RAG collection prefix
- Webhook endpoints
```

---

## 🤖 Shadow PM Agent (Solo Developer Survival System)

Addresses the core problem: **1 person = PM + Dev + QA simultaneously**

```
Shadow PM monitors all activity and generates:

Daily (08:00):
  ✅ Standup brief: what's done, what's blocked, today's priorities
  ⚠️  Risk flags: tasks overdue, scope creep detected, deadline proximity

Real-time:
  📌 Context Capsule update: auto-summarize every work session into
     /project-brain/CONTEXT.md — so any AI (or future team member)
     can onboard instantly without re-explaining from scratch

Weekly:
  📊 Velocity report: tasks completed vs planned
  🔄 Retrospective suggestions: patterns in blockers
```

**Role Rotation Protocol** (minimize cognitive switching cost):
```
08:00-09:00  PM MODE   → Shadow PM prepares briefing; human reads + decides only
09:00-12:00  DEV MODE  → Copilot/Claude Code writes; human reviews + steers
13:00-14:00  QA MODE   → QA Agent runs tests first; human judges edge cases only
14:00-14:30  CLOSE     → Shadow PM auto-updates Context Capsule + tomorrow's plan
```

---

## 🔌 LLM Configuration

Route all requests through LiteLLM proxy:

```yaml
# litellm_config.yaml
model_list:
  - model_name: local/lm-studio
    litellm_params:
      model: openai/gemma-4b
      api_base: http://127.0.0.1:1234/v1
      api_key: lm-studio

  - model_name: openai/gpt-4o
    litellm_params:
      model: gpt-4o
      api_key: os.environ/OPENAI_API_KEY

  - model_name: anthropic/claude-sonnet
    litellm_params:
      model: claude-sonnet-4-5
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: google/gemini-pro
    litellm_params:
      model: gemini/gemini-1.5-pro
      api_key: os.environ/GEMINI_API_KEY

router_settings:
  fallbacks: [{"local/lm-studio": ["openai/gpt-4o"]}]
  context_window_fallbacks: [{"local/lm-studio": ["anthropic/claude-sonnet"]}]
```

---

## 📁 Monorepo Structure

```
packages/
├── core/
│   ├── agent-engine/      # think-loop, tool registry, skill system
│   ├── memory/            # SQLite L2 + ChromaDB L3 RAG
│   ├── scheduler/         # BullMQ 24/7 task queue
│   └── llm-client/        # LiteLLM wrapper + parseLLMResponse() utility
│
├── adapters/
│   ├── lm-studio/         # OpenAI-compatible local (existing)
│   ├── litellm/           # NEW: unified multi-LLM router
│   └── webhook/           # NEW: n8n/Make.com integration
│
├── server/
│   ├── rooms/
│   │   ├── OfficeRoom.ts  # existing — extend with company namespace
│   │   └── EmpireRoom.ts  # NEW: top-level empire state
│   ├── hr/                # NEW: productivity tracking, fire/hire logic
│   └── shadow-pm/         # NEW: standup, risk, context capsule
│
└── ui/
    ├── game/              # existing Phaser pixel art
    ├── store/             # NEW: Zustand state bridge
    ├── views/
    │   ├── EmpireMap/     # NEW
    │   ├── CompanyFloor/  # existing + extended
    │   ├── HRPanel/       # NEW
    │   ├── BossCommand/   # NEW
    │   └── ShadowPMDash/  # NEW
    └── components/        # shared React UI components
```

---

## 🗺️ Roadmap & Implementation Plan

### Phase 0: Foundation Fix (Week 1) — Before adding anything new
- [ ] Add Zustand state bridge between React and Phaser
- [ ] Implement `parseLLMResponse()` utility with 3-tier fallback
- [ ] Add LiteLLM adapter replacing hardcoded LM Studio URL
- [ ] Create `/project-brain/CONTEXT.md` — manually seed with current project knowledge
- [ ] Document agent JSON template schema

**Deliverable**: Stable base that won't crash on malformed LLM output

---

### Phase 1: Multi-Company Empire (Week 2-3)
- [ ] Company JSON template loader + validator
- [ ] Multi-namespace Colyseus rooms (one per company)
- [ ] `EmpireRoom` for top-level state management
- [ ] Empire Map UI (grid of company cards showing agent count + status)
- [ ] Company creation wizard (choose type → auto-generate department layout)

**Deliverable**: Can create 2+ companies, each with their own agents and floor

---

### Phase 2: 24/7 Autonomous Operation (Week 4-5)
- [ ] BullMQ scheduler — cron-based agent wake cycles
- [ ] Per-agent SQLite memory (L2)
- [ ] Productivity tracking (tasks_completed, quality_score, response_time)
- [ ] Lazy agent detection algorithm
- [ ] HR fire/hire flow with SGM approval modal
- [ ] Webhook output server → compatible with n8n

**Deliverable**: Agents run on schedule, HR system works, can connect to n8n

---

### Phase 3: Intelligence Layer (Week 6-8)
- [ ] RAG pipeline — ChromaDB per company/agent namespace
- [ ] Boss Command UI → `LearningTask` flow
- [ ] Skill registry (DB + runtime loading)
- [ ] Web search tool (real, via Tavily or SerpAPI — not simulated)
- [ ] Cross-company knowledge sharing (shared RAG namespace)

**Deliverable**: Agents can learn new skills on command, use real web search

---

### Phase 4: Shadow PM & Solo Dev Tooling (Week 9-10)
- [ ] Context Capsule auto-updater (summarize sessions → CONTEXT.md)
- [ ] Shadow PM agent with daily standup generator
- [ ] Risk flagging system (overdue tasks, deadline proximity)
- [ ] Role Rotation Protocol — time-blocked work modes with AI-prepared context
- [ ] Async QA Loop — auto-trigger test suite on push, report edge cases only

**Deliverable**: Full solo-dev survival system. Cognitive switching cost minimized.

---

### Phase 5: Polish & Empire Scale (Week 11-12)
- [ ] Multi-LLM per agent (different models for different task types)
- [ ] Agent transfer between companies
- [ ] Empire analytics dashboard (cross-company KPIs)
- [ ] Thai language polish — all system prompts, UI, agent personas
- [ ] Export/import company templates (share your company config)

**Deliverable**: Production-ready empire. Can share templates with others.

---

## ⚠️ Key Constraints & Non-Negotiables

| Constraint | Rule |
|---|---|
| **Local-first** | Must run fully offline with LM Studio. No forced cloud dependency. |
| **Cloud-optional** | Graceful degradation if API keys not set → fall back to local |
| **Thai language** | All UI + agent system prompts in Thai by default |
| **MIT license** | All additions must be MIT-compatible (fork of MIT project) |
| **1-person operable** | Every feature must reduce human work, not add to it |
| **No hallucination spiral** | parseLLMResponse() required on ALL LLM calls — no exceptions |
| **Zustand only** | No direct React↔Phaser state sharing — ever |

---

## 🚀 Quick Start for Copilot

> When working on this codebase, always:
> 1. Read `/project-brain/CONTEXT.md` first — it's the source of truth
> 2. Extend existing patterns from `packages/server/src/rooms/OfficeRoom.ts`
> 3. Use `parseLLMResponse()` for any new LLM call you add
> 4. Add Zustand actions for any state that Phaser needs to read
> 5. Test with local LM Studio first before assuming cloud models

---

*Generated from full conversation context including:*  
*devpanitan/Agent-office-thai analysis, pixel-agents-hq/pixel-agents analysis,*  
*4-part LEGO architecture breakdown, Use Case 1 (e-commerce 7/24), Use Case 2 (self-learning),*  
*Gemini's technical additions (Zustand bridge, LLM error hardening),*  
*Solo developer survival system (Shadow PM, Context Capsule, Role Rotation, Async QA)*

---

---

# 🖥️ PoC → Production Migration Plan

## สถานการณ์
- **ตอนนี้**: พัฒนาบน Notebook (PoC)
- **สัปดาห์หน้า**: มี AI Server เครื่องจริงมาถึง
- **เป้าหมาย**: ย้ายได้โดยไม่ต้องเขียนโค้ดใหม่

---

## 🏗️ Design Principle: "Environment-Agnostic from Day 1"

กฎเหล็กที่ต้องทำตั้งแต่วันแรกบน Notebook:

> **อย่า hardcode URL, path, หรือ resource ใดๆ ลงในโค้ดโดยตรง**  
> ทุกอย่างต้องอ่านจาก environment variable หรือ config file เท่านั้น

ถ้าทำตามกฎนี้ตั้งแต่ต้น การย้ายไป server = แค่เปลี่ยน `.env` ไฟล์เดียว

---

## 📁 Config Structure (ใช้ตั้งแต่วัน 1)

```
project-root/
├── .env.notebook          ← ใช้บน Notebook PoC
├── .env.server            ← ใช้บน AI Server จริง
├── .env.example           ← template สำหรับ commit ลง git
└── docker-compose.yml     ← รันได้ทั้ง 2 environment
```

### `.env.notebook` (PoC บน Notebook)
```env
# === LLM ===
LLM_BASE_URL=http://127.0.0.1:1234/v1        # LM Studio local
LLM_DEFAULT_MODEL=local/gemma-4b
LLM_FALLBACK_MODEL=openai/gpt-4o

# === Services ===
REDIS_URL=redis://localhost:6379              # BullMQ scheduler
CHROMA_URL=http://localhost:8000             # RAG vector DB
DB_PATH=./data/empire.sqlite                 # SQLite

# === App ===
SERVER_PORT=3000
UI_PORT=5173
NODE_ENV=development
RESOURCE_MODE=notebook                        # 👈 key flag
```

### `.env.server` (AI Server เครื่องจริง)
```env
# === LLM ===
LLM_BASE_URL=http://localhost:11434/v1        # Ollama on server
LLM_DEFAULT_MODEL=local/llama3-70b           # โมเดลใหญ่ขึ้นได้
LLM_FALLBACK_MODEL=anthropic/claude-sonnet

# === Services ===
REDIS_URL=redis://localhost:6379
CHROMA_URL=http://localhost:8000
DB_PATH=/data/empire/empire.sqlite            # persistent volume

# === App ===
SERVER_PORT=3000
UI_PORT=5173
NODE_ENV=production
RESOURCE_MODE=server                          # 👈 key flag
```

---

## 🐳 Docker Strategy: รันได้ทั้ง 2 เครื่องโดยไม่แก้โค้ด

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    env_file: .env                            # ← เปลี่ยนแค่ไฟล์นี้
    ports:
      - "${SERVER_PORT}:3000"
    volumes:
      - ${DB_PATH}:/data/empire.sqlite
    depends_on:
      - redis
      - chroma

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  chroma:
    image: chromadb/chroma:latest
    ports: ["8000:8000"]
    volumes:
      - chroma_data:/chroma/chroma

volumes:
  chroma_data:
```

**วิธีใช้**:
```bash
# Notebook PoC
cp .env.notebook .env && docker-compose up

# AI Server จริง
cp .env.server .env && docker-compose up
```

---

## 📋 PoC Checklist (สิ่งที่ต้องทำบน Notebook ก่อน server มาถึง)

### ✅ Week นี้ (PoC บน Notebook)
- [ ] **Day 1-2**: Phase 0 — Zustand bridge + parseLLMResponse() + LiteLLM adapter
- [ ] **Day 3-4**: Phase 1 MVP — company template loader + 2 companies ทดสอบได้
- [ ] **Day 5**: Docker setup + ทดสอบรันด้วย docker-compose ให้ได้ก่อน
- [ ] **Day 6-7**: Phase 2 เริ่มต้น — BullMQ scheduler + 1 agent รันอัตโนมัติได้

### 🎯 PoC Success Criteria (ก่อน server มาถึง)
```
✅ รัน 2 companies พร้อมกันได้
✅ Agent 1 ตัวทำงาน 24/7 บน schedule ได้
✅ HR flow: detect lazy agent → SGM approval modal ทำงานได้
✅ docker-compose up แล้วได้ระบบเต็มโดยไม่ต้องตั้งค่าอะไรเพิ่ม
✅ .env.notebook ↔ .env.server สลับได้โดยไม่แก้โค้ด
```

---

## 🖥️ AI Server Setup Plan (สัปดาห์หน้า)

### เมื่อ Server มาถึง — ทำตามลำดับนี้

```
Day 1 (Server Prep):
  1. ติดตั้ง Docker + Docker Compose
  2. ติดตั้ง Ollama → pull models ที่ต้องการ
     ollama pull llama3:70b
     ollama pull nomic-embed-text      ← สำหรับ RAG embeddings
  3. copy .env.server → .env
  4. docker-compose up → ระบบควรรันได้ทันที

Day 2 (Migration Validation):
  1. Export data จาก Notebook:
     sqlite3 ./data/empire.sqlite .dump > backup.sql
  2. Import บน Server:
     sqlite3 /data/empire/empire.sqlite < backup.sql
  3. Copy ChromaDB volume (ถ้ามี RAG data แล้ว)
  4. ทดสอบ: agents ที่สร้างบน Notebook ควรยังอยู่ครบบน Server

Day 3 (Performance Tuning):
  1. ปรับ model ใน .env.server ให้ใช้ model ใหญ่ขึ้น
  2. ปรับ thinkCooldownMs ใน OfficeRoom.ts ให้เร็วขึ้น
     (server มี RAM/GPU มากกว่า notebook)
  3. เปิด concurrent requests มากขึ้นใน LiteLLM config
```

### Resource Scaling Config
```typescript
// packages/server/src/config/resource.ts
const RESOURCE_PROFILES = {
  notebook: {
    maxConcurrentThinks: 2,        // จำกัด เพราะ RAM น้อย
    thinkCooldownMs: 5000,         // ช้าลง ประหยัด resource
    maxAgentsPerCompany: 5,
    llmModel: 'local/gemma-4b',    // โมเดลเล็ก
  },
  server: {
    maxConcurrentThinks: 10,       // server แรงกว่า
    thinkCooldownMs: 1000,         // เร็วขึ้น
    maxAgentsPerCompany: 20,
    llmModel: 'local/llama3-70b',  // โมเดลใหญ่ขึ้น
  }
}

export const config = RESOURCE_PROFILES[process.env.RESOURCE_MODE || 'notebook']
```

---

## 🗺️ Roadmap ฉบับปรับปรุง (พร้อม Timeline จริง)

```
📅 สัปดาห์นี้ (Notebook PoC)
├── Day 1-2  → Phase 0: Foundation fix
├── Day 3-4  → Phase 1: Multi-company MVP
├── Day 5    → Docker packaging + migration test
└── Day 6-7  → Phase 2: First autonomous agent

📅 สัปดาห์หน้า (AI Server มาถึง)
├── Day 1    → Server prep + Ollama setup
├── Day 2    → Data migration Notebook → Server
├── Day 3    → Performance tuning + scale up
└── Day 4-7  → Phase 2 ต่อ: Full HR system + n8n webhook

📅 สัปดาห์ที่ 3-4
└── Phase 3: RAG + Self-learning agents

📅 สัปดาห์ที่ 5-6
└── Phase 4: Shadow PM + Solo dev survival tools

📅 สัปดาห์ที่ 7+
└── Phase 5: Polish + Cartoon UI layer
```

---

---

# 🎨 Cartoon Explainer Layer
> ทำให้ทุกคนเข้าใจได้ ไม่ว่าจะเป็นสายเทคหรือไม่

## แนวคิด: "สองโลกในระบบเดียว"

ระบบมี **2 โหมดการมองเห็น** ที่สลับได้ตลอดเวลา:

```
[🎮 Cartoon Mode]  ←→  [📊 Technical Mode]
สำหรับทุกคน           สำหรับ Dev/Admin
```

---

## 🎭 Cartoon Character Map

แทนที่จะเห็น "Agent ID: agent-mkt-01" ให้เห็น:

| Technical | Cartoon Version |
|---|---|
| ContentCreator Agent | 🎨 **น้องมาร์ค** — ศิลปินหนุ่มถือพู่กัน วิ่งระหว่างโต๊ะ |
| QA Agent | 🔍 **พี่ตรวจ** — นักสืบถือแว่นขยาย ส่ายหัวเวลาเจอ bug |
| HR Agent | 👔 **คุณ HR** — สวมสูท ถือ clipboard ยืนหน้าห้อง |
| Analytics Agent | 📊 **หมอตัวเลข** — แว่นหนา นั่งหน้าจอเต็ม dashboard |
| Shadow PM | 🧠 **เสนาธิการ** — ยืนหน้ากระดานดำ วางแผนตลอด |
| Manager Agent | 👑 **ผู้จัดการ** — นั่งหัวโต๊ะ รับ report จากทุกคน |

---

## 💬 Cartoon Speech Bubbles (แทน Log Messages)

แทนที่จะ log ว่า `[agent-mkt-01] Executing tool: web_search(query="trending TikTok")`

ให้แสดงเป็น:

```
🎨 น้องมาร์ค:  💭 "กำลังหาเทรนด์ TikTok วันนี้..."
               [animation: เดินไปที่โต๊ะค้นข้อมูล]

🎨 น้องมาร์ค:  💬 "เจอแล้ว! กระแส #คาเฟ่สไตล์ญี่ปุ่น มาแรงมาก"
               [animation: วิ่งกลับโต๊ะ เริ่มพิมพ์]

🎨 น้องมาร์ค:  📝 "เขียน caption เสร็จแล้ว ส่งให้พี่ตรวจดูนะ"
               [animation: เดินไปหา QA agent]

🔍 พี่ตรวจ:    🧐 "อืม... caption ดี แต่ hashtag น้อยไป แก้หน่อยนะ"
               [animation: ส่ายหัว ชี้กระดาษ]
```

---

## 🚨 HR Drama Mode (ทำให้สนุก ไม่น่ากลัว)

เมื่อ Lazy Agent Detection ทำงาน:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  เหตุการณ์พิเศษในออฟฟิศ!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👔 คุณ HR เดินเข้ามาในห้อง Marketing

👔 คุณ HR:  "น้องมาร์ค... เราต้องคุยกัน"
            [animation: เดินตรงไปหา ContentCreator]

🎨 น้องมาร์ค: 😰 "อ๊ะ... มีอะไรครับพี่?"

👔 คุณ HR:  "3 วันที่ผ่านมา งานไม่ถึงเป้าเลยนะ"
            [แสดง chart ประสิทธิภาพ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 รายงานถึง CEO (คุณ!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
น้องมาร์คทำงานต่ำกว่ามาตรฐาน 3 วันติดกัน

[✅ อนุมัติให้เลิกจ้าง]  [❌ ให้โอกาสอีกครั้ง]  [📋 ดูรายละเอียด]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎓 Skill Learning Animation

เมื่อ Boss สั่งให้ agent เรียนทักษะใหม่:

```
👑 ผู้จัดการ → 🎨 น้องมาร์ค:
"ไปเรียนวิธีวิเคราะห์ข้อมูล Shopee มาด้วยนะ"

[animation: น้องมาร์คเดินไปห้องสมุด]

📚 น้องมาร์ค กำลังอ่านเอกสาร...  ████████░░ 80%

[animation: หนังสือลอยเข้าหัว ✨]

🎨 น้องมาร์ค: "เรียนจบแล้ว! ตอนนี้วิเคราะห์ Shopee เป็นแล้วครับ 🎉"

[+SKILL] analyze_shopee_data ปลดล็อคแล้ว!
```

---

## 🗺️ Cartoon Empire Map

```
🌆 AGENT EMPIRE — แผนที่บริษัทของคุณ

┌─────────────────┐  ┌─────────────────┐
│  🏬 ร้านขายดี   │  │  🎬 สตูดิโอ      │
│  Shop           │  │  คอนเทนต์        │
│  ● 8 agents     │  │  ● 5 agents      │
│  ✅ ปกติ        │  │  ✅ ปกติ         │
└─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│  🚚 โลจิสติกส์  │  │  ➕              │
│  เร็ว           │  │  เพิ่มบริษัท     │
│  ● 6 agents     │  │  ใหม่           │
│  ⚠️ 1 แจ้งเตือน │  │                 │
└─────────────────┘  └─────────────────┘

📬 กล่องข้อความ CEO: [3 เรื่องรอการอนุมัติ]
```

---

## 🎨 Technical Implementation ของ Cartoon Layer

```typescript
// packages/ui/src/cartoon/CartoonEventMapper.ts

interface CartoonEvent {
  character: string        // "น้องมาร์ค"
  emotion: Emotion         // happy | thinking | worried | excited
  message: string          // Thai language message
  animation: AnimationType // walk | sit | type | read | celebrate
  targetDesk?: string      // เดินไปที่โต๊ะไหน
}

// Map technical events → cartoon events
const eventMap: Record<string, CartoonEventMapper> = {
  'tool:web_search':     (e) => ({ character: e.agentName, emotion: 'thinking',
                                   message: `กำลังหา "${e.query}"...`, animation: 'walk' }),
  'tool:write_content':  (e) => ({ character: e.agentName, emotion: 'happy',
                                   message: 'กำลังเขียน content...', animation: 'type' }),
  'hr:flag_lazy':        (e) => ({ character: 'คุณ HR', emotion: 'serious',
                                   message: `${e.agentName}... เราต้องคุยกัน`, animation: 'walk' }),
  'skill:learned':       (e) => ({ character: e.agentName, emotion: 'excited',
                                   message: `เรียนจบแล้ว! ✨`, animation: 'celebrate' }),
}

// Toggle mode
const [mode, setMode] = useState<'cartoon' | 'technical'>('cartoon')
```

---

## 📱 Cartoon Mode ใน UI

**Toggle button** มุมขวาบนเสมอ:
```
[🎮 Cartoon Mode]  ←  ทุกคนเข้าใจได้
[📊 Technical Mode] ← สำหรับ Dev/Admin
```

**Cartoon Mode แสดง**:
- ชื่อตัวละครภาษาไทย
- speech bubble แทน log
- emotion animation
- HR drama scene
- skill level bar ✨

**Technical Mode แสดง**:
- Agent ID + model name
- raw log stream
- performance metrics
- API latency
- token usage

---

*Updated: เพิ่ม PoC → Server Migration Plan + Cartoon Explainer Layer*  
*Version: 1.1*
