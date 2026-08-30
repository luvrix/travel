/* eslint-disable no-irregular-whitespace -- 行程文本含全角空格（U+3000），是小程序导出格式 */
import type { Trip, Day, TransportMode } from '../types'
import { DAY_COLORS } from './colors'
import { MODE_LABEL, MODE_ICON } from './transport'
import { findLocation, ensureCitiesLoaded } from '../geo/search'
import { uid } from './uid'

type Loc = { lat: number; lng: number }

// 检测行尾 ` @lat,lng` 后缀 — 嵌入式坐标，跳过 findLocation/amap，保证跨设备复现一致
// 例：「景山公园 @39.9244,116.3904」→ name=景山公园, location={39.9244,116.3904}
// 非贪婪匹配 name 部分，允许名字本身含 @（只要后面不跟 数字,数字 就不匹配）
const COORD_SUFFIX_RE = /^(.+?)\s+@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\s*$/

// 检测行尾 ` #city` 后缀 — 城市字段直接从 markdown 读，不查 DB，跨 DB 版本稳定
const CITY_SUFFIX_RE = /\s+#(\S+)\s*$/

async function parseLine(content: string): Promise<{ name: string; startTime: string; transport: TransportMode | undefined; location: Loc | undefined; city?: string; amapResolved?: boolean }> {
  let rest = content
  let startTime = ''
  let transport: TransportMode | undefined

  const timeMatch = rest.match(/^(\d{1,2}:\d{2})[　\s]+/)
  if (timeMatch) {
    const [h, m] = timeMatch[1].split(':')
    startTime = `${h.padStart(2, '0')}:${m}`
    rest = rest.slice(timeMatch[0].length)
  }

  for (const [mode, label] of Object.entries(MODE_LABEL)) {
    if (!label || label === '闪现') continue
    if (rest.startsWith(label + ' ') || rest.startsWith(label + '　')) {
      transport = mode as TransportMode; rest = rest.slice(label.length).trimStart(); break
    }
  }
  if (!transport) {
    for (const [mode, icon] of Object.entries(MODE_ICON)) {
      if (!icon || icon === '→') continue
      if (rest.startsWith(icon + ' ') || rest.startsWith(icon + '　')) {
        transport = mode as TransportMode; rest = rest.slice(icon.length).trimStart(); break
      }
    }
  }

  // 先剥离行尾 #city 后缀（独立于 @lat,lng：没坐标的 stop 也能带城市）
  // 例：「高铁 杭州 #杭州」「故宫 @39.917,116.390 #北京」两种格式都支持
  let cityFromMd: string | undefined
  const cityMatch = rest.match(CITY_SUFFIX_RE)
  if (cityMatch) {
    cityFromMd = cityMatch[1]
    rest = rest.slice(0, cityMatch.index).trimEnd()
  }

  // 行尾 @lat,lng 嵌入坐标 — 直接用，不查本地 DB / 不调高德
  // cityFromMd 已存在时不查 DB；否则按坐标消歧查 DB 拿 city（58 条同名「西湖」选最近那条）
  const coordMatch = rest.match(COORD_SUFFIX_RE)
  if (coordMatch) {
    const name = coordMatch[1].trim() || '新地点'
    const lat = parseFloat(coordMatch[2])
    const lng = parseFloat(coordMatch[3])
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const entry = cityFromMd ? undefined : await findLocation(name, { lat, lng })
      return {
        name, startTime, transport,
        location: { lat, lng },
        city: cityFromMd ?? entry?.city,
        amapResolved: true,
      }
    }
  }

  const name = rest.trim() || '新地点'
  const loc = await findLocation(name)
  // 本地命中：用真实坐标；未命中：留空，交给 enrichment effect 用高德补全
  // cityFromMd 优先于 loc.city（用户手写覆盖 DB 查询结果）
  return {
    name, startTime, transport,
    location: loc ? { lat: loc.lat, lng: loc.lng } : undefined,
    city: cityFromMd ?? loc?.city,
  }
}

