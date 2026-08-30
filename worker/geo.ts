/**
 * 高德 Web 服务地理编码 — 纯函数模块
 * 被 worker/api/geo.ts (Vercel Edge Function) 调用
 *
 * POI 搜索 (/v3/place/text) 接口被 Amap 反爬虫策略封了（返回 HTML 惩罚页），
 * 改用 /v3/geocode/geo 接口：输入地名，输出坐标 + 级别（兴趣点/市/区县）
 */

export interface GeoEntry {
  name: string
  pinyin: string
  lat: number
  lng: number
  city?: string
  category: 'city' | 'attraction' | 'district'
}

export interface AmapGeocode {
  formatted_address?: string
  province?: string
  city?: string | string[]
  citycode?: string
  district?: string | string[]
  adcode?: string
  location?: string  // "lng,lat"
  level?: string  // 兴趣点 | 市 | 省 | 区县 | ...
}

interface AmapResponse {
  status?: string
  info?: string
  count?: string
  geocodes?: AmapGeocode[]
}

const MUNICIPALITIES = ['北京', '上海', '天津', '重庆']

function isMunicipality(pname: string): boolean {
  return MUNICIPALITIES.includes(pname)
}

function firstString(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] || ''
  return v || ''
}

/** 把高德 geocode/geo 返回的第一条结果转成 GeoEntry */
export function geocodeToEntry(geo: AmapGeocode, keyword: string): GeoEntry | null {
  if (!geo.location) return null
  const [lngStr, latStr] = geo.location.split(',')
  const lng = Number(lngStr)
  const lat = Number(latStr)
  if (!isFinite(lat) || !isFinite(lng)) return null

  const province = (geo.province || '').replace(/市$/, '').replace(/省$/, '')
  const cityname = firstString(geo.city).replace(/市$/, '')
  const district = firstString(geo.district)

  let city: string | undefined
  if (province && isMunicipality(province)) {
    city = province
  } else if (cityname) {
    city = cityname
  } else if (district) {
    city = district
  } else {
    city = undefined
  }

  const level = geo.level || ''
  let category: 'city' | 'attraction' | 'district'
  if (level === '兴趣点') {
    category = 'attraction'
  } else if (level === '市' || level === '省') {
    category = 'city'
  } else {
    category = 'district'
  }

  return {
    name: keyword,
    pinyin: '',
    lat, lng, city,
    category,
  }
}

/** 调高德 REST API 地理编码，返回 GeoEntry 或 null */
export async function queryAmap(keyword: string, key: string): Promise<GeoEntry | null> {
  const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(keyword)}&key=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`amap HTTP ${res.status}`)
  const body = await res.json() as AmapResponse
  if (body.status !== '1' || !body.geocodes?.length) return null
  const geo = pickBestGeocode(body.geocodes)
  return geocodeToEntry(geo, keyword)
}

/**
 * amap geocode 对重名会返回多条，第一条常常不是用户想要的（比如"什刹海"返回邯郸那条）
 * 启发式排序选最可能是用户本意的：
 * 1. 直辖市（北京/上海/天津/重庆）优先
 * 2. level="兴趣点"优先（> 住宅区/区县）
 * 3. formatted_address 短的优先（更核心）
 */
function pickBestGeocode(geocodes: AmapGeocode[]): AmapGeocode {
  const score = (g: AmapGeocode): number => {
    const province = (g.province || '').replace(/市$/, '').replace(/省$/, '')
    let s = 0
    if (province && isMunicipality(province)) s += 100
    if (g.level === '兴趣点') s += 10
    s -= (g.formatted_address || '').length
    return s
  }
  return [...geocodes].sort((a, b) => score(b) - score(a))[0]
}
