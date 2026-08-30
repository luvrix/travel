import { useEffect, useRef } from 'react'
import { findLocation, initGeoData, isGeoDataReady, ensureCitiesLoaded } from '../geo/search'
import { searchAmap } from '../geo/amap'
import type { Trip, Stop } from '../types'
import type { ToastApi } from '../components/Toast'

/**
 * 高德补全：本地 DB 未命中的 stop 按需查高德 JS SDK
 * - effect 依赖 stopSignature（仅 stop id+name），改时间/颜色/拖拽顺序不重跑
 * - 命中本地 DB 或高德确认查不到都标记，避免反复请求
 * - 高德网络/SDK 错误不标记，下次 effect 重跑会重试，并 toast 提示
 */
export function useAmapEnrichment(
  trip: Trip,
  setTrip: React.Dispatch<React.SetStateAction<Trip>>,
  toast: ToastApi,
) {
  const enrichedStopIdsRef = useRef<Set<string>>(new Set())
  // 用 ref 持有 trip.days，effect 只依赖 stop 的 id+name 签名
  // 这样改时间/颜色/拖拽顺序等不触发 effect 重跑，只有 stop 集合本身变化才重跑
  const tripDaysRef = useRef(trip.days)
  useEffect(() => { tripDaysRef.current = trip.days }, [trip.days])

  const stopSignature = trip.days.flatMap(d => d.stops.map(s => `${s.id}:${s.name}`)).join('|')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isGeoDataReady()) await initGeoData()
      if (cancelled) return
      // 预加载行程涉及的省份分片 — 让 findLocation 能命中本地 DB
      const cities = tripDaysRef.current
        .flatMap(d => d.stops.map(s => s.city).filter(Boolean) as string[])
      if (cities.length > 0) await ensureCitiesLoaded(cities)
      if (cancelled) return
      const unknownStops: Stop[] = []
      for (const day of tripDaysRef.current) {
        for (const stop of day.stops) {
          if (!stop.name || stop.name === '新地点') continue
          if (enrichedStopIdsRef.current.has(stop.id)) continue
          // 用户手动给坐标（@lat,lng 导入）— 不再调 amap，避免 worker 坐标覆盖精确定位
          if (stop.amapResolved) {
            enrichedStopIdsRef.current.add(stop.id)
            continue
          }
          if (await findLocation(stop.name)) {
            enrichedStopIdsRef.current.add(stop.id)
            continue
          }
          unknownStops.push(stop)
        }
      }
      if (unknownStops.length === 0) return

      const failedStops: string[] = []
      for (const stop of unknownStops) {
        if (cancelled) return
        try {
          const entry = await searchAmap(stop.name)
          if (cancelled) return
          // 无论 entry 是否为 null 都标记（高德确认查不到，重试也是 null）
          enrichedStopIdsRef.current.add(stop.id)
          if (!entry) continue
          setTrip(prev => ({
            ...prev,
            days: prev.days.map(d => ({
              ...d,
              stops: d.stops.map(s => s.id === stop.id
                ? { ...s, location: { lat: entry.lat, lng: entry.lng }, city: entry.city, amapResolved: true }
                : s),
            })),
          }))
        } catch {
          // 网络/SDK 错误，不标记，下次 effect 重跑会重试
          failedStops.push(stop.name)
        }
      }
      if (failedStops.length && !cancelled) {
        const sample = failedStops.slice(0, 3).join('、')
        toast.show(`高德查询失败 ${failedStops.length} 个（${sample}），稍后自动重试`)
      }
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在 stopSignature（id+name）变化时重跑，trip 整体引用变化不触发
  }, [stopSignature])
}
