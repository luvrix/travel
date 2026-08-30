# 高德地理编码的远程代理方案

主项目 `README.md` 只放结论，这一份记录选型走过的路 + 当前架构 + 部署细节。

## 背景

前端直接调高德 JS SDK（`AMap.PlaceSearch`）有两个问题：

1. **Key 暴露**：`VITE_AMAP_KEY` 和 `VITE_AMAP_SECURITY_CODE` 都打进客户端 bundle。security code 锁了域名白名单但 key 本身仍可见。
2. **无服务端缓存**：同一关键词不同用户各自查一次（localStorage 只 per-browser 缓存，跨用户/跨设备无共享）。

需求：把 key 藏到服务端 + 加一层服务端缓存。

## 选型走过的路

### 方案 A：Cloudflare Workers + KV

免费额度 10 万次/天 + KV 1000 写/天，足够个人项目。但 `*.workers.dev` 域名在国内被 GFW SNI 阻断：

- DNS 污染：`nslookup workers.dev` 返回 Twitter 的 IP `104.244.43.231`（错误 IP）
- SNI 阻断：即使 `--resolve` 把 workers.dev 指到 Cloudflare 正确 IP，TLS ClientHello 的 SNI 字段是明文，GFW 看到 `workers.dev` 直接 reset 连接（`Connection reset by peer`）

SNI 字段是 TLS 协议层，无法靠 DNS 污染绕开——客户端必须发 SNI 才能完成握手。

### 方案 B：Vercel Edge Function（默认 `*.vercel.app`）

迁移到 Vercel Edge Function 部署成功，但 `*.vercel.app` 域名同样被 SNI 阻断，国内访问不到。和 `workers.dev` 一个原因。

### 方案 C：Vercel + 自定义域名 + Cloudflare 橙云代理（当前方案）

核心思路：客户端 TLS 握手时 SNI 字段填自己的域名（不在 GFW 黑名单），Cloudflare 边缘节点接收握手、回源到 Vercel。

```
浏览器 ──TLS 握手 (SNI=luvrix.dpdns.org)──→ Cloudflare 边缘节点
                                              ↓ Cloudflare 内部回源
                                          Vercel Edge Function
                                              ↓
                                          Upstash Redis (缓存)
                                              ↓ 缓存 miss
                                          Amap REST API
```

为什么能绕过 SNI 阻断：

- **DNS 解析**：`luvrix.dpdns.org` 走 Cloudflare 权威 DNS，国内能解析
- **TLS SNI**：GFW 看到 `luvrix.dpdns.org` 不在黑名单（黑名单是 `*.vercel.app` / `*.workers.dev` 这种具体字符串），握手放行
- **Cloudflare IP**：橙云走 Cloudflare 自家边缘 IP，国内大量网站在用，不会被整体封

## 域名来源

免费域名来自 [DigitalPlat FreeDomain](https://github.com/DigitalPlatDev/FreeDomain)，可选后缀 `.dpdns.org` / `.us.kg` / `.qzz.io` 等，1 个账号 1 个域名。本项目用 `luvrix.dpdns.org`。

DigitalPlat 自己**只做 NS 委派**，不提供 DNS 记录编辑。需要把域名委派给外部权威 DNS（Cloudflare），在 Cloudflare 加 A/CNAME 记录。

## 高德接口选择

高德 Web 服务 API 两个候选：

| 接口 | 用途 | 现状 |
|---|---|---|
| `/v3/place/text` | POI 搜索 | 被反爬虫策略封，数据中心 IP 调返回 HTML 惩罚页（`bxpunish: 1` header） |
| `/v3/geocode/geo` | 地理编码（地名→坐标） | 正常工作 |

本项目用 `/geocode/geo`。局限：对纯景点名（如"故宫"）有时返回所在行政区而不是景点本身，`category=district`。但城市和知名景点（天安门、八达岭长城）能正确分类为 `city` / `attraction`。

## 缓存层级

1. **远程缓存（Upstash Redis）**：30 天 TTL，在 Vercel worker 服务端。任何用户第一次查某关键词后，其他用户再查同一关键词都走缓存，不再打 amap
2. **本地缓存（浏览器 localStorage）**：30 天 TTL，per-browser，跨会话不重复请求 worker

实测延迟：

- 冷启动（缓存 miss）：3-10s（要打 amap + 写 Upstash）
- 命中远程缓存：0.7s

## 部署步骤

见 [`worker/README.md`](../worker/README.md)。简述：

1. 申请高德 Web 服务 key
2. Vercel 创建项目（Root Directory = `worker/`）
3. 创建 Upstash Redis（可选但推荐）
4. Vercel 环境变量：`AMAP_REST_KEY` / `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
5. 部署 + 海外 IP 测试 `*.vercel.app`
6. DigitalPlat 注册 `*.dpdns.org` + Cloudflare 加 zone + CNAME 指向 `cname.vercel-dns.com` + 开橙云
7. Vercel API 加 custom domain + 关 SSO Protection + alias 到最新部署
8. 前端 `.env.production` 填 `VITE_GEO_WORKER_URL=https://<your-domain>`

## 国内访问验证

```bash
curl 'https://luvrix.dpdns.org/api/geo?kw=天安门'
# {"result":{"name":"天安门","pinyin":"","lat":39.909187,"lng":116.397463,"city":"北京","category":"attraction"}}
```

7 个关键词都返回正确坐标：天安门 / 上海 / 杭州西湖 / 八达岭长城 / 故宫 / 张家界 / 九寨沟。

## 免费额度

- Vercel Edge Function：100 万次/月（Hobby 免费）
- Upstash Redis：10,000 命令/天（免费）
- 高德 Web 服务：个人开发者 3000 次/日
- Cloudflare DNS + 代理：免费
- DigitalPlat FreeDomain：免费

按 30 天缓存估算，10,000 命令/天上限够撑每天首次查询数百个不同关键词。
