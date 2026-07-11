import type { Trip, RouteMap, RouteDay, RouteNode, RouteEdge, TransportMode } from '../types'
import { findCityLocation, getCityName, isExactCityName, findLocation, locationForUnknown } from './search'


function isCityName(name: string): boolean {
  return isExactCityName(name)
}

function isPlaceholderStop(stop: { name: string; location: { lat: number; lng: number } }): boolean {
  // 名字是"新地点"且坐标是默认值才过滤
  // 如果用户的"新地点"有自定义坐标，说明已经有地理位置，不应过滤
  return stop.name === '新地点' && stop.location.lat === 35.0 && stop.location.lng === 105.0
}

function ensureNode(
  map: Map<string, RouteNode>,
  id: string, name: string, type: 'attraction' | 'city' | 'combo',
  location: { lat: number; lng: number },
  parentId?: string,
  time?: string,
): string {
  if (!map.has(id)) {
    map.set(id, { id, name, type, location, position: { x: 0, y: 0 }, parentId, time })
  }
  return id
}

function makeEdge(
  sourceId: string, targetId: string,
  line: 'straight' | 'arc', dash: 'solid' | 'dashed',
  color: string, icon: TransportMode | undefined, dayIndex: number,
): RouteEdge {
  return {
    id: `edge-${sourceId}-${targetId}-${dayIndex}-${Math.random().toString(36).slice(2, 6)}`,
    sourceId, targetId, line, dash, color,
    icon: icon ?? undefined,
    dayIndex,
  }
}

