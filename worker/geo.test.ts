import { describe, it, expect } from 'vitest'
import { geocodeToEntry } from './geo'

describe('geocodeToEntry', () => {
  it('直辖市景点：天安门 → city=北京, category=attraction', () => {
    const entry = geocodeToEntry({
      formatted_address: '北京市东城区天安门',
      province: '北京市',
      city: '北京市',
      district: '东城区',
      location: '116.397463,39.909187',
      level: '兴趣点',
    }, '天安门')
    expect(entry).not.toBeNull()
    expect(entry!.name).toBe('天安门')
    expect(entry!.city).toBe('北京')
    expect(entry!.category).toBe('attraction')
    expect(entry!.lat).toBe(39.909187)
    expect(entry!.lng).toBe(116.397463)
  })

  it('直辖市本身：上海 → city=上海, category=city', () => {
    const entry = geocodeToEntry({
      formatted_address: '上海市',
      province: '上海市',
      city: '上海市',
      district: [],
      location: '121.473667,31.230525',
      level: '省',
    }, '上海')
    expect(entry!.city).toBe('上海')
    expect(entry!.category).toBe('city')
  })

  it('普通城市：杭州 → city=杭州, category=city', () => {
    const entry = geocodeToEntry({
      formatted_address: '浙江省杭州市',
      province: '浙江省',
      city: '杭州市',
      district: [],
      location: '120.209903,30.246566',
      level: '市',
    }, '杭州')
    expect(entry!.city).toBe('杭州')
    expect(entry!.category).toBe('city')
  })

  it('普通城市行政区：杭州西湖 → city=杭州, category=district', () => {
    const entry = geocodeToEntry({
      formatted_address: '浙江省杭州市西湖区',
      province: '浙江省',
      city: '杭州市',
      district: '西湖区',
      location: '120.130396,30.259242',
      level: '区县',
    }, '杭州西湖')
    expect(entry!.city).toBe('杭州')
    expect(entry!.category).toBe('district')
  })

  it('缺 location → 返回 null', () => {
    const entry = geocodeToEntry({
      province: '北京市',
      level: '兴趣点',
    }, '某地')
    expect(entry).toBeNull()
  })

  it('location 是非法字符串 → 返回 null', () => {
    const entry = geocodeToEntry({
      province: '北京市',
      level: '兴趣点',
      location: 'abc,def',
    }, '某地')
    expect(entry).toBeNull()
  })

  it('location 经纬度为 NaN → 返回 null', () => {
    const entry = geocodeToEntry({
      province: '北京市',
      level: '兴趣点',
      location: 'NaN,39.9',
    }, '某地')
    expect(entry).toBeNull()
  })

  it('province/city/district 全空 → city=undefined，让 compiler 按坐标反查', () => {
    const entry = geocodeToEntry({
      location: '116,40',
      level: '兴趣点',
    }, '某地')
    expect(entry!.city).toBeUndefined()
  })
})
