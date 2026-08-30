import { describe, it, expect, vi, beforeEach } from 'vitest'
import { compileTrip } from './compiler'
import type { Trip, Stop } from '../types'

// 模拟 search.ts 的四个查询函数，避免依赖 geo.json 加载
vi.mock('./search', () => ({
  getCityName: vi.fn(async (loc: { lat: number; lng: number }) => {
    // 简化：按 lat 粗略判断南北 → 城市
    if (loc.lat > 35) return '北京'
    if (loc.lat > 30) return '上海'
    return '广州'
  }),
  findCityLocation: vi.fn(async (city: string) => {
    const cities: Record<string, { lat: number; lng: number }> = {
      '北京': { lat: 39.9, lng: 116.4 },
      '上海': { lat: 31.2, lng: 121.5 },
      '广州': { lat: 23.1, lng: 113.3 },
    }
    return cities[city]
  }),
  isExactCityName: vi.fn(async (name: string) => {
    return ['北京', '上海', '广州'].includes(name)
  }),
}))

function makeStop(partial: Partial<Stop> & { name: string }): Stop {
  return {
    id: `stop-${partial.name}-${Math.random().toString(36).slice(2, 6)}`,
    startTime: '08:00',
    location: { lat: 39.9, lng: 116.4 },
    ...partial,
  }
}

describe('compileTrip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空行程返回空 routeMap', async () => {
    const trip: Trip = {
      id: 't1', title: '空', startDate: '2026-01-01',
      days: [{ id: 'd1', color: '#f00', stops: [] }],
    }
    const rm = await compileTrip(trip)
    expect(rm.nodes).toHaveLength(0)
    expect(rm.edges).toHaveLength(0)
    expect(rm.days).toHaveLength(1)
    expect(rm.days[0].nodeIds).toHaveLength(0)
  })

  it('单城市多个景点：生成城市 combo + 景点节点 + 同城直线边', async () => {
    const trip: Trip = {
      id: 't1', title: '北京游', startDate: '2026-01-01',
      days: [{
        id: 'd1', color: '#ff0000',
        stops: [
          makeStop({ name: '天坛公园', location: { lat: 39.88, lng: 116.41 } }),
          makeStop({ name: '故宫博物院', location: { lat: 39.92, lng: 116.39 } }),
        ],
      }],
    }
    const rm = await compileTrip(trip)
    // 1 个城市节点 + 1 个 combo + 2 个景点 = 4
    expect(rm.nodes).toHaveLength(4)
    // 同城 2 个景点之间 1 条直线边
    expect(rm.edges).toHaveLength(1)
    expect(rm.edges[0].line).toBe('straight')
  })

  it('跨城市：生成弧线边', async () => {
    const trip: Trip = {
      id: 't1', title: '京沪游', startDate: '2026-01-01',
      days: [{
        id: 'd1', color: '#ff0000',
        stops: [
          makeStop({ name: '天坛公园', location: { lat: 39.88, lng: 116.41 } }),
          makeStop({ name: '外滩', location: { lat: 31.24, lng: 121.49 } }),
        ],
      }],
    }
    const rm = await compileTrip(trip)
    // 北京城市 + combo + 天坛，上海城市 + combo + 外滩 = 6
    expect(rm.nodes).toHaveLength(6)
    // 1 条跨城弧线，0 条同城直线
    expect(rm.edges).toHaveLength(1)
    expect(rm.edges[0].line).toBe('arc')
  })

  it('stop.city 字段优先于按坐标反推', async () => {
    const trip: Trip = {
      id: 't1', title: '测试', startDate: '2026-01-01',
      days: [{
        id: 'd1', color: '#f00',
        stops: [
          // 坐标在北京，但 city 字段写上海
          makeStop({ name: '某景点', location: { lat: 39.9, lng: 116.4 }, city: '上海' }),
        ],
      }],
    }
    const rm = await compileTrip(trip)
    // 应该有上海城市节点，没有北京
    expect(rm.nodes.some(n => n.name === '上海')).toBe(true)
    expect(rm.nodes.some(n => n.name === '北京')).toBe(false)
  })

  it('占位 stop（新地点 / 无 location）被过滤', async () => {
    const trip: Trip = {
      id: 't1', title: '测试', startDate: '2026-01-01',
      days: [{
        id: 'd1', color: '#f00',
        stops: [
          makeStop({ name: '新地点', location: { lat: 39.9, lng: 116.4 } }),
          makeStop({ name: '天坛公园', location: { lat: 39.88, lng: 116.41 } }),
          { ...makeStop({ name: '无坐标地点' }), location: undefined },
        ],
      }],
    }
    const rm = await compileTrip(trip)
    // 只有天坛公园一个景点 → 1 城市 + 1 combo + 1 景点 = 3
    expect(rm.nodes.filter(n => n.type === 'attraction')).toHaveLength(1)
    expect(rm.nodes.find(n => n.type === 'attraction')?.name).toBe('天坛公园')
  })

  it('blink 交通方式被过滤', async () => {
    const trip: Trip = {
      id: 't1', title: '测试', startDate: '2026-01-01',
      days: [{
        id: 'd1', color: '#f00',
        stops: [
          makeStop({ name: '天坛公园', location: { lat: 39.88, lng: 116.41 } }),
          makeStop({ name: '故宫博物院', location: { lat: 39.92, lng: 116.39 }, transport: 'blink' }),
        ],
      }],
    }
    const rm = await compileTrip(trip)
    expect(rm.edges).toHaveLength(1)
    expect(rm.edges[0].icon).toBeUndefined()
  })

  it('同名同坐标景点去重为同一节点', async () => {
    const trip: Trip = {
      id: 't1', title: '测试', startDate: '2026-01-01',
      days: [
        {
          id: 'd1', color: '#f00',
          stops: [makeStop({ name: '天坛公园', location: { lat: 39.88, lng: 116.41 } })],
        },
        {
          id: 'd2', color: '#0f0',
          stops: [makeStop({ name: '天坛公园', location: { lat: 39.88, lng: 116.41 } })],
        },
      ],
    }
    const rm = await compileTrip(trip)
    // 1 城市 + 1 combo + 1 景点（去重） = 3
    expect(rm.nodes.filter(n => n.type === 'attraction')).toHaveLength(1)
  })
})