export function compileTrip(trip: Trip): RouteMap {
  const nodeMap = new Map<string, RouteNode>()
  const edges: RouteEdge[] = []
  const routeDays: RouteDay[] = []
  const stopIdToNodeId = new Map<string, string>()

  // 过滤掉未配置的占位 stop（名称为"新地点"且坐标是默认值）
  const filteredDays = trip.days.map(d => ({
    ...d,
    stops: d.stops.filter(s => !isPlaceholderStop(s)),
  }))

  // 1. 确定每个 stop 属于哪个城市，创建城市 pin 节点
  const stopCityName = new Map<string, string>()
  const cityNodeIdMap = new Map<string, string>()
  const stopLocationOverride = new Map<string, { lat: number; lng: number }>()

  let lastKnownCity: string | undefined
  for (const day of filteredDays) {
    for (const stop of day.stops) {
      const isKnown = isCityName(stop.name) || findLocation(stop.name) !== undefined
      const city = isKnown ? getCityName(stop.location) : (lastKnownCity ?? getCityName(stop.location))
      if (isKnown) lastKnownCity = city
      stopCityName.set(stop.id, city)

      if (!cityNodeIdMap.has(city)) {
        const cityId = `city-${city}`
        const cityLocation = findCityLocation(city) ?? stop.location
        ensureNode(nodeMap, cityId, city, 'city', cityLocation)
        cityNodeIdMap.set(city, cityId)
      }
    }
  }

  const allStopsFlat = filteredDays.flatMap(d => d.stops)
  for (let i = 0; i < allStopsFlat.length; i++) {
    const stop = allStopsFlat[i]
    if (isCityName(stop.name) || findLocation(stop.name) !== undefined) continue
    const city = stopCityName.get(stop.id)!

    let prevLoc: { lat: number; lng: number } | undefined
    for (let j = i - 1; j >= 0; j--) {
      const s = allStopsFlat[j]
      if (stopCityName.get(s.id) !== city) break
      if (!isCityName(s.name) && findLocation(s.name) !== undefined) { prevLoc = s.location; break }
    }
    let nextLoc: { lat: number; lng: number } | undefined
    for (let j = i + 1; j < allStopsFlat.length; j++) {
      const s = allStopsFlat[j]
      if (stopCityName.get(s.id) !== city) break
      if (!isCityName(s.name) && findLocation(s.name) !== undefined) { nextLoc = s.location; break }
    }

    let anchor: { lat: number; lng: number }
    if (prevLoc && nextLoc) {
      const dist = Math.sqrt((prevLoc.lat - nextLoc.lat) ** 2 + (prevLoc.lng - nextLoc.lng) ** 2)
      anchor = dist < 0.1
        ? { lat: (prevLoc.lat + nextLoc.lat) / 2, lng: (prevLoc.lng + nextLoc.lng) / 2 }
        : prevLoc
    } else {
      anchor = prevLoc ?? nextLoc ?? findCityLocation(city) ?? { lat: 35.0, lng: 105.0 }
    }
    stopLocationOverride.set(stop.id, locationForUnknown(stop.name, anchor, 0.002))
  }

  // 2. 为有景点的城市创建 combo 容器
  const cityComboIdMap = new Map<string, string>()
  for (const day of filteredDays) {
    for (const stop of day.stops) {
      const city = stopCityName.get(stop.id)!
      if (isCityName(stop.name)) continue

      if (!cityComboIdMap.has(city)) {
        const comboId = `combo-${city}`
        const cityId = cityNodeIdMap.get(city)!
        ensureNode(nodeMap, comboId, city, 'combo', nodeMap.get(cityId)!.location)
        cityComboIdMap.set(city, comboId)
      }
    }
  }

  // 3. 创建景点节点
  for (const day of filteredDays) {
    for (const stop of day.stops) {
      if (isCityName(stop.name)) {
        stopIdToNodeId.set(stop.id, cityNodeIdMap.get(stopCityName.get(stop.id)!)!)
        continue
      }

      const city = stopCityName.get(stop.id)!
      const comboId = cityComboIdMap.has(city) ? cityComboIdMap.get(city)! : undefined

      const loc = stopLocationOverride.get(stop.id) ?? stop.location
      let nodeId: string | null = null
      for (const [, existing] of nodeMap) {
        if (existing.name === stop.name &&
          existing.location.lat.toFixed(4) === loc.lat.toFixed(4) &&
          existing.location.lng.toFixed(4) === loc.lng.toFixed(4)) {
          nodeId = existing.id
          break
        }
      }

      if (!nodeId) {
        nodeId = ensureNode(nodeMap, stop.id, stop.name, 'attraction', loc, comboId, stop.startTime || undefined)
        if (stopLocationOverride.has(stop.id)) {
          nodeMap.get(nodeId)!.isCustom = true
        }
      }
      stopIdToNodeId.set(stop.id, nodeId)
    }
  }

  // 4. 创建边
  //    两种边：
  //    - 城市间弧线：跨城市时自动推导，只画 city → city
  //    - 景点间直线：同城市内景点直连
  //    景点不出现在城市连线上，只在子图内部
  //
  //    例：东方明珠(上海) → 故宫(北京)
  //      城市连线：上海 → 北京（弧线）
  //      子图内部：东方明珠（上海子图），故宫（北京子图）
  //
  //    例：东方明珠(上海) → 故宫(北京) → 上海
  //      城市连线：上海 → 北京 → 上海（两条弧线）
  //      子图内部：东方明珠（上海子图），故宫（北京子图）
  const allStops = filteredDays.flatMap((day, di) => day.stops.map(s => ({ ...s, dayIndex: di })))

  // 4a. 收集城市间跳转序列（去重相邻同城市）
  const cityHops: { from: string; to: string; dayIndex: number; transport: TransportMode | undefined }[] = []
  let lastCity: string | null = null

  for (const stop of allStops) {
    const city = stopCityName.get(stop.id)!
    if (lastCity !== null && city !== lastCity) {
      const transport = stop.transport === 'blink' ? undefined : stop.transport
      cityHops.push({ from: lastCity, to: city, dayIndex: stop.dayIndex, transport })
    }
    lastCity = city
  }

  // 4b. 创建城市间弧线边（同方向去重：上海→北京 只画一次）
  const seenDirections = new Set<string>()
  for (const hop of cityHops) {
    const dirKey = `${hop.from}->${hop.to}`
    if (seenDirections.has(dirKey)) continue
    seenDirections.add(dirKey)
    const fromId = cityNodeIdMap.get(hop.from)!
    const toId = cityNodeIdMap.get(hop.to)!
    const color = trip.days[hop.dayIndex].color
    edges.push(makeEdge(fromId, toId, 'arc', 'dashed', color, hop.transport, hop.dayIndex))
  }

  // 4c. 创建同城市内景点间直线边
  for (let i = 1; i < allStops.length; i++) {
    const prev = allStops[i - 1]
    const curr = allStops[i]

    const prevCity = stopCityName.get(prev.id)!
    const currCity = stopCityName.get(curr.id)!

    if (prevCity === currCity) {
      const prevNodeId = stopIdToNodeId.get(prev.id)!
      const currNodeId = stopIdToNodeId.get(curr.id)!
      const prevCityId = cityNodeIdMap.get(prevCity)!

      // 只有两个都是景点时才画直线（城市 pin 之间不画直线）
      if (prevNodeId !== prevCityId && currNodeId !== prevCityId) {
        const rawTransport = curr.transport === 'blink' ? undefined : curr.transport
        const edgeDash = rawTransport && (['bus', 'car'] as TransportMode[]).includes(rawTransport) ? 'dashed' : 'solid'
        const color = trip.days[curr.dayIndex].color
        edges.push(makeEdge(prevNodeId, currNodeId, 'straight', edgeDash, color, rawTransport, curr.dayIndex))
      }
    }
  }

  // 5. 构建 routeDays
  for (let di = 0; di < filteredDays.length; di++) {
    const day = filteredDays[di]
    const dayNodeIds: string[] = []

    for (const stop of day.stops) {
      const nodeId = stopIdToNodeId.get(stop.id)!
      const city = stopCityName.get(stop.id)!

      if (isCityName(stop.name)) {
        const cityId = cityNodeIdMap.get(city)!
        if (!dayNodeIds.includes(cityId)) dayNodeIds.push(cityId)
      } else {
        dayNodeIds.push(nodeId)
      }
    }

    routeDays.push({ dayIndex: di, color: day.color, nodeIds: dayNodeIds })
  }

  return {
    title: trip.title,
    startDate: trip.startDate,
    days: routeDays,
    nodes: Array.from(nodeMap.values()),
    edges,
  }
}
