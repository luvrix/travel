import { Document } from 'flexsearch'
import type { GeoEntry } from '../data/geo'

type IdxDoc = { _id: number; name: string; pinyin: string; city: string }

// 启动加载：389 个城市 + 城市索引（~80KB）
// 按需加载：用户行程涉及省份的分片 + 索引（每个 ~50KB-3MB）
// 替代一次性加载 29MB geo.json + 17MB 全量索引

let CITIES: GeoEntry[] = []                          // 启动加载
const CITY_TO_SLUG: Map<string, string> = new Map()    // city 名 → 省份 slug（启动加载）
let citiesIdx: Document<IdxDoc, false> | null = null
const LOADED_PROVINCES = new Map<string, { data: GeoEntry[]; idx: Document<IdxDoc, false> }>()
const loadingProvinces = new Map<string, Promise<void>>()  // 去重并发请求
let initPromise: Promise<void> | null = null

/** 启动加载 cities.json + cities 索引（~80KB，首屏主要开销） */
export function initGeoData(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const base = `${import.meta.env.BASE_URL}data/`
    const [citiesRes, idxRes] = await Promise.all([
      fetch(`${base}cities.json`),
      fetch(`${base}idx/cities.json`).catch(() => null),
    ])
    if (!citiesRes.ok) throw new Error(`Failed to load cities.json: ${citiesRes.status}`)
    CITIES = await citiesRes.json()
    for (const c of CITIES) {
      if (c.province_slug) CITY_TO_SLUG.set(c.name, c.province_slug)
    }

    const newIdx = new Document<IdxDoc, false>({
      document: { id: '_id', index: [
        { field: 'name', resolution: 9 },
        { field: 'pinyin', resolution: 5 },
        { field: 'city', resolution: 3 },
      ] },
      encode,
    })
    if (idxRes && idxRes.ok) {
      const chunks = await idxRes.json() as Record<string, string>
      for (const [k, v] of Object.entries(chunks)) newIdx.import(k, v)
    } else {
      const idxDocs: IdxDoc[] = CITIES.map((e, i) => ({
        _id: i, name: e.name, pinyin: e.pinyin, city: e.city ?? '',
      }))
      for (const doc of idxDocs) newIdx.add(doc)
    }
    citiesIdx = newIdx
  })()
  return initPromise
}

// 逐字符分词：中文每字独立 token，英文/拼音按整词
function encode(str: string): string[] {
  const tokens: string[] = []
  const lower = str.toLowerCase()
  for (const char of lower) {
    if (/[一-鿿㐀-䶿]/.test(char)) tokens.push(char)
  }
  const latin = lower.match(/[a-z0-9]+/g)
  if (latin) tokens.push(...latin)
  return tokens
}

export function isGeoDataReady(): boolean {
  return citiesIdx !== null
}

/** 按需加载省份分片 + 索引 — slug 来自 cities.json 的 province_slug 字段 */
export function ensureProvinceLoaded(slug: string): Promise<void> {
  if (LOADED_PROVINCES.has(slug)) return Promise.resolve()
  const inflight = loadingProvinces.get(slug)
  if (inflight) return inflight
  const p = (async () => {
    if (!initPromise) await initGeoData()
    const base = `${import.meta.env.BASE_URL}data/`
    const [dataRes, idxRes] = await Promise.all([
      fetch(`${base}provinces/${slug}.json`),
      fetch(`${base}idx/${slug}.json`).catch(() => null),
    ])
    if (!dataRes.ok) throw new Error(`Failed to load province ${slug}: ${dataRes.status}`)
    const data = await dataRes.json() as GeoEntry[]

    const idx = new Document<IdxDoc, false>({
      document: { id: '_id', index: [
        { field: 'name', resolution: 9 },
        { field: 'pinyin', resolution: 5 },
        { field: 'city', resolution: 3 },
      ] },
      encode,
    })
    if (idxRes && idxRes.ok) {
      const chunks = await idxRes.json() as Record<string, string>
      for (const [k, v] of Object.entries(chunks)) idx.import(k, v)
    } else {
      const idxDocs: IdxDoc[] = data.map((e, i) => ({
        _id: i, name: e.name, pinyin: e.pinyin, city: e.city ?? '',
      }))
      for (const doc of idxDocs) idx.add(doc)
    }
    LOADED_PROVINCES.set(slug, { data, idx })
    loadingProvinces.delete(slug)
  })()
  loadingProvinces.set(slug, p)
  return p
}

