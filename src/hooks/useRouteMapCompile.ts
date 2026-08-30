import { useEffect, useRef, useState } from 'react'
import { compileTrip } from '../geo/compiler'
import { initGeoData, isGeoDataReady, ensureCitiesLoaded } from '../geo/search'
import type { Trip, RouteMap } from '../types'

/**
 * routeMap 异步计算：trip 变化时重跑 compileTrip
 * - 依赖 layoutSignature（仅 stop id+name+坐标+交通 + day 数量/顺序）
 *   改标题/日期/颜色/时间不触发重算
 * - 通过 tripRef 读最新 trip，避免 effect 把整个 trip 作依赖
 * - 行程涉及的省份分片按需加载（不预加载全量 21 万条 POI）
 */
export function useRouteMapCompile(trip: Trip): RouteMap | null {
  const tripRef = useRef(trip)
  useEffect(() => { tripRef.current = trip }, [trip])

  const layoutSignature = trip.days.map(d =>
    d.stops.map(s => `${s.id}:${s.name}:${s.location?.lat ?? 0}:${s.location?.lng ?? 0}:${s.transport ?? ''}`).join(',')
  ).join('|')
  // 城市签名：stop.city 变化时要重新加载省份分片
  const citySignature = trip.days.flatMap(d => d.stops.map(s => s.city).filter(Boolean).map(c => c as string)).join('|')

  const [routeMap, setRouteMap] = useState<RouteMap | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isGeoDataReady()) await initGeoData()
      // 加载行程涉及的省份分片（无坐标的 stop 才需要按 city 反查）
      const cities = tripRef.current.days.flatMap(d => d.stops.map(s => s.city).filter(Boolean) as string[])
      if (cities.length > 0) await ensureCitiesLoaded(cities)
      if (cancelled) return
      const map = await compileTrip(tripRef.current)
      if (!cancelled) setRouteMap(map)
    })()
    return () => { cancelled = true }
  }, [layoutSignature, citySignature])

  return routeMap
}
