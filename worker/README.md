# geo-worker (Vercel Edge Function)

Vercel Edge Function 代理高德地理编码查询。架构、选型经过、为什么走自定义域名见 [`../docs/geo-network.md`](../docs/geo-network.md)。本文件只放部署步骤。

## 部署步骤

### 1. 申请高德「Web 服务」key

打开 https://console.amap.com/dev/key/app ，添加 Key 时**服务平台**选 **「Web 服务」**（不是「Web 端 JS API」，两类 key 不通用）。

**注意**：高德的 `/v3/place/text`（POI 搜索）接口被反爬虫策略封了（数据中心 IP 调会返回 HTML 惩罚页），所以这里改用 `/v3/geocode/geo`（地理编码）接口。地理编码对纯景点名（如"故宫"）有时会返回所在行政区而不是景点本身，但城市和知名景点（天安门、八达岭长城）能正确识别。

### 2. 在 Vercel 创建项目

1. 浏览器打开 https://vercel.com → 用 GitHub 账号登录
2. Dashboard 点 **Add New** → **Project** → 选你的 GitHub 仓库
3. 配置项目：
   - **Root Directory**：`worker/`（很重要，否则 Vercel 会在主仓库根目录找）
   - **Framework Preset**：Other
   - **Build Command**：留空
   - **Output Directory**：留空
4. 点 **Deploy**（第一次部署会因为没配 env var 而函数调用报错，正常）

> `worker/vercel.json` 里设了 `installCommand: exit 0`，Vercel 不会跑 `npm install`（worker 没有运行时依赖，runtime 是 Vercel Edge 提供的）。

### 3. 创建 Upstash Redis（可选但推荐）

1. 打开 https://console.upstash.com → 用 GitHub 登录
2. **Create Database** → 名字随便（如 `geo-cache`）→ Region 选离你近的（如 `us-east-1` 或 `ap-northeast-1`）
3. 创建完滑到底，找 **REST API** 段，复制 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`

**注**：不配 Upstash 也能跑，只是没服务端缓存，跨用户不共享，每个用户都自己打 amap。

### 4. 在 Vercel 项目里配环境变量

进入 Vercel 项目 → **Settings** → **Environment Variables**，加三个：

| Name | Value | Environments |
|---|---|---|
| `AMAP_REST_KEY` | 高德 Web 服务 key（第 1 步拿到） | Production, Preview, Development |
| `UPSTASH_REDIS_REST_URL` | Upstash 提供的 REST URL | Production, Preview, Development |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash 提供的 REST token | Production, Preview, Development |

### 5. 重新部署

回到 Vercel 项目 **Deployments** → 最新一次 → 右边菜单 **Redeploy**。

或者本地部署（首次要 `vercel login`）：

```bash
npm run deploy
```

### 6. 测试（海外 IP 或本地代理）

部署成功后 Vercel 会给你一个 URL，类似 `https://your-repo-name-abc.vercel.app`。**国内访问不到**（SNI 阻断），用海外 IP 或代理测试：

```bash
curl 'https://your-repo-name-abc.vercel.app/api/geo?kw=天安门'
# {"result":{"name":"天安门","pinyin":"","lat":39.909187,"lng":116.397463,"city":"北京","category":"attraction"}}
```

### 7. 配置自定义域名（国内访问必需）

要让国内用户访问，需要一个国内可达的域名指向 Vercel。推荐路径：DigitalPlat FreeDomain + Cloudflare 橙云代理。

1. 在 https://dash.domain.digitalplat.org/ 注册一个免费域名，如 `your-name.dpdns.org`，委派模式选「稍后配置」
2. 在 https://dash.cloudflare.com/ 加 zone `your-name.dpdns.org`（Free 套餐），Cloudflare 给你两条 NS（如 `carter.ns.cloudflare.com`、`josephine.ns.cloudflare.com`）
3. 回 DigitalPlat 域名管理，把委派模式改成「外部名称服务器」，填上面两条 NS
4. 等 Cloudflare zone 状态从 `pending` 变 `active`（几分钟到几小时）
5. 在 Cloudflare DNS 加 CNAME 记录：
   - Type: `CNAME`
   - Name: `@`（apex 根域）
   - Target: `cname.vercel-dns.com`
   - Proxy status: **Proxied**（橙色云，必须开）
6. 在 Vercel 项目 Settings → Domains 加 `your-name.dpdns.org`。Vercel UI 对 `dpdns.org` 后缀会报 "TLD not supported"，用 API 加：
   ```bash
   curl -X POST -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
     --data '{"name":"your-name.dpdns.org"}' "https://api.vercel.com/v4/domains"
   ```
7. 把域名绑到项目：
   ```bash
   curl -X POST -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
     --data '{"name":"your-name.dpdns.org","gitBranch":"main"}' \
     "https://api.vercel.com/v9/projects/$PROJECT_ID/domains?teamId=$TEAM_ID"
   ```
8. 关掉 Vercel 项目的 SSO Protection（Settings → Deployment Protection → Vercel Authentication → 关），否则 302 跳 sso-api
9. 把最新的 production deployment alias 到这个域名：
   ```bash
   curl -X POST -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
     --data '{"alias":"your-name.dpdns.org"}' \
     "https://api.vercel.com/v4/deployments/$DEPLOYMENT_ID/aliases?teamId=$TEAM_ID"
   ```

### 8. 接入主项目

在主项目根目录 `.env`（本地开发）和 `.env.production`（GitHub Pages 构建）：

```
VITE_GEO_WORKER_URL=https://your-name.dpdns.org
```

## 路由

| 方法 | 路径 | 行为 |
|---|---|---|
| GET | `/api/geo?kw=<keyword>` | 查地理编码。`kw < 2 字符` 直接返回 `{ result: null }` |
| OPTIONS | `/api/geo` | CORS 预检 |
| * | 其它路径 | 404 |

响应体：`{ result: GeoEntry | null }` 或错误时 `{ error: string }`（HTTP 502）。

## 免费额度

- Vercel Edge Function：100 万次/月（Hobby 免费）
- Upstash Redis：10,000 命令/天（免费）
- 高德 Web 服务：个人开发者 3000 次/日
- Cloudflare DNS + 代理：免费
- DigitalPlat FreeDomain：免费，1 个账号 1 个域名

按 30 天缓存估算，每个关键词第一次写、之后 30 天只读，10,000 命令/天上限够撑每天首次查询数百个不同关键词。
