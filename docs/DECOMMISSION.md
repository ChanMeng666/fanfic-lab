# FanFic Lab — 项目下架总账（DECOMMISSION）

> **状态：本项目已于 2026-07-05 战略搁置（SHELVED / 烂尾），并从所有平台下架。**
> 本文档记录下架的完整过程、验证证据与剩余可选项，供日后翻查或（万一）恢复时参考。

---

## 为什么下架

经产品定位/方向战略讨论后，判断继续开发风险过高（中文同人圈对公开 AI 同人的抵制、外部创始人冷启动获客困难、成人向内容的辖区法律敞口、HSR 圈过峰、目标未定）。决定不再开发、任其自然烂尾。战略讨论的完整结论见 `~/.claude/plans/ai-agent-ai-ai-native-lofter-fable-5-op-eventual-blum.md`（本机私有计划文件，非仓库内）。

**注意：代码本身未删除**（仓库保留）。下架针对的是**线上运行时资源与密钥**。工程骨架（in-process LangGraph agent + SSE 流式管道 + 质检重写循环 + 原子幂等 Stripe 计费）与"同人"赛道无绑定，将来可复用到其他领域。

---

## 已下架清单（全部完成 ✅）

### 服务器侧 — DigitalOcean droplet（共享机，159.223.173.17）
该 droplet **仍在运行**，因为上面还托管着另外三个项目（`web-archcanvas`、`web-vitex`/easy-resume、`web-sunostats`）和共享的 Traefik 反代（`coolify-proxy`）。仅精准移除本项目：

- 停止并删除容器 `web-dreamwriter`（Traefik 路由写在容器 label 上，删容器即自动摘除 `fanfic-lab.tech` 路由）。
- 删除全部 `ghcr.io/chanmeng666/fanfic-lab/web` + `ghcr.io/chanmeng666/fanfic-lab/agent` 镜像（约 90 个 tag）。
- 部署无数据卷（数据在外部 Neon），机器上无残留卷。
- **磁盘占用 74% → 46%，腾出约 16GB。** 另三个项目与 Traefik 验证仍 healthy。

### GitHub
- Actions workflow `Build & Deploy`（`.github/workflows/deploy.yml`）已 `disabled_manually`，防止 push 到 master 时重新构建部署、复活容器。
- GHCR 容器包 `fanfic-lab/web` + `fanfic-lab/agent` 已删除（Packages 列表现为 0）。

### 域名 / CDN
- Cloudflare `fanfic-lab.tech` 的两条 A 记录（`@` 与 `www` → 159.223.173.17）已删除。zone 与域名注册保留（见下方可选项）。

### 数据库 / 认证
- Neon 数据库项目 `fanfic-lab-neon`（`summer-star-18127990`）已删除。**注意**：Neon 控制台不允许直接删（提示须经 Vercel），实际经 `Vercel（chan-mengs-projects）→ Storage → fanfic-lab-neon → Settings → Delete Database` 完成（需填 database slug + team slug + 勾选确认）。其他项目的 Neon 库（leviathan / linkedin-jobs-search / easy-resume 等）未动。
- Stack Auth 即 Neon Auth 引擎，配置在该 Neon 库内，**随 Neon 库删除一并失效**，无需单独处理。

### 第三方密钥（全部已失效，且未误伤跨项目共享的）
- **Tavily**、**LangSmith**：已手动删除。
- **OpenAI**：`.env.local` 中的 key 已失效。
- **Cloudinary**：账户 `dr0wo4hha` 为**多项目共用**（femtech-weekend 亦在用）。本项目独立 key `553663655376423` 实测 `ping` 返回 **HTTP 401 = 已失效**（早前已轮换/删除）。仪表盘仅剩 `839617249148195`（femtech-weekend 的 Root key）——属其他活项目，**已正确避开、未动**。
- **ADMIN_SECRET**：app 内部密钥，随容器删除即失效。

### 支付
- Stripe 生产 webhook `https://fanfic-lab.tech/api/webhooks/stripe`（"FanFic Lab prod LIVE"）已删除。Stripe 为**专用账户** `fanfic-lab`（`acct_1TkjvdRFurW0Va8u`），products/keys 现已 inert（app 已移除，不可能产生扣费）。

---

## 剩余可选项（无成本、无风险，按需处理）

1. **Stripe 专用账户** — 现已 inert，可在 `Settings` 整户关闭；不关也无影响。
2. **Cloudflare 空 zone + 域名 `fanfic-lab.tech`** — DNS 记录已清空，但 zone 与域名注册仍在；视是否保留该域名决定（保留可能有续费），不留可在注册处放其过期 / 删除 zone。
3. **本地 `.env.local`** — 其中密钥现已全部失效，留存无害；如需彻底干净可删除该文件。

---

## 恢复指引（万一日后重启）

代码仍在仓库，可重建线上环境：
1. 重新启用 GitHub Actions workflow（`gh workflow enable "Build & Deploy" -R chanmeng666/fanfic-lab`）。
2. 重建 Neon 库（经 Vercel Neon 集成）+ 重配 Stack Auth/Neon Auth，更新 `DATABASE_URL(_UNPOOLED)`、Stack Auth secrets。
3. 重新签发并配置各第三方 key（OpenAI/Cloudinary/Tavily/LangSmith）为 GitHub Actions secrets。
4. 在 Cloudflare 重新添加 `fanfic-lab.tech` / `www` 的 A 记录指向部署服务器，走 Traefik 反代。
5. push 到 master 触发部署。
> 若要重启**方向**而非仅技术栈，先读上文提到的战略计划文件——它给出的私人共写引擎方向与当前公开社区壳代码并不一致。

---

*记录时间：2026-07-05。执行方式：`doctl`/SSH（droplet 侧）、`gh` CLI（workflow）、Claude in Chrome（GHCR/Cloudflare/Vercel-Neon/Stripe 后台）、Cloudinary Admin API ping（密钥验证）。*
