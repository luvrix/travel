import { Document } from 'flexsearch'
import GEO_DATA, { type GeoEntry } from '../data/geo'

// 逐字符分词：中文每个汉字独立 token，英文/拼音按整词
function encode(str: string): string[] {
  const tokens: string[] = []
  const lower = str.toLowerCase()
  // 提取中文字符（每个汉字单独作为 token）
  for (const char of lower) {
    if (/[一-鿿㐀-䶿]/.test(char)) tokens.push(char)
  }
  // 提取连续的拼音/英文片段
  const latin = lower.match(/[a-z0-9]+/g)
  if (latin) tokens.push(...latin)
  return tokens
}

// 搜索用的扁平文档（id = GEO_DATA 下标）
type IdxDoc = { _id: number; name: string; pinyin: string; city: string; alias: string }

const idxDocs: IdxDoc[] = GEO_DATA.map((e, i) => ({
  _id: i,
  name: e.name,
  pinyin: e.pinyin,
  city: e.city,
  alias: e.aliases?.join(' ') ?? '',
}))

const idx = new Document<IdxDoc>({
  document: {
    id: '_id',
    index: [
      { field: 'name',   resolution: 9 },
      { field: 'alias',  resolution: 7 },
      { field: 'pinyin', resolution: 5 },
      { field: 'city',   resolution: 3 },
    ],
  },
  encode,
})

for (const doc of idxDocs) idx.add(doc)

export function searchLocation(query: string, limit = 5): GeoEntry[] {
  const results = idx.search(query, limit * 2)
  const seen = new Set<number>()
  const out: GeoEntry[] = []
  for (const { result } of results) {
    for (const id of result as number[]) {
      if (seen.has(id)) continue
      seen.add(id)
      out.push(GEO_DATA[id])
      if (out.length >= limit) return out
    }
  }
  return out
}

export function findLocation(name: string): GeoEntry | undefined {
  if (!name || name === '新地点') return undefined
  const exact = GEO_DATA.find(e => e.name === name || e.aliases?.includes(name))
  if (exact) return exact
  // 只接受数据库条目名称包含查询词的方向，避免短名条目误匹配长自定义名称
  const candidates = searchLocation(name, 5)
  return candidates.find(e => e.category !== 'city' && e.name.includes(name))
}

export function isExactCityName(name: string): boolean {
  return GEO_DATA.some(e => e.category === 'city' && (e.name === name || (e.aliases?.includes(name) ?? false)))
}

export function findCityLocation(cityName: string): { lat: number; lng: number } | undefined {
  const city = GEO_DATA.find(e => e.category === 'city' && e.name === cityName)
  return city ? { lat: city.lat, lng: city.lng } : undefined
}

const POPULAR_CITIES = [
  '北京', '上海', '广州', '深圳', '成都', '杭州', '重庆', '西安',
  '南京', '苏州', '长沙', '武汉', '厦门', '青岛', '三亚', '丽江',
  '大理', '拉萨', '桂林', '哈尔滨', '大连', '昆明', '洛阳', '张家界',
]

export function getPopularCities(): GeoEntry[] {
  return POPULAR_CITIES
    .map(name => GEO_DATA.find(e => e.category === 'city' && e.name === name))
    .filter(Boolean) as GeoEntry[]
}

export function getAttractionsInCity(cityName: string): GeoEntry[] {
  return GEO_DATA.filter(e => e.city === cityName && e.category !== 'city').slice(0, 8)
}

export function getCityName(location: { lat: number; lng: number }): string {
  const cities = GEO_DATA.filter(e => e.category === 'city')
  let closest = cities[0]
  let minDist = Infinity
  for (const entry of cities) {
    const dist = (entry.lat - location.lat) ** 2 + (entry.lng - location.lng) ** 2
    if (dist < minDist) { minDist = dist; closest = entry }
  }
  return closest?.name ?? '未知'
}

export function locationForUnknown(
  name: string,
  contextLoc: { lat: number; lng: number },
  range = 0.05,
): { lat: number; lng: number } {
  let h = 2166136261
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  const dlat = (((h & 0xFFFF) / 0xFFFF) * 2 - 1) * range
  const dlng = ((((h >>> 16) & 0xFFFF) / 0xFFFF) * 2 - 1) * range
  return { lat: contextLoc.lat + dlat, lng: contextLoc.lng + dlng }
}
