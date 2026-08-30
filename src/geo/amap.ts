import type { GeoEntry } from '../data/geo'

const CACHE_VERSION = 'v5'
const CACHE_PREFIX = `geo-amap:${CACHE_VERSION}:`
const CACHE_TTL = 30 * 24 * 3600 * 1000  // 30 天

const WORKER_URL = import.meta.env.VITE_GEO_WORKER_URL

interface CacheEntry {
  data: GeoEntry | null
  ts: number
}

function readCache(keyword: string): GeoEntry | null | undefined {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + keyword)
    if (!raw) return undefined
    const cached: CacheEntry = JSON.parse(raw)
    if (Date.now() - cached.ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + keyword)
      return undefined
    }
    return cached.data
  } catch {
    return undefined
  }
}

function writeCache(keyword: string, data: GeoEntry | null): void {
  try {
    const entry: CacheEntry = { data, ts: Date.now() }
    localStorage.setItem(CACHE_PREFIX + keyword, JSON.stringify(entry))
  } catch { /* quota 超了就算了 */ }
}

/** 清理旧版本缓存（一次性，幂等） */
function cleanOldCache(): void {
  try {
    const keys = Object.keys(localStorage)
    for (const k of keys) {
      if (k.startsWith('geo-amap:') && !k.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(k)
      }
    }
  } catch { /* ignore */ }
}

cleanOldCache()

interface WorkerResponse {
  result?: GeoEntry | null
  error?: string
}

/**
 * 通过 Vercel Edge Function 查询高德地理编码
 * - 高德 key 藏在服务端，前端只持有 Worker URL
 * - localStorage 缓存 30 天（命中和 null 都缓存），跨会话不重复请求
 * - Worker 未配置时返回 null（仅本地数据库可用）
 */
export async function searchAmap(keyword: string): Promise<GeoEntry | null> {
  if (!keyword || keyword.length < 2) return null
  if (!WORKER_URL) return null

  const cached = readCache(keyword)
  if (cached !== undefined) return cached

  try {
    const url = `${WORKER_URL}/api/geo?kw=${encodeURIComponent(keyword)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`geo worker HTTP ${res.status}`)
    const body = await res.json() as WorkerResponse
    if (body.error) throw new Error(body.error)
    const entry = body.result ?? null
    writeCache(keyword, entry)
    return entry
  } catch (e) {
    throw e instanceof Error ? e : new Error('geo worker 请求失败')
  }
}
