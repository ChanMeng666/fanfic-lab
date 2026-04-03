# Migration Guide: Railway → DigitalOcean + Coolify

## Overview

This document records the complete migration of FanFic Lab from Railway (PaaS) to DigitalOcean VPS + Coolify (self-hosted PaaS), performed on 2026-04-03. It serves as both a reference for this project and a reusable playbook for future migrations of Dockerized applications.

**Key outcome:** Two Docker containers (Next.js web + LangGraph agent) successfully deployed on a $12/month DigitalOcean droplet with Coolify, replacing a ~$10/month Railway deployment, funded by $80 in DigitalOcean credits (~6.5 months free).

---

## Table of Contents

1. [Architecture Before and After](#architecture-before-and-after)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Migration](#step-by-step-migration)
4. [DNS and SSL Configuration](#dns-and-ssl-configuration)
5. [Lessons Learned](#lessons-learned)
6. [Claude Code Automation Playbook](#claude-code-automation-playbook)
7. [Troubleshooting Reference](#troubleshooting-reference)
8. [Cost Comparison](#cost-comparison)

---

## Architecture Before and After

### Before (Railway)
```
User → Railway CDN → web service (Next.js, port 3000)
                   → agent service (LangGraph, port 8123)
Internal: web → http://agent.railway.internal:8123
External: Neon PostgreSQL, Upstash Redis, Cloudinary, OpenAI, Tavily, Stack Auth
```

### After (DigitalOcean + Coolify)
```
User → Cloudflare (SSL + CDN) → DigitalOcean VPS (159.223.173.17)
  → Traefik reverse proxy (port 80/443)
    → web container (Next.js, port 3000)
    → agent container (LangGraph, port 8123)
Internal: web → http://agent:8123 (Docker Compose networking)
External: Same external services (Neon, Upstash, Cloudinary, OpenAI, Tavily, Stack Auth)
```

### What Changed
| Component | Railway | DigitalOcean + Coolify |
|-----------|---------|----------------------|
| Platform | Managed PaaS | Self-hosted PaaS (Coolify) on VPS |
| Proxy | Railway built-in | Traefik (via Coolify) |
| SSL | Railway auto-SSL | Cloudflare (proxy mode) |
| Internal networking | `agent.railway.internal:8123` | Docker Compose service name `agent:8123` |
| Deployment trigger | Git push auto-deploy | Coolify webhook or manual deploy |
| Cost | ~$10/month usage-based | $12/month fixed ($80 credits) |

### What Did NOT Change
- Docker images (same Dockerfiles)
- External services (Neon, Upstash, Cloudinary, etc.)
- Application code
- GitHub repository

---

## Prerequisites

### Tools Required (on local machine)
- `doctl` — DigitalOcean CLI ([install](https://docs.digitalocean.com/reference/doctl/how-to/install/))
- `ssh` + `ssh-keygen` — Built into Windows 11, macOS, Linux
- `curl` — For API calls
- `git` — For pushing compose file changes

### Accounts and Tokens Needed
1. **DigitalOcean API Token** — Full Access, created at https://cloud.digitalocean.com/account/api/tokens
2. **Cloudflare account** — With the domain's DNS managed there
3. **GitHub repository** — Public (simplifies Coolify setup; private repos need GitHub App or deploy key)

### Information to Collect Before Starting
- All environment variables from the existing deployment (Railway dashboard → service → Variables)
- Current DNS configuration (which records point where)
- The Neon database region (to choose the closest DO region)

---

## Step-by-Step Migration

### Step 1: Authenticate doctl

```bash
doctl auth init --access-token <YOUR_DO_API_TOKEN>
doctl account get  # Verify authentication
```

### Step 2: Generate SSH Key

```bash
ssh-keygen -t ed25519 -C "coolify-server" -f ~/.ssh/id_ed25519 -N ""
```

### Step 3: Upload SSH Key to DigitalOcean

```bash
doctl compute ssh-key import coolify-server --public-key-file ~/.ssh/id_ed25519.pub
# Note the key ID and fingerprint from output
```

### Step 4: Create Droplet with User-Data Script

This is the critical step. The user-data script runs on first boot and:
1. Configures swap space
2. Waits for apt locks to release (Ubuntu auto-updates on fresh install)
3. Installs Coolify
4. **Re-adds the SSH key after Coolify installation** (Coolify overwrites `authorized_keys`)

```bash
# Create the user-data script
PUB_KEY=$(cat ~/.ssh/id_ed25519.pub)

cat > /tmp/userdata.sh << 'SCRIPT'
#!/bin/bash
# Setup swap (recommended for 2GB RAM droplets)
fallocate -l 1G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Wait for apt to be available (Ubuntu runs unattended-upgrades on first boot)
while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do sleep 5; done

# Install Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# CRITICAL: Re-add SSH key after Coolify install (it overwrites authorized_keys)
PUBKEY="PLACEHOLDER_KEY"
mkdir -p /root/.ssh
echo "$PUBKEY" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
SCRIPT

# Inject the actual public key
sed -i "s|PLACEHOLDER_KEY|$PUB_KEY|" /tmp/userdata.sh

# Create the droplet
# Choose region closest to your database (e.g., nyc1 for Neon US East)
doctl compute droplet create my-coolify-server \
  --image ubuntu-24-04-x64 \
  --size s-2vcpu-2gb \
  --region nyc1 \
  --ssh-keys <SSH_KEY_ID> \
  --enable-monitoring \
  --user-data-file /tmp/userdata.sh \
  --wait

# Note the public IP from the output
```

**Droplet sizing guide:**
| Size | Spec | Monthly Cost | Good For |
|------|------|-------------|----------|
| s-1vcpu-1gb | 1 vCPU, 1GB RAM | $6 | Single lightweight app |
| s-2vcpu-2gb | 2 vCPU, 2GB RAM | $12 | 2-3 containerized apps + Coolify |
| s-2vcpu-4gb | 2 vCPU, 4GB RAM | $24 | 4-6 apps or resource-heavy builds |
| s-4vcpu-8gb | 4 vCPU, 8GB RAM | $48 | Many apps, concurrent builds |

### Step 5: Wait for Coolify Installation

```bash
# Poll until Coolify is ready (user-data takes 3-5 minutes)
for i in $(seq 1 20); do
  sleep 15
  result=$(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 \
    -i ~/.ssh/id_ed25519 root@<DROPLET_IP> \
    "docker ps --filter name=coolify --format '{{.Names}}' 2>/dev/null | head -1" 2>/dev/null)
  if [ -n "$result" ]; then
    status=$(ssh -i ~/.ssh/id_ed25519 root@<DROPLET_IP> \
      "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000" 2>/dev/null)
    if [ "$status" = "200" ] || [ "$status" = "302" ]; then
      echo "Coolify is ready!"
      break
    fi
  fi
  echo "Attempt $i: Not ready yet..."
done
```

### Step 6: Create Coolify Admin Account (Manual — Only Human Step)

Open `http://<DROPLET_IP>:8000` in a browser and create the admin account. This is the only step that requires human interaction in a browser.

### Step 7: Enable Coolify API and Create Token

```bash
# Enable API via artisan
ssh -i ~/.ssh/id_ed25519 root@<DROPLET_IP> \
  'docker exec coolify php artisan tinker --execute="
    \$s = App\Models\InstanceSettings::first();
    \$s->is_api_enabled = true;
    \$s->save();
    echo \"API enabled\";
  "'

# Create API token via database (artisan token creation has a bug with team_id)
PLAIN_TOKEN="my-coolify-api-token-$(date +%s)"
HASH=$(echo -n "$PLAIN_TOKEN" | sha256sum | awk '{print $1}')

ssh -i ~/.ssh/id_ed25519 root@<DROPLET_IP> \
  "docker exec coolify-db psql -U coolify -d coolify -c \"
    INSERT INTO personal_access_tokens
      (tokenable_type, tokenable_id, name, token, abilities, team_id, created_at, updated_at)
    VALUES
      ('App\\\Models\\\User', 0, 'claude-code', '$HASH', '[\\\"*\\\"]', 0, NOW(), NOW())
    RETURNING id;
  \""

# The API token format is: <id>|<plain_token>
# Example: 3|my-coolify-api-token-1712108000
COOLIFY_TOKEN="<ID_FROM_OUTPUT>|$PLAIN_TOKEN"

# Verify API access
curl -s "http://<DROPLET_IP>:8000/api/v1/teams" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "Accept: application/json"
```

### Step 8: Create Docker Compose File

Create `docker-compose.coolify.yml` in the project root:

```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.web
      args:
        - NEXT_PUBLIC_STACK_PROJECT_ID=${NEXT_PUBLIC_STACK_PROJECT_ID}
        - NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=${NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY}
        - STACK_SECRET_SERVER_KEY=${STACK_SECRET_SERVER_KEY}
        - DATABASE_URL=${DATABASE_URL}
        - REDIS_URL=${REDIS_URL}
        - OPENAI_API_KEY=${OPENAI_API_KEY}
        - LANGSMITH_API_KEY=${LANGSMITH_API_KEY}
        - LANGGRAPH_URL=http://agent:8123
        - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
        - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
        - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
        - ADMIN_SECRET=${ADMIN_SECRET}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - LANGGRAPH_URL=http://agent:8123
      # ... all runtime env vars
    depends_on:
      - agent
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  agent:
    build:
      context: .
      dockerfile: Dockerfile.agent
    ports:
      - "8123:8123"
    environment:
      - NODE_ENV=production
      - PORT=8123
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - TAVILY_API_KEY=${TAVILY_API_KEY}
      - LANGSMITH_API_KEY=${LANGSMITH_API_KEY}
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:8123/info').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
```

**Important:** The key networking change is `LANGGRAPH_URL=http://agent:8123` — Docker Compose allows services to reach each other by service name.

Commit and push:
```bash
git add docker-compose.coolify.yml
git commit -m "feat: add Coolify Docker Compose deployment config"
git push origin master
```

### Step 9: Create Application via Coolify API

```bash
COOLIFY_URL="http://<DROPLET_IP>:8000"
AUTH="Authorization: Bearer $COOLIFY_TOKEN"

# Get server UUID
SERVER_UUID=$(curl -s "$COOLIFY_URL/api/v1/servers" \
  -H "$AUTH" -H "Accept: application/json" | grep -o '"uuid":"[^"]*"' | head -1 | cut -d'"' -f4)

# Create project
PROJECT_UUID=$(curl -s -X POST "$COOLIFY_URL/api/v1/projects" \
  -H "$AUTH" -H "Accept: application/json" -H "Content-Type: application/json" \
  -d '{"name":"My Project"}' | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4)

# Create Docker Compose application from public repo
APP_UUID=$(curl -s -X POST "$COOLIFY_URL/api/v1/applications/public" \
  -H "$AUTH" -H "Accept: application/json" -H "Content-Type: application/json" \
  -d "{
    \"project_uuid\": \"$PROJECT_UUID\",
    \"environment_name\": \"production\",
    \"server_uuid\": \"$SERVER_UUID\",
    \"git_repository\": \"https://github.com/<OWNER>/<REPO>\",
    \"git_branch\": \"master\",
    \"build_pack\": \"dockercompose\",
    \"docker_compose_location\": \"/docker-compose.coolify.yml\",
    \"name\": \"my-app\",
    \"docker_compose_domains\": [{\"name\": \"web\", \"domain\": \"https://mydomain.com\"}]
  }" | grep -o '"uuid":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "App UUID: $APP_UUID"
```

### Step 10: Set Environment Variables via API

```bash
# Coolify auto-detects env vars from docker-compose and creates empty entries.
# Use PATCH to fill in the values.

declare -A ENV_VARS
ENV_VARS[DATABASE_URL]="postgresql://user:pass@host/db?sslmode=require"
ENV_VARS[REDIS_URL]="redis://default:xxx@host:6379"
ENV_VARS[OPENAI_API_KEY]="sk-..."
# ... add all env vars

for KEY in "${!ENV_VARS[@]}"; do
  VALUE="${ENV_VARS[$KEY]}"
  curl -s -X PATCH "$COOLIFY_URL/api/v1/applications/$APP_UUID/envs" \
    -H "$AUTH" -H "Accept: application/json" -H "Content-Type: application/json" \
    -d "{\"key\": \"$KEY\", \"value\": \"$VALUE\"}"
  echo "$KEY: updated"
done
```

### Step 11: Deploy

```bash
# Trigger deployment (use "restart" endpoint — "deploy" may return 404)
curl -s -X POST "$COOLIFY_URL/api/v1/applications/$APP_UUID/restart" \
  -H "$AUTH" -H "Accept: application/json"

# Monitor deployment status
DEPLOY_UUID="<from response>"
for i in $(seq 1 40); do
  sleep 15
  STATUS=$(curl -s "$COOLIFY_URL/api/v1/deployments/$DEPLOY_UUID" \
    -H "$AUTH" -H "Accept: application/json" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "[$i] Status: $STATUS"
  if [ "$STATUS" = "finished" ]; then echo "SUCCESS"; break; fi
  if [ "$STATUS" = "failed" ]; then echo "FAILED"; break; fi
done
```

---

## DNS and SSL Configuration

### Recommended Approach: Cloudflare Proxy

Using Cloudflare as a proxy (orange cloud ON) is simpler than Let's Encrypt on the origin:
- Cloudflare provides free SSL certificates automatically
- No need to manage Let's Encrypt renewal
- Built-in DDoS protection, caching, and CDN
- Easy redirect rules (www → root domain)

### Setup via Cloudflare Dashboard API (from browser context)

If you have access to the Cloudflare dashboard in a browser, you can use `fetch()` from the page context to call the Cloudflare API with the user's session cookies — no separate API token needed.

```javascript
// Example: Update DNS record (run from browser console on Cloudflare dashboard)
const zoneId = '<ZONE_ID>';

// Delete old CNAME (pointing to Railway)
await fetch(`/api/v4/zones/${zoneId}/dns_records/<RECORD_ID>`, { method: 'DELETE' });

// Create A record pointing to DigitalOcean IP
await fetch(`/api/v4/zones/${zoneId}/dns_records`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'A', name: '@', content: '<DROPLET_IP>', proxied: true, ttl: 1
  })
});
```

### Cloudflare Settings for Coolify

| Setting | Value | Why |
|---------|-------|-----|
| SSL Mode | **Flexible** | Cloudflare → origin via HTTP (avoids Let's Encrypt issues) |
| Always Use HTTPS | **ON** | Force all traffic to HTTPS |
| Automatic HTTPS Rewrites | **ON** | Fix mixed content |
| HSTS | **ON** (max-age 31536000) | Tell browsers to always use HTTPS |

### www → Root Domain Redirect

Create a Cloudflare Redirect Rule:
- **Expression:** `(http.host eq "www.example.com")`
- **Action:** Dynamic redirect, 301, `concat("https://example.com", http.request.uri.path)`, preserve query string

### Traefik Dynamic Config for Root Domain

Coolify's Docker labels only set up routing for the domain configured in the app. If you need to route additional domains (like the root domain when Coolify only knows about `www`), add a Traefik dynamic config:

```bash
ssh root@<DROPLET_IP> 'cat > /data/coolify/proxy/dynamic/custom-routing.yaml << "EOF"
http:
  routers:
    root-domain:
      entryPoints:
        - http
      service: web-service
      rule: "Host(`example.com`)"
      priority: 1000
    www-domain:
      entryPoints:
        - http
      service: web-service
      rule: "Host(`www.example.com`)"
      priority: 1000
  services:
    web-service:
      loadBalancer:
        servers:
          - url: "http://<WEB_CONTAINER_NAME>:3000"
EOF'
```

**Important:** When using Cloudflare Flexible SSL, the Traefik dynamic config must route on HTTP (port 80) only, NOT redirect to HTTPS. The redirect-to-https middleware in Coolify's Docker labels will cause a redirect loop with Cloudflare Flexible mode.

---

## Lessons Learned

### 1. Use CLI/API Tools, NOT Browser Automation

**The biggest mistake in this migration was using browser automation (Claude in Chrome) for tasks that should have been done via CLI or API.**

| Task | Wrong Approach (Browser) | Right Approach (CLI/API) |
|------|-------------------------|------------------------|
| Create DO droplet | Click through web UI | `doctl compute droplet create` |
| Create DO API token | Navigate forms in browser | `doctl` or pre-created token |
| Install Coolify | N/A (always SSH) | `ssh root@IP "curl ... \| bash"` |
| Configure Coolify | Click through Coolify web UI | Coolify REST API |
| Set env vars | Type into textarea fields | `curl -X PATCH .../envs` |
| Deploy | Click "Deploy" button | `curl -X POST .../restart` |
| Update DNS | Click through Cloudflare UI | Cloudflare API or `wrangler` |

**Why browser automation fails:**
- Cloudflare and Coolify dashboards use complex React/Svelte components that don't respond well to programmatic clicks
- Dropdown menus, modals, and dynamic content are unreliable to interact with
- Ctrl+A in Coolify opens a search modal instead of selecting text
- Scrolling issues cause elements to disappear or become unclickable
- Each browser interaction takes 2-5 seconds; API calls take <1 second
- Browser automation requires screenshots to verify state; APIs return structured data

**Rule:** If a service has an API or CLI, always use it. Only fall back to browser automation for the absolute minimum (e.g., initial account registration that has no API).

### 2. Coolify Overwrites SSH authorized_keys

Coolify's installer replaces `/root/.ssh/authorized_keys` with its own keys. If you install Coolify via SSH, you will lose SSH access.

**Solution:** Use DigitalOcean's user-data script that installs Coolify AND re-adds your SSH key AFTER installation:

```bash
# In user-data script, AFTER Coolify install:
echo "$YOUR_PUBLIC_KEY" >> /root/.ssh/authorized_keys
```

**Anti-pattern:** Do NOT try to fix this by:
- Rebuilding the droplet (loses Coolify)
- Resetting the root password (requires interactive password change)
- Power cycling (doesn't fix authorized_keys)

### 3. Coolify API Token Creation Bug

Coolify v4's `createToken()` method has a bug where `team_id` is null, causing a database constraint violation. Workaround: insert the token directly into PostgreSQL.

```bash
PLAIN_TOKEN="my-token"
HASH=$(echo -n "$PLAIN_TOKEN" | sha256sum | awk '{print $1}')
docker exec coolify-db psql -U coolify -d coolify -c "
  INSERT INTO personal_access_tokens (tokenable_type, tokenable_id, name, token, abilities, team_id, created_at, updated_at)
  VALUES ('App\Models\User', 0, 'api-token', '$HASH', '[\"*\"]', 0, NOW(), NOW())
  RETURNING id;
"
# Token format: <returned_id>|<PLAIN_TOKEN>
```

### 4. Cloudflare SSL Mode Matters

| Mode | Behavior | When to Use |
|------|----------|-------------|
| **Flexible** | CF→origin via HTTP | Origin has no valid cert (simplest setup) |
| **Full** | CF→origin via HTTPS (any cert) | Origin has self-signed or expired cert |
| **Full (Strict)** | CF→origin via HTTPS (valid cert) | Origin has valid Let's Encrypt cert |

With Coolify + Traefik, **Flexible** is the easiest because:
- No need to manage Let's Encrypt certificates
- No redirect loops (Traefik's HTTP→HTTPS redirect must be disabled)
- Cloudflare handles all SSL/TLS

**Gotcha:** If using Flexible mode, ensure Traefik does NOT have a `redirect-to-https` middleware active. Coolify adds this by default via Docker labels, so you may need to override it with a higher-priority dynamic config router.

### 5. apt Lock on Fresh Ubuntu Droplets

Fresh Ubuntu 24.04 droplets run `unattended-upgrades` on first boot, which holds the dpkg lock for 1-3 minutes. Always wait for it:

```bash
while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
  echo "Waiting for apt lock..."
  sleep 5
done
```

### 6. 2GB RAM is Tight but Workable

With 2GB RAM + 1GB swap, memory usage is tight:
- Coolify overhead: ~400MB
- Web container: ~200-300MB
- Agent container: ~200-300MB
- System: ~200MB

The Next.js build process during deployment can spike to 1.5GB+. Add swap and be prepared for occasional SSH timeouts during builds.

### 7. Docker Compose Domain Config in Coolify

Coolify's API for Docker Compose domains is:
```json
{
  "docker_compose_domains": [
    {"name": "web", "domain": "https://example.com"}
  ]
}
```

Note: Using `"domains"` (without `docker_compose_`) returns a validation error for Docker Compose apps.

---

## Claude Code Automation Playbook

### Ideal Flow (Minimal Human Intervention)

The entire migration should require only **1 human action**: creating the Coolify admin account in a browser. Everything else should be automated.

```
1. [Claude Code] Explore codebase → understand Dockerfiles, env vars, architecture
2. [Claude Code] `doctl` → create droplet with user-data (installs Coolify + preserves SSH)
3. [Human] Open browser → create Coolify admin account (1 minute)
4. [Claude Code] SSH → enable Coolify API, create API token
5. [Claude Code] Coolify API → create project, app, set env vars, deploy
6. [Claude Code] Cloudflare API → update DNS records, configure SSL
7. [Claude Code] `curl` → verify health endpoints
8. [Claude Code] Railway CLI or browser → delete old deployment
```

### Tool Priority Order

When automating deployment tasks, prefer tools in this order:

1. **CLI tools** (`doctl`, `railway`, `wrangler`, `ssh`) — Most reliable, scriptable
2. **REST APIs** (Coolify API, Cloudflare API, DigitalOcean API) — Structured responses, no UI quirks
3. **SSH + remote commands** — For server-side operations
4. **Browser automation** — LAST RESORT, only when no API/CLI exists

### Key API Endpoints Reference

**Coolify API** (`http://<IP>:8000/api/v1/`):
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/teams` | GET | Verify auth |
| `/servers` | GET | List servers, get UUID |
| `/projects` | POST | Create project |
| `/applications/public` | POST | Create app from public repo |
| `/applications/<uuid>` | PATCH | Update app config |
| `/applications/<uuid>/envs` | GET | List env vars |
| `/applications/<uuid>/envs` | POST | Create env var |
| `/applications/<uuid>/envs` | PATCH | Update env var (by key) |
| `/applications/<uuid>/restart` | POST | Deploy/restart |
| `/deployments/<uuid>` | GET | Check deployment status |

**Cloudflare API** (`https://api.cloudflare.com/client/v4/`):
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/zones?name=<domain>` | GET | Get zone ID |
| `/zones/<id>/dns_records` | GET/POST/PUT/DELETE | Manage DNS records |
| `/zones/<id>/settings/ssl` | PATCH | Set SSL mode |
| `/zones/<id>/settings/always_use_https` | PATCH | Force HTTPS |
| `/zones/<id>/rulesets/phases/http_request_dynamic_redirect/entrypoint` | PUT | Redirect rules |

---

## Troubleshooting Reference

### Error 524 (Cloudflare Origin Timeout)
**Cause:** Cloudflare Flexible mode sends HTTP to origin, but Traefik redirects HTTP→HTTPS, creating a loop/timeout.
**Fix:** Override Traefik's routing with a dynamic config that serves HTTP without redirect. Or switch to Cloudflare Full SSL mode with a valid origin certificate.

### SSH "Permission denied (publickey)" After Coolify Install
**Cause:** Coolify installer overwrites `authorized_keys`.
**Fix:** Use user-data script that re-adds SSH key after Coolify install. Or access via DigitalOcean console.

### "Not Secure" Warning in Browser
**Cause:** Browser cached the old HTTP version of the site.
**Fix:** Clear browser cache or test in incognito mode. Enable Cloudflare "Always Use HTTPS" and HSTS.

### Let's Encrypt Certificate Fails
**Cause:** DNS not yet propagated, or ACME HTTP challenge can't reach origin.
**Fix:** Use Cloudflare proxy mode instead (avoids Let's Encrypt entirely). Or wait for DNS propagation and retry.

### Deployment Fails with OOM
**Cause:** 2GB RAM + Next.js build = tight memory.
**Fix:** Add swap (`fallocate -l 1G /swapfile`). Or upgrade droplet during builds.

---

## Cost Comparison

| | Railway (Hobby) | DigitalOcean + Coolify |
|--|----------------|----------------------|
| Base cost | $5/month + usage | $12/month fixed |
| This project | ~$10/month | $12/month (covered by $80 credits) |
| Max RAM | 8 GB (shared) | 2 GB dedicated (upgradeable) |
| Max vCPU | 8 (shared) | 2 dedicated (upgradeable) |
| Multiple projects | Each project billed separately | All projects on same VPS |
| SSL | Included | Cloudflare (free) |
| Root access | No | Yes (full VPS) |
| Auto-scaling | Yes | Manual resize |

**Bottom line:** For low-traffic personal projects, DigitalOcean + Coolify is more cost-effective, especially with credits. For projects that need auto-scaling or zero-ops, Railway is simpler.
