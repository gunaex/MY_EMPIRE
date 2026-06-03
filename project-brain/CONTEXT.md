# 🧠 AgentEmpire — Project Brain / Context Capsule

> **อ่านไฟล์นี้ก่อนทำงานทุกครั้ง** — นี่คือ source of truth ของโปรเจคต์

---

## 📌 สถานะปัจจุบัน (อัพเดต: 2026-06-03)

**Phase**: Phase 1 — Multi-Company Live Wiring  
**Environment**: Notebook PoC (AI Server ยังไม่มาถึง)  
**LLM**: LM Studio local @ `http://127.0.0.1:1234`

### Session Update — 2026-06-03

- Added validated server-side company template loader.
- EmpireRoom now preloads `content-001` and `ecom-001`.
- Added requestable `empire_snapshot` and `office_snapshot` messages because JS client schema maps currently arrive empty.
- UI now connects to Colyseus via `src/net/empireClient.ts` and writes only to Zustand.
- Added CompanyFloorView, live HR decision sends, and boss/learn command sends.
- Verified server/UI builds and local snapshots on temporary port `3010`.

---

## 🏗️ Architecture Overview

```
packages/
├── core/
│   ├── agent-engine/   # think-loop, tool registry, skill system
│   ├── memory/         # SQLite (L2) + ChromaDB (L3 RAG)
│   ├── scheduler/      # BullMQ cron-based agent scheduling
│   └── llm-client/     # LiteLLM wrapper + parseLLMResponse()
│
├── adapters/
│   ├── lm-studio/      # OpenAI-compatible local
│   ├── litellm/        # unified multi-LLM router
│   └── webhook/        # n8n/Make.com integration
│
├── server/
│   ├── rooms/          # Colyseus rooms (OfficeRoom, EmpireRoom)
│   ├── hr/             # productivity tracking, fire/hire
│   └── shadow-pm/      # daily standup, risk flagging, context capsule
│
└── ui/
    ├── game/           # Phaser pixel art engine
    ├── store/          # Zustand state bridge (NEVER bypass this)
    ├── views/          # EmpireMap, CompanyFloor, HRPanel, BossCommand, ShadowPMDash
    └── components/     # shared React components
```

---

## ⚠️ Non-Negotiable Rules (อย่าลืมเด็ดขาด)

1. **`parseLLMResponse()`** — ต้องใช้กับทุก LLM call ไม่มีข้อยกเว้น
2. **Zustand only** — ห้าม share state โดยตรงระหว่าง React ↔ Phaser เด็ดขาด
3. **No hardcode** — URL/path/secret ต้องอ่านจาก env เท่านั้น
4. **Thai-first** — UI และ agent system prompt เป็นภาษาไทยเป็นหลัก
5. **Local-first** — ต้องรันได้ offline ด้วย LM Studio ก่อนเสมอ

---

## 🔧 Key Patterns

### LLM Call Pattern
```typescript
import { parseLLMResponse } from '@empire/llm-client'

const result = await parseLLMResponse<MyResponseType>(rawLLMOutput)
if (result.ok) {
  // use result.value
} else {
  // handle result.error — never throw uncaught
}
```

### State Bridge Pattern
```typescript
import { useEmpireStore } from '@empire/ui/store'

// React → Phaser: update store, Phaser subscribes
useEmpireStore.getState().updateAgent(agentId, updates)

// Phaser reads:
const unsubscribe = useEmpireStore.subscribe(
  (state) => state.agents,
  (agents) => phaserScene.syncAgents(agents)
)
```

---

## 📦 Company Template Format
```json
{
  "companyId": "ecom-001",
  "name": "ร้านขายดี Shop",
  "type": "ecommerce",
  "departments": ["Marketing", "Sales", "CustomerSupport", "Operations", "QA"],
  "agents": [...]
}
```

---

## 🗺️ Roadmap สั้น (PoC สัปดาห์นี้)

- [x] Phase 0: Foundation (Zustand + parseLLMResponse + LiteLLM adapter)
- [x] Phase 1: Multi-company template loader + EmpireRoom snapshot
- [ ] Phase 1: Full live UI workflow + company creation validation
- [ ] Phase 2: BullMQ scheduler + HR fire/hire flow
- [ ] Docker packaging + .env swap test

---

## 📁 ไฟล์สำคัญ

| ไฟล์ | หน้าที่ |
|---|---|
| `packages/core/llm-client/src/parseLLMResponse.ts` | LLM output hardening |
| `packages/ui/store/empireStore.ts` | Zustand state bridge |
| `packages/server/rooms/EmpireRoom.ts` | top-level empire state |
| `packages/server/rooms/OfficeRoom.ts` | per-company office |
| `.env.notebook` / `.env.server` | environment config |
| `litellm_config.yaml` | LLM routing config |

---

*Context Capsule auto-updated by Shadow PM agent*  
*อัพเดตด้วยตนเองทุกสิ้นวัน หรือหลัง work session สำคัญ*
