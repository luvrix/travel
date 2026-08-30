import { useEffect, useRef, useState } from 'react'
import { DEMO_TRIP } from '../lib/demo-data'
import { uid } from '../lib/uid'
import type { Trip } from '../types'
import type { ToastApi } from '../components/Toast'

const STORAGE_KEY = 'travel_trip'

/**
 * 行程持久化：localStorage 加载 + 自动保存
 * - 启动时从 localStorage 反序列化 trip，修复跨 session 重复 stop ID
 * - trip 变化时自动写回
 * - 持续失败（隐私模式/磁盘满）只 toast 一次避免刷屏
 */
export function useTripPersistence(toast: ToastApi): [Trip, React.Dispatch<React.SetStateAction<Trip>>] {
  const [trip, setTrip] = useState<Trip>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const t = JSON.parse(saved) as Trip
        // 修复跨 session 的重复 stop ID（旧数据 uid() 从固定值 1000 开始会重复）
        const seenIds = new Set<string>()
        t.days.forEach(d => {
          d.stops.forEach(s => {
            if (seenIds.has(s.id)) s.id = uid('stop')
            seenIds.add(s.id)
          })
        })
        return t
      }
    } catch { /* ignore */ }
    return { ...DEMO_TRIP, startDate: new Date().toISOString().slice(0, 10) }
  })

  const saveFailedRef = useRef(false)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trip))
    } catch {
      if (!saveFailedRef.current) {
        saveFailedRef.current = true
        toast.show('自动保存失败（可能隐私模式），行程不会保留')
      }
    }
  }, [trip, toast])

  return [trip, setTrip]
}
