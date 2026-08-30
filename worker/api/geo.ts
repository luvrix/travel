/**
 * Vercel Edge Function：代理高德 Web 服务 POI 查询
 * - 高德 key 藏在 Vercel 环境变量 AMAP_REST_KEY
 * - Upstash Redis 服务端缓存 30 天（可选，未配则跳过服务端缓存）
 * - 前端 localStorage 仍是第二层缓存
 *
 * Upstash REST API 用 fetch 直接调，省一个 @upstash/redis 依赖（Vercel build 环境装不上）
 */

import { queryAmap, type GeoEntry } from '../geo'

export const config = {
  runtime: 'edge',
}

const KV_TTL_SECONDS = 30 * 24 * 3600
const KV_PREFIX = 'poi:v1:'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

interface CachedValue {
  value: GeoEntry | null
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

async function kvGet(key: string): Promise<CachedValue | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null
  const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  })
  if (!res.ok) throw new Error(`kv get HTTP ${res.status}`)
  const body = await res.json() as { result: string | null }
  if (body.result == null) return null
  try {
    return JSON.parse(body.result) as CachedValue
  } catch {
    return null
  }
}

async function kvSet(key: string, value: CachedValue): Promise<void> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return
  await fetch(`${UPSTASH_URL}/set/${encodeURIComponent(key)}?EX=${KV_TTL_SECONDS}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(value),
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  const url = new URL(req.url)
  if (url.pathname !== '/api/geo') {
    return Response.json({ error: 'Not Found' }, { status: 404, headers: CORS_HEADERS })
  }

  const kw = url.searchParams.get('kw')?.trim() ?? ''
  if (kw.length < 2) {
    return Response.json({ result: null }, { headers: CORS_HEADERS })
  }

  const cacheKey = KV_PREFIX + kw
  try {
    const cached = await kvGet(cacheKey)
    if (cached) {
      return Response.json({ result: cached.value }, { headers: CORS_HEADERS })
    }
  } catch { /* KV 读失败，继续走上游 */ }

  const amapKey = process.env.AMAP_REST_KEY
  if (!amapKey) {
    return Response.json(
      { error: 'AMAP_REST_KEY not set' },
      { status: 500, headers: CORS_HEADERS },
    )
  }

  try {
    const entry = await queryAmap(kw, amapKey)
    try {
      // 命中和 null 都缓存
      await kvSet(cacheKey, { value: entry })
    } catch { /* KV 写失败，不影响返回 */ }
    return Response.json({ result: entry }, { headers: CORS_HEADERS })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'amap query failed' },
      { status: 502, headers: CORS_HEADERS },
    )
  }
}
