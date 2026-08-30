import type { Trip, RouteMap, RouteDay, RouteNode, RouteEdge, TransportMode } from '../types'
import { findCityLocation, getCityName, isExactCityName } from './search'
import { uid } from '../lib/uid'

type Loc = { lat: number; lng: number }

/** blink 不是真正的出行方式，统一在这里剥离 */
function realTransport(t: TransportMode | undefined): TransportMode | undefined {
  return t === 'blink' ? undefined : t
}

/** 占位 stop：未命名或未定位，编译时跳过 */
function isPlaceholderStop(stop: { name: string; location?: Loc }): boolean {
  return stop.name === '新地点' || !stop.location
}

function ensureNode(
  map: Map<string, RouteNode>,
  id: string, name: string, type: 'attraction' | 'city' | 'combo',
  location: Loc,
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
    id: uid('edge'),
    sourceId, targetId, line, dash, color,
    icon,
    dayIndex,
  }
}

function locKey(loc: Loc): string {
  return `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`
}

export async function compileTrip(trip: Trip): Promise<RouteMap> {
  const nodeMap = new Map<string, RouteNode>()
  const edges: RouteEdge[] = []
  const routeDays: RouteDay[] = []
  const stopIdToNodeId = new Map<string, string>()

  const filteredDays = trip.days.map(d => ({
    ...d,
    stops: d.stops.filter(s => !isPlaceholderStop(s)),
  }))
  const allStops = filteredDays.flatMap((d, di) => d.stops.map(s => ({ ...s, dayIndex: di })))

  // 1. 并行批量解析：每个 stop 的城市 + 每个 stop.name 是否是城市名
  //    （search.ts 的函数都是 in-memory 的假 async，但保持 Promise.all 批处理
  //    让结构清晰，且未来若换成真 DB 查询自动受益）
  const locsNeedingCity = new Map<string, Loc>()   // locKey -> loc（无 stop.city 的）
  const namesToCheck = new Set<string>()            // 所有 stop.name（判 isExactCity）
  for (const stop of allStops) {
    if (!stop.city) locsNeedingCity.set(locKey(stop.location!), stop.location!)
    namesToCheck.add(stop.name)
  }

  const [locCityPairs, nameCityFlags] = await Promise.all([
    Promise.all(
      [...locsNeedingCity.entries()].map(
        async ([key, loc]) => [key, await getCityName(loc)] as const,
      ),
    ),
    Promise.all(
      [...namesToCheck].map(
        async name => [name, await isExactCityName(name)] as const,
      ),
    ),
  ])

  const locKeyToCity = new Map<string, string>(locCityPairs)
  const isCityName = new Map<string, boolean>(nameCityFlags)

  const stopCityName = new Map<string, string>()
  for (const stop of allStops) {
    const loc = stop.location!
    const city = stop.city ?? locKeyToCity.get(locKey(loc))!
    stopCityName.set(stop.id, city)
  }

  // 2. 并行查所有城市的坐标
  const uniqueCities = new Set(stopCityName.values())
  const cityLocPairs = await Promise.all(
    [...uniqueCities].map(
      async city => [city, await findCityLocation(city)] as const,
    ),
  )

  const cityNodeIdMap = new Map<string, string>()
  for (const [city, cityLoc] of cityLocPairs) {
    // findCityLocation 查不到时，用该城市下任一 stop 的坐标兜底
    const fallback = allStops.find(s => stopCityName.get(s.id) === city)!.location!
    const cityId = `city-${city}`
    ensureNode(nodeMap, cityId, city, 'city', cityLoc ?? fallback)
    cityNodeIdMap.set(city, cityId)
  }

  // 3. 为有景点的城市创建 combo 容器
  const cityComboIdMap = new Map<string, string>()
  for (const stop of allStops) {
    if (isCityName.get(stop.name)) continue
    const city = stopCityName.get(stop.id)!
    if (!cityComboIdMap.has(city)) {
      const comboId = `combo-${city}`
      const cityId = cityNodeIdMap.get(city)!
      ensureNode(nodeMap, comboId, city, 'combo', nodeMap.get(cityId)!.location)
      cityComboIdMap.set(city, comboId)
    }
  }

  // 4. 创建景点节点（去重：同名同坐标）
  const nodeIndex = new Map<string, string>()
  for (const stop of allStops) {
    if (isCityName.get(stop.name)) {
      stopIdToNodeId.set(stop.id, cityNodeIdMap.get(stopCityName.get(stop.id)!)!)
      continue
    }
    const city = stopCityName.get(stop.id)!
    const comboId = cityComboIdMap.get(city)
    const loc = stop.location!
    const dedupeKey = `${stop.name}|${loc.lat.toFixed(4)}|${loc.lng.toFixed(4)}`

    let nodeId = nodeIndex.get(dedupeKey)
    if (!nodeId) {
      nodeId = ensureNode(nodeMap, stop.id, stop.name, 'attraction', loc, comboId, stop.startTime || undefined)
      nodeIndex.set(dedupeKey, nodeId)
    }
    stopIdToNodeId.set(stop.id, nodeId)
  }

  // 5. 创建边
  const cityHops: { from: string; to: string; dayIndex: number; transport: TransportMode | undefined }[] = []
  let lastCity: string | null = null
  for (const stop of allStops) {
    const city = stopCityName.get(stop.id)!
    if (lastCity !== null && city !== lastCity) {
      cityHops.push({ from: lastCity, to: city, dayIndex: stop.dayIndex, transport: realTransport(stop.transport) })
    }
    lastCity = city
  }

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

  for (let i = 1; i < allStops.length; i++) {
    const prev = allStops[i - 1]
    const curr = allStops[i]
    const prevCity = stopCityName.get(prev.id)!
    const currCity = stopCityName.get(curr.id)!

    if (prevCity !== currCity) continue
    const prevNodeId = stopIdToNodeId.get(prev.id)!
    const currNodeId = stopIdToNodeId.get(curr.id)!
    const prevCityId = cityNodeIdMap.get(prevCity)!
    if (prevNodeId === prevCityId || currNodeId === prevCityId) continue

    const t = realTransport(curr.transport)
    const edgeDash = t && (['bus', 'car'] as TransportMode[]).includes(t) ? 'dashed' : 'solid'
    const color = trip.days[curr.dayIndex].color
    edges.push(makeEdge(prevNodeId, currNodeId, 'straight', edgeDash, color, t, curr.dayIndex))
  }

  // 6. 构建 routeDays
  for (let di = 0; di < filteredDays.length; di++) {
    const day = filteredDays[di]
    const dayNodeIds: string[] = []
    for (const stop of day.stops) {
      if (isCityName.get(stop.name)) {
        const cityId = cityNodeIdMap.get(stopCityName.get(stop.id)!)!
        if (!dayNodeIds.includes(cityId)) dayNodeIds.push(cityId)
      } else {
        dayNodeIds.push(stopIdToNodeId.get(stop.id)!)
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
