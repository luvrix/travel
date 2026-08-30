/* eslint-disable no-irregular-whitespace -- 测试 fixture 含全角空格（U+3000），是小程序导出行程的实际格式 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { markdownToTrip, tripToMarkdown } from './markdown'
import type { Trip } from '../types'

// mock findLocation：避免依赖真实的 geo.json 数据加载
// 支持 hint 参数 — 多个同名 POI 时按距离消歧
vi.mock('../geo/search', () => ({
  findLocation: vi.fn(async (name: string, hint?: { lat: number; lng: number }) => {
    const db: Record<string, Array<{ lat: number; lng: number; city: string }>> = {
      '天坛公园': [{ lat: 39.88, lng: 116.41, city: '北京' }],
      '故宫博物院': [{ lat: 39.92, lng: 116.39, city: '北京' }],
      '外滩': [{ lat: 31.24, lng: 121.49, city: '上海' }],
      '西湖': [
        { lat: 23.10, lng: 113.86, city: '东莞' },
        { lat: 30.24, lng: 120.14, city: '杭州' },
        { lat: 29.54, lng: 119.49, city: '杭州' },
      ],
    }
    const entries = db[name]
    if (!entries || entries.length === 0) return undefined
    if (hint && entries.length > 1) {
      let best = entries[0], bestD = Infinity
      for (const m of entries) {
        const d = (m.lat - hint.lat) ** 2 + (m.lng - hint.lng) ** 2
        if (d < bestD) { bestD = d; best = m }
      }
      return best
    }
    return entries[0]
  }),
}))

describe('markdownToTrip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('解析标题和日期', async () => {
    const md = `# 北京3日游
📅 2026-06-01

## Day 1
- 07:00　上海`
    const trip = await markdownToTrip(md)
    expect(trip.title).toBe('北京3日游')
    expect(trip.startDate).toBe('2026-06-01')
    expect(trip.days).toHaveLength(1)
  })

  it('解析时间 + 地点', async () => {
    const md = `## Day 1
- 07:00　天坛公园`
    const trip = await markdownToTrip(md)
    expect(trip.days[0].stops[0].startTime).toBe('07:00')
    expect(trip.days[0].stops[0].name).toBe('天坛公园')
    expect(trip.days[0].stops[0].location).toEqual({ lat: 39.88, lng: 116.41 })
  })

  it('解析交通方式（中文标签）', async () => {
    const md = `## Day 1
- 07:00　天坛公园
- 10:00　飞机 外滩`
    const trip = await markdownToTrip(md)
    expect(trip.days[0].stops[1].transport).toBe('flight')
    expect(trip.days[0].stops[1].name).toBe('外滩')
  })

  it('补零时间格式', async () => {
    const md = `## Day 1
- 7:00　天坛公园`
    const trip = await markdownToTrip(md)
    expect(trip.days[0].stops[0].startTime).toBe('07:00')
  })

  it('空行程至少返回一天', async () => {
    const trip = await markdownToTrip('')
    expect(trip.days).toHaveLength(1)
    expect(trip.days[0].stops).toHaveLength(0)
  })

  it('多天行程按颜色循环', async () => {
    const md = `## Day 1
- 07:00　天坛公园
## Day 2
- 07:00　外滩
## Day 3
- 07:00　故宫博物院`
    const trip = await markdownToTrip(md)
    expect(trip.days).toHaveLength(3)
    const colors = trip.days.map(d => d.color)
    expect(new Set(colors).size).toBe(3)
  })

  it('Day 头之前的 - 行自动创建 Day 1', async () => {
    const md = `- 07:00　天坛公园
- 10:00　故宫博物院`
    const trip = await markdownToTrip(md)
    expect(trip.days).toHaveLength(1)
    expect(trip.days[0].stops).toHaveLength(2)
    expect(trip.days[0].stops[0].name).toBe('天坛公园')
  })

  it('解析 @lat,lng 后缀 — 坐标直接用，但仍查 DB 拿 city（消歧）', async () => {
    const md = `## Day 1
- 09:00　前门大街 @39.8934,116.3919`
    const trip = await markdownToTrip(md)
    const stop = trip.days[0].stops[0]
    expect(stop.name).toBe('前门大街')
    expect(stop.location).toEqual({ lat: 39.8934, lng: 116.3919 })
    expect(stop.amapResolved).toBe(true)
  })

  it('解析 #city 后缀 — city 直接用，不查 DB（同名 POI 不再消歧）', async () => {
    // db['西湖'] mock 里东莞那条是首条，没 #city 会拿东莞；带 #杭州 应直接用，不调 findLocation
    const findLocation = (await import('../geo/search')).findLocation as ReturnType<typeof vi.fn>
    findLocation.mockClear()
    const md = `## Day 1
- 09:00　西湖 @30.2375,120.1408 #杭州`
    const trip = await markdownToTrip(md)
    const stop = trip.days[0].stops[0]
    expect(stop.name).toBe('西湖')
    expect(stop.location).toEqual({ lat: 30.2375, lng: 120.1408 })
    expect(stop.city).toBe('杭州')
    expect(findLocation).not.toHaveBeenCalled()
  })

  it('解析 @lat,lng 与交通方式共存', async () => {
    const md = `## Day 1
- 11:30　步行 景山公园 @39.9244,116.3904`
    const trip = await markdownToTrip(md)
    const stop = trip.days[0].stops[0]
    expect(stop.startTime).toBe('11:30')
    expect(stop.transport).toBe('walk')
    expect(stop.name).toBe('景山公园')
    expect(stop.location).toEqual({ lat: 39.9244, lng: 116.3904 })
  })

  it('同名 POI 用 @lat,lng 消歧选城市（西湖→杭州，不是东莞）', async () => {
    // DB 有 3 条西湖（东莞 1 + 杭州 2），不传 hint 时 findLocation 返回东莞（首条）
    // 带 @30.2375,120.1408 应选离坐标最近的杭州那条
    const md = `## Day 1
- 09:00　西湖 @30.2375,120.1408`
    const trip = await markdownToTrip(md)
    const stop = trip.days[0].stops[0]
    expect(stop.name).toBe('西湖')
    expect(stop.location).toEqual({ lat: 30.2375, lng: 120.1408 })
    expect(stop.city).toBe('杭州')
  })

  it('没坐标但带 #city — city 后缀覆盖 DB 查到的 city', async () => {
    // 「西湖 #上海」没 @lat,lng，但带 #城市 后缀
    // mock db 西湖首条是东莞，cityFromMd='上海' 应覆盖 loc.city='东莞'
    const md = `## Day 1
- 09:00　西湖 #上海`
    const trip = await markdownToTrip(md)
    const stop = trip.days[0].stops[0]
    expect(stop.name).toBe('西湖')
    expect(stop.city).toBe('上海')
    expect(stop.location).toEqual({ lat: 23.10, lng: 113.86 })  // 仍按 mock db 首条东莞坐标
  })

  it('解析负经度（西半球，用于境外 fallback）', async () => {
    const md = `## Day 1
- 09:00　埃菲尔铁塔 @48.8584,2.2945`
    const trip = await markdownToTrip(md)
    expect(trip.days[0].stops[0].location).toEqual({ lat: 48.8584, lng: 2.2945 })
  })

  it('无 @lat,lng 后缀时走 findLocation 路径（向后兼容）', async () => {
    const md = `## Day 1
- 07:00　天坛公园`
    const trip = await markdownToTrip(md)
    expect(trip.days[0].stops[0].location).toEqual({ lat: 39.88, lng: 116.41 })
  })
})

describe('tripToMarkdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('导出 stop.location 时追加 @lat,lng（6 位小数）', () => {
    const trip = {
      id: 'trip1',
      title: '测试',
      startDate: '2026-06-01',
      days: [{
        id: 'd1',
        color: '#fff',
        stops: [{
          id: 's1',
          startTime: '09:00',
          name: '景山公园',
          transport: 'walk' as const,
          location: { lat: 39.924412, lng: 116.390434 },
        }],
      }],
    }
    const md = tripToMarkdown(trip as Trip)
    expect(md).toContain('- 09:00 步行 景山公园 @39.924412,116.390434')
  })

  it('导出 stop.city 时追加 #city 后缀（位于 @lat,lng 之后）', () => {
    const trip = {
      id: 'trip1',
      title: '测试',
      startDate: '2026-06-01',
      days: [{
        id: 'd1',
        color: '#fff',
        stops: [{
          id: 's1',
          startTime: '09:00',
          name: '景山公园',
          transport: 'walk' as const,
          location: { lat: 39.924412, lng: 116.390434 },
          city: '北京',
        }],
      }],
    }
    const md = tripToMarkdown(trip as Trip)
    expect(md).toContain('- 09:00 步行 景山公园 @39.924412,116.390434 #北京')
  })

  it('无 location 时不追加 @lat,lng', () => {
    const trip = {
      id: 'trip1',
      title: '测试',
      startDate: '2026-06-01',
      days: [{
        id: 'd1',
        color: '#fff',
        stops: [{
          id: 's1',
          startTime: '09:00',
          name: '未知地点',
          transport: undefined,
          location: undefined,
        }],
      }],
    }
    const md = tripToMarkdown(trip as Trip)
    expect(md).toContain('- 09:00 未知地点')
    expect(md).not.toContain('@')
  })
})

describe('markdown 坐标 round-trip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('导出 → 导入坐标一致（不依赖 findLocation/amap）', async () => {
    const original = {
      id: 'trip1',
      title: '京沪3日游',
      startDate: '2026-06-01',
      days: [{
        id: 'd1',
        color: '#fff',
        stops: [
          {
            id: 's1', startTime: '10:00', name: '故宫博物院',
            transport: 'flight' as const,
            location: { lat: 39.9174, lng: 116.3908 },
          },
          {
            id: 's2', startTime: '11:30', name: '景山公园',
            transport: 'walk' as const,
            location: { lat: 39.9244, lng: 116.3904 },
          },
        ],
      }],
    }
    const md = tripToMarkdown(original as Trip)
    const trip = await markdownToTrip(md)
    expect(trip.days[0].stops[0].name).toBe('故宫博物院')
    expect(trip.days[0].stops[0].location).toEqual({ lat: 39.9174, lng: 116.3908 })
    expect(trip.days[0].stops[1].name).toBe('景山公园')
    expect(trip.days[0].stops[1].location).toEqual({ lat: 39.9244, lng: 116.3904 })
  })

  it('导出 → 导入 city 字段一致（不查 DB，跨 DB 版本稳定）', async () => {
    // 用一个 mock DB 没有的 POI 名，确保 city 全靠 markdown 里的 #后缀，不靠 findLocation
    const findLocation = (await import('../geo/search')).findLocation as ReturnType<typeof vi.fn>
    findLocation.mockClear()
    const original = {
      id: 'trip1',
      title: '京3日游',
      startDate: '2026-06-01',
      days: [{
        id: 'd1',
        color: '#fff',
        stops: [{
          id: 's1', startTime: '09:00', name: '景山公园',
          transport: 'walk' as const,
          location: { lat: 39.9244, lng: 116.3904 },
          city: '北京',
        }],
      }],
    }
    const md = tripToMarkdown(original as Trip)
    expect(md).toContain('#北京')
    const trip = await markdownToTrip(md)
    expect(trip.days[0].stops[0].city).toBe('北京')
    expect(findLocation).not.toHaveBeenCalled()
  })
})
