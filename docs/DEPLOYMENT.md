# Deployment Guide

How to deploy FanFic Lab (HSR DreamWriter) to production. This guide is written for Claude Code to follow after making code changes.

## Architecture Overview

> The DreamWriter agent runs **in-process** inside the Next.js app — there is a **single** image
> and a **single** container. There is no separate agent service and no `LANGGRAPH_URL`.

```
Developer (git push)
    |
    v
GitHub Actions (.github/workflows/deploy.yml)
    |-- Build Web Docker image (Dockerfile.web — bundles the in-process agent)
    |-- Push to GitHub Container Registry (GHCR)
    |-- SSH into VPS
    |-- Pull new image
    |-- Stop old container
    |-- Start new container
    |
    v
DigitalOcean VPS (159.223.173.17)
    |-- coolify-proxy (Traefik) -- reverse proxy, SSL via Cloudflare
    |-- web-dreamwriter         -- Next.js app + in-process agent on port 3000
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
1. Build the Web image (~3 min) on GitHub's servers
2. Push it to `ghcr.io/chanmeng666/fanfic-lab/web`
3. SSH into the VPS and pull the new image
4. Stop the old container, start the new one (also cleans up the retired `agent-dreamwriter`)
5. Total time: ~4 minutes

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

# Check container logs (agent logs are interleaved here — it runs in-process)
ssh -i ~/.ssh/id_ed25519 root@159.223.173.17 "docker logs web-dreamwriter --tail 20"

# Check memory usage
ssh -i ~/.ssh/id_ed25519 root@159.223.173.17 "free -h"
```

## Manual Deployment (Emergency)

If GitHub Actions fails or you need to deploy manually:

```bash
# 1. SSH into the VPS
ssh -i ~/.ssh/id_ed25519 root@159.223.173.17

# 2. Pull the latest image
docker pull ghcr.io/chanmeng666/fanfic-lab/web:latest

# 3. Stop old container(s) (also clears the retired agent container if present)
docker stop web-dreamwriter agent-dreamwriter 2>/dev/null || true
docker rm web-dreamwriter agent-dreamwriter 2>/dev/null || true

# 4. Start web (the DreamWriter agent runs in-process — no separate container)
docker run -d \
  --name web-dreamwriter \
  --network coolify \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e DATABASE_URL="<url>" \
  -e DATABASE_URL_UNPOOLED="<direct-url>" \
  -e OPENAI_API_KEY="<key>" \
  -e LANGSMITH_API_KEY="<key>" \
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
| `OPENAI_API_KEY` | Web | GPT-4o API calls (generation + embeddings) |
| `DATABASE_URL` | Web | Neon PostgreSQL connection (pooled) |
| `DATABASE_URL_UNPOOLED` | Web | Direct connection for the in-process agent's Postgres checkpointer |
| `STACK_SECRET_SERVER_KEY` | Web | Stack Auth server key |
| `NEXT_PUBLIC_STACK_PROJECT_ID` | Web | Stack Auth project ID |
| `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` | Web | Stack Auth client key |
| `CLOUDINARY_CLOUD_NAME` | Web | Image storage |
| `CLOUDINARY_API_KEY` | Web | Image storage |
| `CLOUDINARY_API_SECRET` | Web | Image storage |
| `LANGSMITH_API_KEY` | Web | LangSmith tracing for the in-process agent (optional) |
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

### What's Running (2 containers only)

| Container | Purpose | ~RAM |
|-----------|---------|------|
| `coolify-proxy` | Traefik reverse proxy | ~50MB |
| `web-dreamwriter` | Next.js app + in-process DreamWriter agent | ~400MB |

> Merging the agent in-process removed the separate `agent-dreamwriter` container (one fewer image,
> no internal HTTP hop). If you see a leftover `agent-dreamwriter` from an old deploy, it is safe to
> stop and remove.

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

# 4. The app container (web-dreamwriter) has --restart=unless-stopped
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
# The DreamWriter agent runs in-process, so a single command runs everything
# (Next.js auto-loads .env.local):
npm run dev

# Optional: LangGraph Studio for visual agent debugging (local-only, port 8123)
npm run dev:studio
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

### Story Generation Failing

The agent runs in-process, so its logs are interleaved in the web container.

1. Check web logs for agent events: `ssh ... "docker logs web-dreamwriter --tail 50"`
   (look for JSON lines like `{"event":"dreamwriter.node.start",...}` or `level:"error"`)
2. Common cause: `OPENAI_API_KEY` invalid or expired
3. Checkpointer issues: ensure `DATABASE_URL_UNPOOLED` is set (pooled connections break the
   Postgres checkpointer's prepared statements)

### Traefik Not Routing

1. Check Traefik config: `ssh ... "cat /data/coolify/proxy/dynamic/redirect.yaml"`
2. Ensure it points to `http://web-dreamwriter:3000`
3. Restart Traefik: `ssh ... "docker restart coolify-proxy"`
