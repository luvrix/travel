import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTripPersistence } from './useTripPersistence'
import type { ToastApi } from '../components/Toast'
import type { Trip } from '../types'

const mockToast: ToastApi = {
  show: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-test',
  title: '测试行程',
  startDate: '2026-01-01',
  days: [{
    id: 'day-1',
    color: '#3b82f6',
    stops: [{
      id: 'stop-1',
      name: '北京',
      startTime: '09:00',
      location: { lat: 39.9, lng: 116.4 },
    }],
  }],
  ...overrides,
})

describe('useTripPersistence', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('初次加载无 localStorage → 返回 DEMO_TRIP', () => {
    const { result } = renderHook(() => useTripPersistence(mockToast))
    expect(result.current[0].title).toBeTruthy()
    expect(result.current[0].days.length).toBeGreaterThan(0)
    expect(result.current[0].startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('localStorage 有数据 → 返回解析后 trip', () => {
    const saved = makeTrip({ title: '我的行程' })
    localStorage.setItem('travel_trip', JSON.stringify(saved))
    const { result } = renderHook(() => useTripPersistence(mockToast))
    expect(result.current[0].title).toBe('我的行程')
    expect(result.current[0].id).toBe('trip-test')
  })

  it('跨 session 重复 stop ID → 自动重新生成避免冲突', () => {
    const saved: Trip = {
      id: 'trip-x',
      title: '重复 ID 行程',
      startDate: '2026-01-01',
      days: [
        { id: 'day-1', color: 'red', stops: [{ id: 'stop-dup', name: 'A', startTime: '' }] },
        { id: 'day-2', color: 'blue', stops: [{ id: 'stop-dup', name: 'B', startTime: '' }] },
      ],
    }
    localStorage.setItem('travel_trip', JSON.stringify(saved))

    const { result } = renderHook(() => useTripPersistence(mockToast))
    const ids = result.current[0].days.flatMap(d => d.stops.map(s => s.id))
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length) // 无重复
  })

  it('trip 变化 → 自动写回 localStorage', () => {
    const { result } = renderHook(() => useTripPersistence(mockToast))
    act(() => {
      result.current[1]({ ...result.current[0], title: '改标题' })
    })
    const saved = JSON.parse(localStorage.getItem('travel_trip')!) as Trip
    expect(saved.title).toBe('改标题')
  })

  it('localStorage 写入失败 → toast.show 触发一次（saveFailedRef 防刷屏）', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    const { result } = renderHook(() => useTripPersistence(mockToast))
    act(() => {
      result.current[1]({ ...result.current[0], title: '改1' })
    })
    act(() => {
      result.current[1]({ ...result.current[0], title: '改2' })
    })

    expect(mockToast.show).toHaveBeenCalledTimes(1) // 只 toast 一次
    const calls = vi.mocked(mockToast.show).mock.calls
    expect(calls[0][0]).toMatch(/自动保存失败/)

    setItemSpy.mockRestore()
  })

  it('localStorage 数据损坏（非法 JSON）→ 降级到 DEMO_TRIP', () => {
    localStorage.setItem('travel_trip', '{not valid json')
    const { result } = renderHook(() => useTripPersistence(mockToast))
    // 不抛错，降级到 demo
    expect(result.current[0].days.length).toBeGreaterThan(0)
  })
})