export async function markdownToTrip(md: string): Promise<Trip> {
  const trip: Trip = {
    id: uid('trip'),
    title: '我的旅行',
    startDate: new Date().toISOString().slice(0, 10),
    days: [],
  }

  // 预扫描：提取所有 #city 后缀，预加载对应省份分片
  // 让 parseLine 的 findLocation 能命中本地 DB（不依赖 amap 兜底）
  const cities: string[] = []
  for (const rawLine of md.split('\n')) {
    const line = rawLine.trim()
    if (!line.startsWith('- ')) continue
    const m = line.match(/\s+#(\S+)\s*$/)
    if (m) cities.push(m[1])
  }
  if (cities.length > 0) {
    try { await ensureCitiesLoaded(cities) } catch { /* 加载失败不阻塞解析 */ }
  }

  let currentDay: Day | null = null

  for (const rawLine of md.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('# ')) {
      trip.title = line.slice(2).trim()
    } else if (/^📅/.test(line) || /^\d{4}-\d{2}-\d{2}$/.test(line)) {
      const d = line.replace(/^📅\s*/, '').trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) trip.startDate = d
    } else if (/^## Day/i.test(line)) {
      if (currentDay) trip.days.push(currentDay)
      const color = DAY_COLORS[trip.days.length % DAY_COLORS.length]
      currentDay = { id: uid('day'), color, stops: [] }
    } else if (line.startsWith('- ')) {
      // 遇到 - 但还没有 Day，自动创建 Day 1（避免静默丢弃用户内容）
      if (!currentDay) {
        const color = DAY_COLORS[trip.days.length % DAY_COLORS.length]
        currentDay = { id: uid('day'), color, stops: [] }
      }
      const parsed = await parseLine(line.slice(2))
      currentDay.stops.push({ id: uid('stop'), ...parsed })
    }
  }

  if (currentDay) trip.days.push(currentDay)
  if (trip.days.length === 0) {
    trip.days = [{ id: uid('day'), color: DAY_COLORS[0], stops: [] }]
  }
  return trip
}

/** Trip → Markdown，格式与 markdownToTrip 输入对称，可回导
 *
 * 坐标嵌入：stop.location 存在时，名字后追加 ` @lat,lng`（6 位小数）
 * 城市嵌入：stop.city 存在时，再追加 ` #city`，让 city 字段也 round-trip 一致
 * - 跨设备/跨用户复现一致（不依赖 amap 或本地 DB 命中）
 * - 解决同名 POI 歧义（如「景山公园」在东莞+北京都有，靠坐标消歧）
 * - 解决本地库未收录的 POI（如「前门大街」「平江路」用 @lat,lng 直接定位）
 * - #city 让 city 跨 DB 版本稳定（DB 升级改 city 字段不影响导出再导入）
 */
export function tripToMarkdown(trip: Trip): string {
  const lines: string[] = [`# ${trip.title}`]
  if (trip.startDate) lines.push(trip.startDate)
  lines.push('')

  trip.days.forEach((day, i) => {
    lines.push(`## Day ${i + 1}`)
    for (const stop of day.stops) {
      // 跳过空字符串 — 避免 '- 09:00' 被空 join 变成 '-  09:00'（双空格，破坏 round-trip）
      const parts: string[] = ['-']
      if (stop.startTime) parts.push(stop.startTime)
      if (stop.transport) parts.push(MODE_LABEL[stop.transport])
      let label = stop.name || '新地点'
      if (stop.location) {
        label += ` @${stop.location.lat.toFixed(6)},${stop.location.lng.toFixed(6)}`
      }
      if (stop.city) {
        label += ` #${stop.city}`
      }
      parts.push(label)
      lines.push(parts.join(' '))
    }
    lines.push('')
  })

  return lines.join('\n').trimEnd() + '\n'
}

