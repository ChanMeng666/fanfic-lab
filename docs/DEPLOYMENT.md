# Deployment Guide

How to deploy FanFic Lab (HSR DreamWriter) to production. This guide is written for Claude Code to follow after making code changes.

## Architecture Overview

```
Developer (git push)
    |
    v
GitHub Actions (.github/workflows/deploy.yml)
    |-- Build Agent Docker image (Dockerfile.agent)
    |-- Build Web Docker image (Dockerfile.web)
    |-- Push both to GitHub Container Registry (GHCR)
    |-- SSH into VPS
    |-- Pull new images
    |-- Stop old containers
    |-- Start new containers
    |
    v
DigitalOcean VPS (159.223.173.17)
    |-- coolify-proxy (Traefik) -- reverse proxy, SSL via Cloudflare
    |-- agent-dreamwriter       -- LangGraph agent on port 8123
    |-- web-dreamwriter         -- Next.js app on port 3000
    |
    v
Cloudflare (CDN/SSL) --> https://fanfic-lab.tech
```

## Standard Deployment (Automatic)

**Every `git push origin master` triggers automatic deployment via GitHub Actions.**

```bash
# After making changes, just push:
git push origin master
```

The workflow (`.github/workflows/deploy.yml`) will:
1. Build Agent image (~1 min) and Web image (~3 min) on GitHub's servers
2. Push images to `ghcr.io/chanmeng666/fanfic-lab/{web,agent}`
3. SSH into the VPS and pull the new images
4. Stop old containers, start new ones
5. Total time: ~5 minutes

### Monitoring the Build

```bash
# Watch the latest GitHub Actions run
gh run list --limit 1
gh run watch <run-id> --exit-status

# Check logs if it fails
gh run view <run-id> --log-failed
```

### Verifying Deployment

```bash
# Check production site
curl -s -o /dev/null -w "HTTP:%{http_code}" https://fanfic-lab.tech

# Check containers on VPS
ssh -i ~/.ssh/id_ed25519 root@159.223.173.17 "docker ps --format '{{.Names}} | {{.Status}}'"

# Check container logs
ssh -i ~/.ssh/id_ed25519 root@159.223.173.17 "docker logs web-dreamwriter --tail 20"
ssh -i ~/.ssh/id_ed25519 root@159.223.173.17 "docker logs agent-dreamwriter --tail 20"

# Check memory usage
ssh -i ~/.ssh/id_ed25519 root@159.223.173.17 "free -h"
```

## Manual Deployment (Emergency)

If GitHub Actions fails or you need to deploy manually:

```bash
# 1. SSH into the VPS
ssh -i ~/.ssh/id_ed25519 root@159.223.173.17

# 2. Pull the latest images
docker pull ghcr.io/chanmeng666/fanfic-lab/agent:latest
docker pull ghcr.io/chanmeng666/fanfic-lab/web:latest

# 3. Stop old containers
docker stop agent-dreamwriter web-dreamwriter
docker rm agent-dreamwriter web-dreamwriter

# 4. Start agent (must start before web)
docker run -d \
  --name agent-dreamwriter \
  --network coolify \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e PORT=8123 \
  -e OPENAI_API_KEY="<key>" \
  -e DATABASE_URL="<url>" \
  ghcr.io/chanmeng666/fanfic-lab/agent:latest

# 5. Wait for agent to be ready (~30s)
# Check: docker exec agent-dreamwriter node -e "fetch('http://localhost:8123/info').then(r=>console.log(r.status))"

# 6. Start web
docker run -d \
  --name web-dreamwriter \
  --network coolify \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e LANGGRAPH_URL=http://agent-dreamwriter:8123 \
  -e DATABASE_URL="<url>" \
  -e REDIS_URL="<url>" \
  -e OPENAI_API_KEY="<key>" \
  -e STACK_SECRET_SERVER_KEY="<key>" \
  -e NEXT_PUBLIC_STACK_PROJECT_ID="<id>" \
  -e NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY="<key>" \
  -e CLOUDINARY_CLOUD_NAME="<name>" \
  -e CLOUDINARY_API_KEY="<key>" \
  -e CLOUDINARY_API_SECRET="<secret>" \
  -e ADMIN_SECRET="<secret>" \
  ghcr.io/chanmeng666/fanfic-lab/web:latest
```

## Environment Variables & Secrets

All secrets are stored in **GitHub Repository Secrets** (Settings > Secrets and variables > Actions).

| Secret | Used By | Purpose |
|--------|---------|---------|
| `VPS_HOST` | Deploy job | VPS IP address (159.223.173.17) |
| `VPS_SSH_KEY` | Deploy job | SSH private key for root access |
| `OPENAI_API_KEY` | Agent + Web | GPT-4o API calls |
| `DATABASE_URL` | Web | Neon PostgreSQL connection |
| `REDIS_URL` | Web | Upstash Redis connection |
| `STACK_SECRET_SERVER_KEY` | Web | Stack Auth server key |
| `NEXT_PUBLIC_STACK_PROJECT_ID` | Web | Stack Auth project ID |
| `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` | Web | Stack Auth client key |
| `CLOUDINARY_CLOUD_NAME` | Web | Image storage |
| `CLOUDINARY_API_KEY` | Web | Image storage |
| `CLOUDINARY_API_SECRET` | Web | Image storage |
| `LANGSMITH_API_KEY` | Agent | LangSmith tracing (optional) |
| `TAVILY_API_KEY` | Agent | Web search (optional) |
| `ADMIN_SECRET` | Web | Admin endpoints |