/** 给一批 city 名，确保它们所在省份都已加载 — 行程编译/补全前调用 */
export async function ensureCitiesLoaded(cities: string[]): Promise<void> {
  if (!initPromise) await initGeoData()
  const slugs = new Set<string>()
  for (const city of cities) {
    const slug = CITY_TO_SLUG.get(city)
    if (slug) slugs.add(slug)
  }
  await Promise.all([...slugs].map(s => ensureProvinceLoaded(s)))
}

export async function searchLocation(query: string, limit = 5): Promise<GeoEntry[]> {
  if (!citiesIdx) return []
  const seen = new Set<number>()
  const out: GeoEntry[] = []

  // 先查已加载省份的索引（更具体，优先）
  for (const [, { data, idx }] of LOADED_PROVINCES) {
    const results = idx.search(query, limit * 2)
    for (const { result } of results) {
      for (const id of result as number[]) {
        if (seen.has(id)) continue
        seen.add(id)
        out.push(data[id])
        if (out.length >= limit) return out
      }
    }
  }
  // 再查 cities 索引（兜底，城市名）
  const cityResults = citiesIdx.search(query, limit * 2)
  for (const { result } of cityResults) {
    for (const id of result as number[]) {
      if (seen.has(id)) continue
      seen.add(id)
      out.push(CITIES[id])
      if (out.length >= limit) return out
    }
  }
  return out
}

export async function findLocation(name: string, hint?: { lat: number; lng: number }): Promise<GeoEntry | undefined> {
  if (!name || name === '新地点' || CITIES.length === 0) return undefined
  // 优先精确匹配 — 先在已加载省份找，再在 CITIES 找
  // 多条同名 POI 时若调用方给了坐标 hint，选离 hint 最近的
  const exactMatches: GeoEntry[] = []
  for (const [, { data }] of LOADED_PROVINCES) {
    for (const e of data) {
      if (e.name === name) exactMatches.push(e)
    }
  }
  for (const c of CITIES) {
    if (c.name === name) exactMatches.push(c)
  }
  if (exactMatches.length > 0) {
    if (hint && exactMatches.length > 1) {
      let best = exactMatches[0], bestD = Infinity
      for (const m of exactMatches) {
        const d = (m.lat - hint.lat) ** 2 + (m.lng - hint.lng) ** 2
        if (d < bestD) { bestD = d; best = m }
      }
      return best
    }
    return exactMatches[0]
  }
  // 精确匹配没找到 — 模糊查已加载省份
  const candidates = await searchLocation(name, 5)
  return candidates.find(e => e.category !== 'city' && e.name.includes(name))
}

export async function isExactCityName(name: string): Promise<boolean> {
  if (CITIES.length === 0) return false
  return CITIES.some(e => e.category === 'city' && e.name === name)
}

export async function findCityLocation(cityName: string): Promise<{ lat: number; lng: number } | undefined> {
  if (CITIES.length === 0) return undefined
  const city = CITIES.find(e => e.category === 'city' && e.name === cityName)
  return city ? { lat: city.lat, lng: city.lng } : undefined
}

export async function getPopularCities(): Promise<GeoEntry[]> {
  if (CITIES.length === 0) return []
  const POPULAR = [
    '北京', '上海', '广州', '深圳', '成都', '杭州', '重庆', '西安',
    '南京', '苏州', '长沙', '武汉', '厦门', '青岛', '三亚', '丽江',
    '大理', '拉萨', '桂林', '哈尔滨', '大连', '昆明', '洛阳', '张家界',
  ]
  return POPULAR
    .map(name => CITIES.find(e => e.category === 'city' && e.name === name))
    .filter(Boolean) as GeoEntry[]
}

export async function getAttractionsInCity(cityName: string): Promise<GeoEntry[]> {
  if (CITIES.length === 0) return []
  // 确保该城市所在省份已加载
  const slug = CITY_TO_SLUG.get(cityName)
  if (slug) await ensureProvinceLoaded(slug)
  const loaded = slug ? LOADED_PROVINCES.get(slug) : null
  if (!loaded) return []
  return loaded.data.filter(e => e.city === cityName && e.category !== 'city').slice(0, 8)
}

export async function getCityName(location: { lat: number; lng: number }): Promise<string> {
  if (CITIES.length === 0) return '未知'
  let closest = CITIES[0]
  let minDist = Infinity
  for (const entry of CITIES) {
    const dist = (entry.lat - location.lat) ** 2 + (entry.lng - location.lng) ** 2
    if (dist < minDist) { minDist = dist; closest = entry }
  }
  return closest?.name ?? '未知'
}
