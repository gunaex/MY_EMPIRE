# AgentEmpire Docker Deployment

This is the recommended path for moving from notebook PoC to the new AI server.

## Recommendation

Use Docker Compose first.

Docker Compose is best for the current stage because it is simple, portable, and easy to move between machines. It gives AgentEmpire one reproducible stack: server, UI, Redis, Chroma, and persistent data.

If by "obstack" you mean OpenStack, use it later only when you need multi-server infrastructure, VM orchestration, or a private cloud. For one AI server on a local network, OpenStack adds a lot of operations work without helping the product much yet.

## AI Server Install Flow

On the AI server:

```bash
git clone https://github.com/gunaex/MY_EMPIRE.git
cd MY_EMPIRE
cp .env.server .env
docker compose up -d --build
```

If the server has old Docker Compose:

```bash
docker-compose up -d --build
```

Check services:

```bash
docker compose ps
docker compose logs -f app
```

## Automatic Start

The Compose services use:

```yaml
restart: unless-stopped
```

After the stack is created once, containers restart automatically after the AI server reboots, as long as Docker itself starts on boot.

Enable Docker on boot:

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

## Local Network Access

From another device on the same LAN:

- UI: `http://<AI_SERVER_LAN_IP>:5173`
- API and Colyseus: `http://<AI_SERVER_LAN_IP>:3000`

Redis and Chroma are bound to `127.0.0.1` in Compose, so they are not exposed to your LAN.

## LLM Access

`.env.server` assumes Ollama or another OpenAI-compatible local LLM endpoint is running on the AI server host:

```bash
LLM_BASE_URL=http://host.docker.internal:11434/v1
```

The Compose file maps `host.docker.internal` to the Linux Docker host with:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

If you later run Ollama inside Compose too, change `LLM_BASE_URL` to the Ollama service name.

## Internet Access Later

Do not expose ports `3000` and `5173` directly to the internet without protection.

Recommended path:

1. Local network first.
2. Add a private VPN overlay such as Tailscale for remote admin access.
3. Add HTTPS and authentication before public internet exposure.
4. Put the UI/API behind a reverse proxy such as Caddy, Traefik, or Nginx Proxy Manager.
5. Keep webhook routes protected with `WEBHOOK_SECRET`.

For monitoring and command from outside the house/office, Tailscale is the fastest safe bridge. Public HTTPS can come after login/auth is implemented.

## Update Flow

After pushing new code to GitHub:

```bash
git pull
docker compose up -d --build
docker compose logs -f app
```

Rollback:

```bash
git log --oneline
git checkout <previous_commit>
docker compose up -d --build
```