### Updating a Secret

```bash
# From the project directory:
gh secret set SECRET_NAME --body "new-value"

# Example: rotate OpenAI key
gh secret set OPENAI_API_KEY --body "sk-proj-..."
```

After updating a secret, push a commit (even empty) to trigger redeployment:
```bash
git commit --allow-empty -m "chore: trigger redeploy" && git push origin master
```

## Traefik Routing

Traefik runs as `coolify-proxy` and routes traffic based on a static config file:

```
/data/coolify/proxy/dynamic/redirect.yaml
```

This file maps `fanfic-lab.tech` and `www.fanfic-lab.tech` to the `web-dreamwriter` container on port 3000. **Do not modify this file unless the container name changes.**

The web container also has Traefik labels as a fallback, but the static config file takes priority due to higher priority value.

## VPS Resource Management

The VPS is a DigitalOcean s-2vcpu-2gb droplet ($12/mo). Memory is tight.

### What's Running (3 containers only)

| Container | Purpose | ~RAM |
|-----------|---------|------|
| `coolify-proxy` | Traefik reverse proxy | ~50MB |
| `agent-dreamwriter` | LangGraph AI agent | ~300MB |
| `web-dreamwriter` | Next.js application | ~200MB |

### What Was Removed

Coolify's non-essential services (`coolify`, `coolify-db`, `coolify-redis`, `coolify-realtime`, `coolify-sentinel`) were stopped and disabled to free ~450MB RAM. They are NOT needed because GitHub Actions handles deployment.

### If the VPS Becomes Unresponsive

The VPS may become unresponsive if memory is exhausted. To recover:

```bash
# 1. Power cycle from DigitalOcean API
doctl compute droplet-action power-cycle <droplet-id>

# 2. Or from the DigitalOcean web dashboard:
#    https://cloud.digitalocean.com/droplets → Power → Power Cycle

# 3. After reboot, Coolify services auto-start and consume RAM.
#    Stop them immediately:
ssh -i ~/.ssh/id_ed25519 root@159.223.173.17 \
  "docker stop coolify coolify-db coolify-redis coolify-realtime coolify-sentinel && \
   docker update --restart=no coolify coolify-db coolify-redis coolify-realtime coolify-sentinel"

# 4. The app containers (web-dreamwriter, agent-dreamwriter) have --restart=unless-stopped
#    and will auto-recover after the Coolify services are stopped.
```

### DigitalOcean Droplet ID

```
ID: 562611948
Name: fanfic-lab-coolify
Region: nyc1
```

## Prisma Database Migrations

If you modify `prisma/schema.prisma`, the migration must be applied before deployment:

```bash
# Push schema changes to Neon database (from local machine)
npx prisma db push

# This is NOT done during Docker build — the database is managed externally on Neon.
# The Prisma client is generated during Docker build (npm run build includes prisma generate).
```

## Local Development

```bash
# Start both servers locally:
# Terminal 1: Start agent (needs env vars)
set -a && source .env.local && source .env && set +a
npx langgraphjs dev --host 0.0.0.0 --port 8123 --config src/agent/langgraph.json

# Terminal 2: Start Next.js (auto-loads .env.local)
npm run dev

# Or use concurrently (but agent may not load .env.local):
npm run dev:all
```

## Troubleshooting

### Build Fails on GitHub Actions

1. Check the failed step: `gh run view <id> --log-failed`
2. Common causes:
   - TypeScript errors: fix locally, push again
   - Missing secrets: check `gh secret list`
   - Docker build OOM: unlikely on GitHub (7GB RAM runners)

### 502/504 on Production Site

1. Check if containers are running: `ssh ... "docker ps"`
2. Check web logs: `ssh ... "docker logs web-dreamwriter --tail 30"`
3. Check memory: `ssh ... "free -h"`
4. If OOM: power cycle VPS and stop Coolify services (see above)

### Agent Not Responding

1. Check agent logs: `ssh ... "docker logs agent-dreamwriter --tail 30"`
2. Test agent directly: `ssh ... "docker exec web-dreamwriter node -e \"fetch('http://agent-dreamwriter:8123/info').then(r=>r.json()).then(console.log)\""`
3. Common cause: `OPENAI_API_KEY` invalid or expired

### Traefik Not Routing

1. Check Traefik config: `ssh ... "cat /data/coolify/proxy/dynamic/redirect.yaml"`
2. Ensure it points to `http://web-dreamwriter:3000`
3. Restart Traefik: `ssh ... "docker restart coolify-proxy"`
