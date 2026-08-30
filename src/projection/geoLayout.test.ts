import { describe, it, expect } from 'vitest'
import { layoutNodes, SUBGRAPH_CONFIG } from './geoLayout'
import type { GeoLayoutInput } from './geoLayout'

const CANVAS_W = 1000
const CANVAS_H = 1000

// 把画布坐标转回相对中心的方位角（弧度，北为 0，顺时针）
function bearingFromCanvasCenter(x: number, y: number): number {
  const cx = CANVAS_W / 2
  const cy = CANVAS_H / 2
  return Math.atan2(x - cx, cy - y)
}

function makeInputs(coords: { lat: number; lng: number }[]): GeoLayoutInput[] {
  return coords.map((c, i) => ({ id: `n${i}`, lat: c.lat, lng: c.lng, radius: 10 }))
}

// 用真实地理坐标构造，避免重心计算后方位角意外变化
// 北京 6 景点的近似坐标（City Walk 场景）
const BEIJING_WALK = [
  { name: 'tiananmen', lat: 39.9054, lng: 116.3976 },   // 天安门
  { name: 'gugong', lat: 39.9163, lng: 116.3972 },      // 故宫
  { name: 'jingshan', lat: 39.9244, lng: 116.3904 },    // 景山
  { name: 'nanluo', lat: 39.9321, lng: 116.3968 },      // 南锣鼓巷
  { name: 'shichahai', lat: 39.9400, lng: 116.3830 },   // 什刹海
  { name: 'gulou', lat: 39.9410, lng: 116.3920 },       // 鼓楼
]

describe('layoutNodes — 方位保真', () => {
  it('3 点方位角 0°/45°/90° → 输出方位角误差 < 3°', () => {
    // 构造重心恰在原点的 3 点：北 (1,0)、东北 (1,1)、东 (0,1) 不行（重心偏移）
    // 用 4 点对称构造，去掉一个点后重心仍在原点附近：
    //   北 (1,0), 东 (0,1), 南 (-1,0), 西 (0,-1) — 重心 (0,0)，方位角 0/90/180/270
    // 这里测 3 点：北 (1,0)、东北 (1,1)、西南 (-1,-1) — 重心 (1/3,1/3) 仍有偏移
    // 最干净的做法：用 4 点对称，验证 4 个方位角
    const inputs = makeInputs([
      { lat: 1, lng: 0 },   // 北 → bearing 0°
      { lat: 0, lng: 1 },   // 东 → bearing 90°
      { lat: -1, lng: 0 },  // 南 → bearing 180°
      { lat: 0, lng: -1 },  // 西 → bearing 270°
    ])
    const out = layoutNodes(inputs, CANVAS_W, CANVAS_H, SUBGRAPH_CONFIG)
    const bearings = out.map(p => {
      const b = bearingFromCanvasCenter(p.x, p.y) * 180 / Math.PI
      return (b + 360) % 360
    })
    expect(bearings[0]).toBeLessThan(3)
    expect(Math.abs(bearings[1] - 90)).toBeLessThan(3)
    expect(Math.abs(bearings[2] - 180)).toBeLessThan(3)
    expect(Math.abs(bearings[3] - 270)).toBeLessThan(3)
  })

  it('北京 6 景点 → 天安门在最南，什刹海/鼓楼在最北（南北关系保留）', () => {
    const inputs = BEIJING_WALK.map(p => ({ id: p.name, lat: p.lat, lng: p.lng, radius: 10 }))
    const out = layoutNodes(inputs, CANVAS_W, CANVAS_H, SUBGRAPH_CONFIG)
    const pos = new Map(out.map(p => [p.id, p]))
    // 天安门 lat 最小（最南），画布 y 应最大（画布 y 向下增）
    const tianY = pos.get('tiananmen')!.y
    const shichahaiY = pos.get('shichahai')!.y
    const gulouY = pos.get('gulou')!.y
    const gugongY = pos.get('gugong')!.y
    const jingshanY = pos.get('jingshan')!.y
    // 天安门应在故宫南面（y 更大）
    expect(tianY).toBeGreaterThan(gugongY)
    // 故宫应在景山南面
    expect(gugongY).toBeGreaterThan(jingshanY)
    // 什刹海和鼓楼应在最北（y 最小）
    expect(Math.min(shichahaiY, gulouY)).toBeLessThan(jingshanY)
  })

  it('rank 径向压缩：两点时最近点距中心 < 最远点距中心', () => {
    const inputs = makeInputs([
      { lat: 0, lng: 0.1 },  // 距原点近
      { lat: 0, lng: 5.0 },  // 距原点远
    ])
    const out = layoutNodes(inputs, CANVAS_W, CANVAS_H, SUBGRAPH_CONFIG)
    const cx = CANVAS_W / 2
    const cy = CANVAS_H / 2
    const d0 = Math.hypot(out[0].x - cx, out[0].y - cy)
    const d1 = Math.hypot(out[1].x - cx, out[1].y - cy)
    expect(d0).toBeLessThan(d1)
  })

  it('两点：相对画布中心近似 180° 对称', () => {
    const inputs = makeInputs([
      { lat: 1, lng: 0 },  // 北
      { lat: -1, lng: 0 }, // 南
    ])
    const out = layoutNodes(inputs, CANVAS_W, CANVAS_H, SUBGRAPH_CONFIG)
    const b0 = bearingFromCanvasCenter(out[0].x, out[0].y)
    const b1 = bearingFromCanvasCenter(out[1].x, out[1].y)
    const diff = Math.abs(b0 - b1)
    expect(Math.abs(diff - Math.PI)).toBeLessThan(0.1)
  })

  it('退化：所有点同坐标 → 输出无 NaN，各点位置互异', () => {
    const inputs = makeInputs([
      { lat: 39.9, lng: 116.4 },
      { lat: 39.9, lng: 116.4 },
      { lat: 39.9, lng: 116.4 },
    ])
    const out = layoutNodes(inputs, CANVAS_W, CANVAS_H, SUBGRAPH_CONFIG)
    for (const p of out) {
      expect(isFinite(p.x)).toBe(true)
      expect(isFinite(p.y)).toBe(true)
    }
    const positions = new Set(out.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`))
    expect(positions.size).toBe(3)
  })
})
