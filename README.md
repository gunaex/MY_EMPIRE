# 🏙️ AgentEmpire

> Pixel-art multi-agent office empire — 1 คน ทำงานเทียบเท่า 10 คน

## Quick Start

```bash
# 1. ตั้ง environment
cp .env.notebook .env

# 2. ติดตั้ง dependencies
npm install

# 3. รัน services (Redis + ChromaDB)
docker-compose up redis chroma -d

# 4. รัน server + UI
npm run dev
```

หรือรันทั้งหมดด้วย Docker:
```bash
cp .env.notebook .env
docker compose up -d --build
```

If your server uses the legacy Compose binary, replace `docker compose` with `docker-compose`.

AI Server deployment:

```bash
cp .env.server .env
docker compose up -d --build
docker compose ps
```

Local network access:

- UI: `http://<AI_SERVER_LAN_IP>:5173`
- API / Colyseus: `http://<AI_SERVER_LAN_IP>:3000`

Docker containers use `restart: unless-stopped`, so after the server reboots they start again automatically once Docker starts.

## 📁 Structure

```
packages/
├── core/
│   ├── agent-engine/    # Agent think-loop, skill system
│   ├── memory/          # SQLite L2 + ChromaDB L3 RAG
│   ├── scheduler/       # BullMQ 24/7 scheduler
│   └── llm-client/      # LiteLLM wrapper + parseLLMResponse()
├── adapters/
│   ├── webhook/         # n8n / Make.com integration
│   └── litellm/         # Multi-LLM router
├── server/              # Colyseus + Express backend
└── ui/                  # React + Phaser + Zustand frontend
```

## 🗺️ Roadmap

| Phase | สถานะ | รายละเอียด |
|---|---|---|
| Phase 0 | ✅ | Foundation: parseLLMResponse, Zustand bridge, LiteLLM |
| Phase 1 | 🔄 | Multi-company empire, EmpireRoom |
| Phase 2 | ⏳ | 24/7 scheduler, HR system, Webhooks |
| Phase 3 | ⏳ | RAG + Self-learning agents |
| Phase 4 | ⏳ | Shadow PM + Solo dev survival |
| Phase 5 | ⏳ | Polish + Cartoon UI |

## ⚙️ Config

- **Notebook PoC**: `.env.notebook` (LM Studio @ 127.0.0.1:1234)
- **AI Server**: `.env.server` (Ollama + bigger models)

สลับ environment = เปลี่ยนแค่ `.env` ไฟล์เดียว ไม่ต้องแก้โค้ด

## 📖 Docs

- [Project Brain / Context Capsule](./project-brain/CONTEXT.md)
- [LiteLLM Config](./litellm_config.yaml)
- [Company Templates](./packages/server/src/templates/)

## License

MIT
