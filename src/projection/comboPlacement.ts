import type { RouteNode } from '../types'
import type { GeoLayoutOutput } from './geoLayout'

export interface ComboLayout {
  comboW: number
  comboH: number
  offsetX: number
  offsetY: number
  dirX: number
  dirY: number
  positions: GeoLayoutOutput[]
}

export interface PlacedCombo {
  x: number
  y: number
  w: number
  h: number
}

/** Max distance from combo center to city center, used as collision radius. */
export function computeComboRadius(
  comboW: number, comboH: number,
  dirX: number, dirY: number,
): number {
  const corners = [
    { x: dirX - comboW / 2, y: dirY - comboH / 2 },
    { x: dirX + comboW / 2, y: dirY - comboH / 2 },
    { x: dirX - comboW / 2, y: dirY + comboH / 2 },
    { x: dirX + comboW / 2, y: dirY + comboH / 2 },
  ]
  return Math.max(...corners.map(c => Math.sqrt(c.x * c.x + c.y * c.y))) + 10
}

/** AABB overlap test. */
export function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
  padding: number = 0,
): boolean {
  return ax - aw / 2 - padding < bx + bw / 2 + padding
    && ax + aw / 2 + padding > bx - bw / 2 - padding
    && ay - ah / 2 - padding < by + bh / 2 + padding
    && ay + ah / 2 + padding > by - bh / 2 - padding
}

function angularDist(a: number, b: number): number {
  const d = Math.abs(a - b) % (2 * Math.PI)
  return Math.min(d, 2 * Math.PI - d)
}

export interface CityPinSize {
  halfW: number
  halfHAbove: number
  halfHBelow: number
}

/**
 * 选择 combo 放置方向 — 系统性算法：
 * 1. 找出所有从此城市出发的边（连线方向），combo 应避开这些方向
 * 2. 找出每个方向的可用画布空间（到边界的距离）
 * 3. 综合评分：避开连线 > 空间充裕 > 远离其他城市 > 距离适中
 */
