export interface GeoEntry {
  name: string
  pinyin: string
  lat: number
  lng: number
  /** 城市名（无"市"后缀，如"杭州"）。amap 补全且无法确定城市时为 undefined */
  city?: string
  category: 'city' | 'attraction' | 'district'
  /** 省份分片 slug（拼音 URL-safe），仅 city 类条目有，用于按需加载该省 POI 分片 */
  province_slug?: string
}
