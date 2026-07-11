import type { Trip, Day, Stop, TransportMode } from '../types'
import { DAY_COLORS } from './colors'
import { MODE_LABEL, MODE_ICON } from './transport'
import { findLocation, getCityName, findCityLocation } from '../geo/search'

const DEFAULT_LOCATION = { lat: 35.0, lng: 105.0 }

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/** FNV-1a 32-bit → 确定性坐标偏移，相同名称永远产生相同结果 */
function hashOffset(name: string, range = 0.05): { dlat: number; dlng: number } {
  let h = 2166136261
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  const dlat = (((h & 0xFFFF) / 0xFFFF) * 2 - 1) * range
  const dlng = ((((h >>> 16) & 0xFFFF) / 0xFFFF) * 2 - 1) * range
  return { dlat, dlng }
}

function parseStop(
  content: string,
  contextLoc?: { lat: number; lng: number },
  prevLoc?: { lat: number; lng: number },
): Stop {
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

  const name = rest.trim() || '新地点'
  const loc = findLocation(name)

  let location: { lat: number; lng: number }
  if (loc) {
    location = { lat: loc.lat, lng: loc.lng }
  } else if (prevLoc) {
    const { dlat, dlng } = hashOffset(name, 0.005)
    location = { lat: prevLoc.lat + dlat, lng: prevLoc.lng + dlng }
  } else if (contextLoc) {
    const { dlat, dlng } = hashOffset(name)
    location = { lat: contextLoc.lat + dlat, lng: contextLoc.lng + dlng }
  } else {
    location = DEFAULT_LOCATION
  }

  return { id: `stop-${uid()}`, name, startTime, location, transport }
}

export function markdownToTrip(md: string): Trip {
  const trip: Trip = {
    id: `trip-${uid()}`,
    title: '我的旅行',
    startDate: new Date().toISOString().slice(0, 10),
    days: [],
  }

  let currentDay: Day | null = null
  let contextLoc: { lat: number; lng: number } | undefined
  let prevStopLoc: { lat: number; lng: number } | undefined

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
      currentDay = { id: `day-${uid()}`, color, stops: [] }
    } else if (line.startsWith('- ') && currentDay) {
      const stop = parseStop(line.slice(2), contextLoc, prevStopLoc)
      if (stop.location !== DEFAULT_LOCATION) {
        prevStopLoc = stop.location
        const cityLoc = findCityLocation(getCityName(stop.location))
        if (cityLoc) contextLoc = cityLoc
      }
      currentDay.stops.push(stop)
    }
  }

  if (currentDay) trip.days.push(currentDay)
  if (trip.days.length === 0) {
    trip.days = [{ id: `day-${uid()}`, color: DAY_COLORS[0], stops: [] }]
  }
  return trip
}