export function computeComboDirection(
  city: RouteNode,
  allCities: RouteNode[],
  allEdges: { sourceId: string; targetId: string }[],
  comboW: number,
  comboH: number,
  canvasWidth: number,
  canvasHeight: number,
  placedCombos: PlacedCombo[],
  pinGap: number = 10,
  pinSize?: CityPinSize,
): { x: number; y: number } {
  const otherCities = allCities.filter(c => c.id !== city.id)
  const pinHalfW = pinSize?.halfW ?? 65
  const pinHalfHAbove = pinSize?.halfHAbove ?? 30
  const pinHalfHBelow = pinSize?.halfHBelow ?? 55
  const PIN_OCC_W = pinHalfW * 2
  const PIN_OCC_H = Math.max(pinHalfHAbove, pinHalfHBelow) * 2

  const cx = city.position.x
  const cy = city.position.y

  // Step 1: edge directions to avoid
  const edgeAngles: number[] = []
  for (const edge of allEdges) {
    let neighborId: string | undefined
    if (edge.sourceId === city.id) neighborId = edge.targetId
    else if (edge.targetId === city.id) neighborId = edge.sourceId
    if (!neighborId) continue
    const neighbor = allCities.find(c => c.id === neighborId)
    if (!neighbor) continue
    edgeAngles.push(Math.atan2(neighbor.position.y - cy, neighbor.position.x - cx))
  }

  // Step 2: score 24 candidate directions
  const hw = comboW / 2
  const hh = comboH / 2
  const cityPinHalfW = 70
  const cityPinHalfH = 30

  const NUM_DIRS = 24
  const WEIGHT_EDGE = 5
  const WEIGHT_SPACE = 3
  const WEIGHT_CITY = 2

  const scores: { angle: number; total: number }[] = []
  for (let i = 0; i < NUM_DIRS; i++) {
    const angle = (2 * Math.PI * i) / NUM_DIRS

    let minEdgeDist = Math.PI
    for (const ea of edgeAngles) {
      minEdgeDist = Math.min(minEdgeDist, angularDist(angle, ea))
    }
    const edgeAvoidScore = Math.min(1, minEdgeDist / (Math.PI / 4))

    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    let maxDist = Infinity
    if (dx > 0.01) maxDist = Math.min(maxDist, (canvasWidth - hw - cx) / dx)
    else if (dx < -0.01) maxDist = Math.min(maxDist, (hw - cx) / dx)
    if (dy > 0.01) maxDist = Math.min(maxDist, (canvasHeight - hh - cy) / dy)
    else if (dy < -0.01) maxDist = Math.min(maxDist, (hh - cy) / dy)
    if (maxDist < 0) maxDist = 0
    const spaceScore = Math.min(1, maxDist / 400)

    let cityDistScore = 0
    if (otherCities.length > 0) {
      for (const other of otherCities) {
        const d = angularDist(angle, Math.atan2(other.position.y - cy, other.position.x - cx))
        cityDistScore += Math.min(1, d / Math.PI)
      }
      cityDistScore /= otherCities.length
    } else {
      cityDistScore = 1
    }

    scores.push({
      angle,
      total: edgeAvoidScore * WEIGHT_EDGE + spaceScore * WEIGHT_SPACE + cityDistScore * WEIGHT_CITY,
    })
  }
  scores.sort((a, b) => b.total - a.total)

  // Step 3: try each direction at increasing distance
  for (const { angle } of scores) {
    const cityExtent = Math.abs(Math.cos(angle)) * cityPinHalfW + Math.abs(Math.sin(angle)) * cityPinHalfH
    const comboExtent = Math.abs(Math.cos(angle)) * hw + Math.abs(Math.sin(angle)) * hh
    const baseDist = cityExtent + pinGap + comboExtent

    for (let step = 0; step <= 6; step++) {
      const dist = baseDist + step * 20
      const ox = Math.cos(angle) * dist
      const oy = Math.sin(angle) * dist
      const ccx = cx + ox
      const ccy = cy + oy

      // 1. Canvas containment (allow one corner off)
      const corners = [
        { x: ccx - hw, y: ccy - hh },
        { x: ccx + hw, y: ccy - hh },
        { x: ccx - hw, y: ccy + hh },
        { x: ccx + hw, y: ccy + hh },
      ]
      const insideCount = corners.filter(
        c => c.x >= 5 && c.x <= canvasWidth - 5 && c.y >= 5 && c.y <= canvasHeight - 5
      ).length
      if (insideCount < 3) continue

      // 2. No overlap with other city pins
      let cityOverlap = false
      for (const other of otherCities) {
        if (rectsOverlap(ccx, ccy, comboW, comboH, other.position.x, other.position.y, PIN_OCC_W, PIN_OCC_H, 10)) {
          cityOverlap = true
          break
        }
      }
      if (cityOverlap) continue

      // 3. No overlap with already-placed combos
      let comboOverlap = false
      for (const pc of placedCombos) {
        if (rectsOverlap(ccx, ccy, comboW, comboH, pc.x, pc.y, pc.w, pc.h, 15)) {
          comboOverlap = true
          break
        }
      }
      if (comboOverlap) continue

      return { x: ox, y: oy }
    }
  }

  return { x: 0, y: -(cityPinHalfH + pinGap + hh) }
}

export function computeSubBounds(
  positions: GeoLayoutOutput[],
  radii: Map<string, number>,
) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const pos of positions) {
    const r = radii.get(pos.id)!
    minX = Math.min(minX, pos.x - r)
    minY = Math.min(minY, pos.y - r)
    maxX = Math.max(maxX, pos.x + r)
    maxY = Math.max(maxY, pos.y + r)
  }
  return { minX, minY, maxX, maxY }
}
