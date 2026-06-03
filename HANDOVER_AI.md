# AgentEmpire AI Handover

Last updated: 2026-06-03
Project root: /home/kanphong/Documents/MY_EMPIRE

## 1) Mission Snapshot
Build a pixel-art multi-agent office empire where one human (SGM) supervises multiple autonomous AI agents across multiple companies.

## 2) Current Phase Progress

| Phase | Progress | Status | Notes |
|---|---:|---|---|
| Phase 0 Foundation Fix | 90% | In progress | Core scaffolding done, runtime mostly stable |
| Phase 1 Multi-Company Empire | 45% | In progress | Empire and Office room skeletons exist |
| Phase 2 Autonomous 24/7 | 25% | Started | Scheduler + HR schema/skeleton implemented |
| Phase 3 Intelligence Layer | 15% | Started | SQLite + Chroma abstractions prepared |
| Phase 4 Shadow PM | 20% | Started | Shadow PM class and UI skeleton added |
| Phase 5 Polish & Scale | 5% | Not started | Production polish and scaling pending |

Overall estimated completion: 33%

## 3) What Is Already Implemented

- Monorepo workspace scaffold with npm workspaces
- Core packages:
  - core/llm-client: parseLLMResponse + LLMClient wrapper
  - core/memory: SQLite memory + Chroma RAG wrapper
  - core/scheduler: BullMQ scheduler skeleton
  - core/agent-engine: Agent think loop and skill-learning skeleton
- Server:
  - Colyseus rooms: EmpireRoom and OfficeRoom
  - Express endpoints: /, /health, /agent/action, /colyseus (dev)
  - Root route returns JSON status (fix for Cannot GET /)
- UI:
  - Zustand store bridge (React owns state; Phaser subscribes)
  - Views: EmpireMap, HRPanel, BossCommandPanel, ShadowPMDashboard
- Environment and deployment:
  - .env.notebook, .env.server, .env.example
  - docker-compose.yml
  - litellm_config.yaml

## 4) Critical Rules (Do Not Break)

1. parseLLMResponse must wrap every LLM response path.
2. No direct mutable state sharing between React and Phaser.
3. No hardcoded URL/path/secrets in runtime logic.
4. Thai-first for UI and agent prompts.
5. Local-first operation must work without cloud keys.

## 5) Key Files To Read First

- README.md
- project-brain/CONTEXT.md
- packages/core/llm-client/src/parseLLMResponse.ts
- packages/ui/src/store/empireStore.ts
- packages/server/src/rooms/EmpireRoom.ts
- packages/server/src/rooms/OfficeRoom.ts
- packages/server/src/index.ts

## 6) Runbook (Local)

1. Prepare env:

```bash
cp .env.notebook .env
```

2. Install deps:

```bash
npm install
```

3. Start Redis + Chroma:

```bash
docker-compose up redis chroma -d
```

4. Start app:

```bash
npm run dev
```

Expected:
- UI at http://localhost:5173 (or next free port)
- Server at http://localhost:3000
- Root API status at http://localhost:3000/
- Colyseus monitor at http://localhost:3000/colyseus

## 7) Known Runtime Notes

- If server says EADDRINUSE on port 3000:

```bash
fuser -k 3000/tcp
```

- If Vite ports are occupied:

```bash
fuser -k 5173/tcp 5174/tcp 5175/tcp 5176/tcp
```

- Colyseus and some transitive libs print deprecation warnings; these are non-blocking for current dev flow.

## 8) Immediate Next Actions

### Next 24 hours

1. Stabilize dev command behavior and avoid accidental exit code noise from piped commands.
2. Connect UI views to live Colyseus events/state instead of placeholders.
3. Finish company creation loader + validator + room registration flow.
4. Execute one end-to-end scheduled agent task and surface result in UI.

### Next 7 days

1. Complete Phase 1 (multi-company functional MVP).
2. Complete Phase 2 MVP (BullMQ cycles + lazy detection + HR approval path).
3. Add integration tests for server boot, room create/join, and scheduler tick.
4. Add one real learning task flow in Phase 3 (register skill + reuse).

## 9) Handover Checklist For Next AI

- Confirm services start cleanly via npm run dev.
- Verify GET / returns JSON status.
- Verify at least one company template loads and appears in Empire view.
- Verify one agent think cycle runs and updates state.
- Keep updates synced in project-brain/CONTEXT.md after major work sessions.

## 10) Open Risks

- Current UI flow contains placeholder interactions that are not fully wired to backend events.
- Scheduler and HR logic are scaffold-level; production behavior not validated yet.
- No robust test harness yet for multi-room and autonomous loops.
