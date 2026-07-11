import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force'
import type { RouteMap, RouteNode } from '../types'

// ── Unified element sizing ──
// These constants mirror the actual rendered sizes in components.tsx
// so layout collision detection matches what's drawn on screen.

interface ElementBounds {
  halfW: number
  halfH: number
}

interface LayoutNode {
  id: string
  anchorX: number
  anchorY: number
  x: number
  y: number
  radius: number
}

interface GeoLayoutInput {
  id: string
  lat: number
  lng: number
  radius: number
}

interface GeoLayoutOutput {
  id: string
  x: number
  y: number
}

interface LayoutConfig {
  radiusFactor: number
  innerRatioBase: number
  outerRatio: number
  angleSpreadFactor: number
  forceStrength: number
  collisionPadding: number
  collisionIterations: number
}

const CITY_CONFIG: LayoutConfig = {
  radiusFactor: 0.48,
  innerRatioBase: 0,
  outerRatio: 0.92,
  angleSpreadFactor: 2.5,
  forceStrength: 0.98,
  collisionPadding: 2,
  collisionIterations: 50,
}

const SUBGRAPH_CONFIG: LayoutConfig = {
  radiusFactor: 0.45,
  innerRatioBase: 0,
  outerRatio: 0.85,
  angleSpreadFactor: 3.5,
  forceStrength: 0.95,
  collisionPadding: 4,
  collisionIterations: 80,
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180
  const lat1r = lat1 * Math.PI / 180
  const lat2r = lat2 * Math.PI / 180
  const y = Math.sin(dLng) * Math.cos(lat2r)
  const x = Math.cos(lat1r) * Math.sin(lat2r) - Math.sin(lat1r) * Math.cos(lat2r) * Math.cos(dLng)
  return Math.atan2(y, x)
}

function layoutScale(w: number, h: number): number {
  const minDim = Math.min(w, h)
  return minDim / 1080 * 1.25
}

function resolveCollisions(
  nodes: LayoutNode[],
  strength: number,
  padding: number,
  iterations: number,
): void {
  const simulation = forceSimulation(nodes as any)
    .force("x", forceX<LayoutNode>(d => d.anchorX).strength(strength))
    .force("y", forceY<LayoutNode>(d => d.anchorY).strength(strength))
    .force("collide", forceCollide<LayoutNode>(d => d.radius + padding))
    .alphaDecay(0.04)
    .stop()

  for (let i = 0; i < iterations; i++) simulation.tick()
}

interface RectBounds {
  halfW: number
  halfH_above: number  // distance from center to top edge
  halfH_below: number  // distance from center to bottom edge
}

/**
 * Resolve rectangular collisions between nodes.
 * Unlike circle-based d3-force, this accounts for asymmetric bounds (e.g. city pin with label below).
 * Iteratively pushes overlapping nodes apart along the axis of least penetration.
 */
function resolveRectCollisions(
  nodes: RouteNode[],
  canvasWidth: number,
  canvasHeight: number,
  getBounds: (node: RouteNode) => RectBounds,
  iterations: number = 30,
  minGap: number = 4,
): void {
  for (let iter = 0; iter < iterations; iter++) {
    let anyOverlap = false
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]
      const ab = getBounds(a)
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j]
        const bb = getBounds(b)

        // Asymmetric vertical: a's above vs b's below, etc.
        const overlapX = (ab.halfW + bb.halfW + minGap) - Math.abs(a.position.x - b.position.x)
        const overlapY = (
          (a.position.y <= b.position.y)
            ? (ab.halfH_below + bb.halfH_above + minGap) - (b.position.y - a.position.y)
            : (ab.halfH_above + bb.halfH_below + minGap) - (a.position.y - b.position.y)
        )

        if (overlapX > 0 && overlapY > 0) {
          anyOverlap = true
          // Push apart along the axis of least penetration
          if (overlapX < overlapY) {
            const push = overlapX / 2
            const sign = a.position.x <= b.position.x ? -1 : 1
            a.position.x += sign * push
            b.position.x -= sign * push
          } else {
            const push = overlapY / 2
            const sign = a.position.y <= b.position.y ? -1 : 1
            a.position.y += sign * push
            b.position.y -= sign * push
          }
        }
      }
    }
    if (!anyOverlap) break
  }

  // Clamp to canvas
  for (const node of nodes) {
    const b = getBounds(node)
    node.position.x = Math.max(b.halfW + 5, Math.min(canvasWidth - b.halfW - 5, node.position.x))
    node.position.y = Math.max(b.halfH_above + 5, Math.min(canvasHeight - b.halfH_below - 5, node.position.y))
  }
}

function computeInnerRatio(n: number): number {
  if (n <= 2) return 0.5
  if (n <= 4) return 0.4
  return 0.3
}

function layoutNodes(
  inputs: GeoLayoutInput[],
  canvasWidth: number,
  canvasHeight: number,
  config: LayoutConfig,
  centerLat?: number,
  centerLng?: number,
): GeoLayoutOutput[] {
  if (inputs.length === 0) return []
  if (inputs.length === 1) {
    return [{ id: inputs[0].id, x: canvasWidth / 2, y: canvasHeight / 2 }]
  }

  const cx = canvasWidth / 2
  const cy = canvasHeight / 2
  const canvasRadius = Math.min(canvasWidth, canvasHeight) / 2 * config.radiusFactor

  const geoLat = centerLat ?? inputs.reduce((s, n) => s + n.lat, 0) / inputs.length
  const geoLng = centerLng ?? inputs.reduce((s, n) => s + n.lng, 0) / inputs.length

  const polar = inputs.map(n => {
    const distKm = haversine(geoLat, geoLng, n.lat, n.lng)
    const brng = bearing(geoLat, geoLng, n.lat, n.lng)
    return { id: n.id, distKm, bearing: brng, radius: n.radius }
  })

  const sorted = [...polar].sort((a, b) => a.distKm - b.distKm)
  const rankMap = new Map<string, number>()
  sorted.forEach((p, i) => rankMap.set(p.id, i))

  const n = inputs.length
  const innerRatio = config.innerRatioBase || computeInnerRatio(n)
  const outerRatio = config.outerRatio
  const minAngleGap = (2 * Math.PI) / (n * config.angleSpreadFactor)

  const byBearing = [...polar].sort((a, b) => a.bearing - b.bearing)
  const adjustedBearings = new Map<string, number>()
  const bearings = byBearing.map(p => p.bearing)

  for (let i = 0; i < bearings.length; i++) {
    const prev = i === 0 ? bearings[bearings.length - 1] - 2 * Math.PI : bearings[i - 1]
    let cur = bearings[i]
    if (cur - prev < minAngleGap) {
      cur = prev + minAngleGap
    }
    adjustedBearings.set(byBearing[i].id, cur)
  }

  const layoutNodes: LayoutNode[] = polar.map(p => {
    const rank = rankMap.get(p.id)!
    const ratio = n === 1 ? innerRatio :
      innerRatio + (outerRatio - innerRatio) * (rank / Math.max(n - 1, 1))
    const brng = adjustedBearings.get(p.id) ?? p.bearing

    const screenX = cx + ratio * canvasRadius * Math.sin(brng)
    const screenY = cy - ratio * canvasRadius * Math.cos(brng)

    return {
      id: p.id,
      anchorX: screenX,
      anchorY: screenY,
      x: screenX,
      y: screenY,
      radius: p.radius,
    }
  })

  resolveCollisions(
    layoutNodes,
    config.forceStrength,
    config.collisionPadding,
    config.collisionIterations,
  )

  return layoutNodes.map(n => ({ id: n.id, x: n.x, y: n.y }))
}

interface ComboLayout {
  comboW: number
  comboH: number
  offsetX: number
  offsetY: number
  dirX: number
  dirY: number
  positions: GeoLayoutOutput[]
}

/** 计算 combo 四角到城市中心的最远距离 */
function computeComboRadius(
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

/**
 * 矩形重叠检测（AABB）
 */
function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
  padding: number = 0,
): boolean {
  return ax - aw / 2 - padding < bx + bw / 2 + padding
    && ax + aw / 2 + padding > bx - bw / 2 - padding
    && ay - ah / 2 - padding < by + bh / 2 + padding
    && ay + ah / 2 + padding > by - bh / 2 - padding
}

/**
 * Compute the angular distance between two angles (0 to PI).
 */
function angularDist(a: number, b: number): number {
  const d = Math.abs(a - b) % (2 * Math.PI)
  return Math.min(d, 2 * Math.PI - d)
}

/**
 * 选择 combo 放置方向 — 系统性算法：
 * 1. 找出所有从此城市出发的边（连线方向），combo 应避开这些方向
 * 2. 找出每个方向的可用画布空间（到边界的距离）
 * 3. 综合评分：避开连线 > 空间充裕 > 远离其他城市 > 距离适中
 */
function computeComboDirection(
  city: RouteNode,
  allCities: RouteNode[],
  allEdges: { sourceId: string; targetId: string }[],
  comboW: number,
  comboH: number,
  canvasWidth: number,
  canvasHeight: number,
  placedCombos: { x: number; y: number; w: number; h: number }[],
  pinGap: number = 10,
  pinHalfW?: number,
  pinHalfHAbove?: number,
  pinHalfHBelow?: number,
): { x: number; y: number } {
  const otherCities = allCities.filter(c => c.id !== city.id)
  const PIN_OCC_W = (pinHalfW ?? 65) * 2
  const PIN_OCC_H = Math.max(pinHalfHAbove ?? 30, pinHalfHBelow ?? 55) * 2

  const cx = city.position.x
  const cy = city.position.y

  // ── Step 1: Compute edge directions from this city ──
  // These are angles we want to AVOID placing the combo
  const edgeAngles: number[] = []
  for (const edge of allEdges) {
    let neighborId: string | undefined
    if (edge.sourceId === city.id) neighborId = edge.targetId
    else if (edge.targetId === city.id) neighborId = edge.sourceId
    if (!neighborId) continue
    const neighbor = allCities.find(c => c.id === neighborId)
    if (!neighbor) continue
    const angle = Math.atan2(neighbor.position.y - cy, neighbor.position.x - cx)
    edgeAngles.push(angle)
  }

  // ── Step 2: Score each direction ──
  const hw = comboW / 2
  const hh = comboH / 2
  const cityPinHalfW = 70
  const cityPinHalfH = 30

  // 24 directions for finer granularity
  const NUM_DIRS = 24
  const angles: number[] = []
  for (let i = 0; i < NUM_DIRS; i++) {
    angles.push((2 * Math.PI * i) / NUM_DIRS)
  }

  // For each direction, compute clearance to canvas boundary
  const directionScores: { angle: number; edgeAvoidScore: number; spaceScore: number; cityDistScore: number }[] = []
  for (const angle of angles) {
    // Edge avoidance: how far is this direction from the nearest edge?
    let minEdgeDist = Math.PI // max possible angular distance
    for (const ea of edgeAngles) {
      const d = angularDist(angle, ea)
      minEdgeDist = Math.min(minEdgeDist, d)
    }
    // Score 0..1: 1 = far from all edges, 0 = right on an edge
    // Anything within ~30 degrees (PI/6) of an edge is bad
    const edgeAvoidScore = Math.min(1, minEdgeDist / (Math.PI / 4))

    // Canvas space: how far can the combo center go before hitting boundary?
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    let maxDist = Infinity
    if (dx > 0.01) maxDist = Math.min(maxDist, (canvasWidth - hw - cx) / dx)
    else if (dx < -0.01) maxDist = Math.min(maxDist, (hw - cx) / dx)
    if (dy > 0.01) maxDist = Math.min(maxDist, (canvasHeight - hh - cy) / dy)
    else if (dy < -0.01) maxDist = Math.min(maxDist, (hh - cy) / dy)
    if (maxDist < 0) maxDist = 0
    const spaceScore = Math.min(1, maxDist / 400) // normalize: 400px+ is plenty

    // City distance: weighted average distance to other cities in this direction
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

    directionScores.push({ angle, edgeAvoidScore, spaceScore, cityDistScore })
  }

  // ── Step 3: Sort directions by combined score, then try each at multiple distances ──
  // Weight: edge avoidance is most important, then space, then city distance
  const WEIGHT_EDGE = 5
  const WEIGHT_SPACE = 3
  const WEIGHT_CITY = 2
  directionScores.sort((a, b) =>
    (b.edgeAvoidScore * WEIGHT_EDGE + b.spaceScore * WEIGHT_SPACE + b.cityDistScore * WEIGHT_CITY)
    - (a.edgeAvoidScore * WEIGHT_EDGE + a.spaceScore * WEIGHT_SPACE + a.cityDistScore * WEIGHT_CITY)
  )

  // Try each direction from closest feasible distance
  for (const ds of directionScores) {
    const angle = ds.angle
    const cityExtent = Math.abs(Math.cos(angle)) * cityPinHalfW + Math.abs(Math.sin(angle)) * cityPinHalfH
    const comboExtent = Math.abs(Math.cos(angle)) * hw + Math.abs(Math.sin(angle)) * hh
    const baseDist = cityExtent + pinGap + comboExtent

    for (let step = 0; step <= 6; step++) {
      const dist = baseDist + step * 20
      const ox = Math.cos(angle) * dist
      const oy = Math.sin(angle) * dist
      const ccx = cx + ox
      const ccy = cy + oy

      // 1. Canvas containment
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

  // Fallback: just place it above
  return { x: 0, y: -(cityPinHalfH + pinGap + hh) }
}

function computeSubBounds(
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

export interface LayoutBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface ReservedZone {
  /** Fractional x of zone's left edge (0-1) */
  x: number
  /** Fractional y of zone's top edge (0-1) */
  y: number
  /** Fractional width (0-1) */
  width: number
  /** Fractional height (0-1) */
  height: number
}

export function computePositions(
  routeMap: RouteMap,
  canvasWidth: number,
  canvasHeight: number,
  alpha: number = 0.45,
  contentTop: number = 0,
  bounds?: LayoutBounds,
  reservedZones?: ReservedZone[],
): void {
  if (routeMap.nodes.length === 0) return

  const ls = layoutScale(canvasWidth, canvasHeight)

  // ── Unified element sizing (mirrors rendered sizes in components.tsx) ──
  // City pin: shape + border + label
  // Rendered shapes: circle-photo=size, pin-drop=0.7*size x size, diamond=0.6*size, square-rounded=0.75*size
  // With border: +3*2 for circle, +2*2 for square-rounded
  // Label below: marginTop=5, padding=4+4 vertical, fontSize=cityFont.size, gap
  const PIN_SIZE = Math.round(52 * ls)  // template.cityPin.size ≈ 48-60
  const PIN_SHAPE_HW = Math.round(PIN_SIZE * 0.42)  // ~half of shape width (0.75/2 + border)
  const PIN_SHAPE_HH = Math.round(PIN_SIZE * 0.54)  // ~half of shape height (size/2 + border)
  const LABEL_H = Math.round(24 * ls * 1.0 + 8 * ls)  // city font size + padding
  const LABEL_BELOW_GAP = Math.round(5 * ls)
  // Full city pin bounds from center:
  //   above: PIN_SHAPE_HH
  //   below: PIN_SHAPE_HH + LABEL_BELOW_GAP + LABEL_H (if label below)
  //   left/right: max(PIN_SHAPE_HW, label_half_width)
  const CITY_HALF_W = Math.round(65 * ls)  // pin shape half + label text room
  const CITY_HALF_H_BELOW = PIN_SHAPE_HH + LABEL_BELOW_GAP + LABEL_H  // center to bottom edge
  const CITY_HALF_H_ABOVE = PIN_SHAPE_HH  // center to top edge
  const CITY_COLLISION_HW = CITY_HALF_W + Math.round(10 * ls)  // 10px margin
  const CITY_COLLISION_HH_BELOW = CITY_HALF_H_BELOW + Math.round(10 * ls)
  const CITY_COLLISION_HH_ABOVE = CITY_HALF_H_ABOVE + Math.round(10 * ls)

  // Day sticker sizing
  const STICKER_H = Math.round(20 * ls + 8 * ls)  // fontSize + padding
  const STICKER_W = Math.round(80 * ls)  // "DAY N" text + padding

  // Attraction node sizing
  const ATT_DOT_R = Math.round(5 * ls)
  const ATT_LABEL_H = Math.round(18 * ls * 1.2)
  const ATT_LABEL_W_PER_CHAR = Math.round(14 * ls)

  const PIN_GAP = Math.round(10 * ls)

  const charW = Math.round(16 * ls)
  const dotR = Math.round(4 * ls)
  const textGap = Math.round(6 * ls)
  const lineH = Math.round(22 * ls)
  const COMBO_PADDING = Math.round(12 * ls)
  const MIN_NODE_GAP = Math.round(18 * ls)

  const scaledCityConfig = { ...CITY_CONFIG, collisionPadding: Math.max(CITY_CONFIG.collisionPadding, CITY_CONFIG.collisionPadding * ls) }
  const scaledSubConfig  = { ...SUBGRAPH_CONFIG, collisionPadding: Math.max(SUBGRAPH_CONFIG.collisionPadding, SUBGRAPH_CONFIG.collisionPadding * ls) }

  const allNodes = routeMap.nodes
  const cityNodes = allNodes.filter(n => n.type === 'city')
  const attractionNodes = allNodes.filter(n => n.type === 'attraction')
  const comboNodes = allNodes.filter(n => n.type === 'combo')

  const comboToCity = new Map<string, RouteNode>()
  for (const combo of comboNodes) {
    const city = cityNodes.find(c => c.id === `city-${combo.name}`)
    if (city) comboToCity.set(combo.id, city)
  }

  const groups = new Map<string, RouteNode[]>()
  for (const node of attractionNodes) {
    const parentId = node.parentId!
    if (!groups.has(parentId)) groups.set(parentId, [])
    groups.get(parentId)!.push(node)
  }

  // ── 阶段1：城市初始布局（不考虑 combo） ──
  // Use a collision radius that covers the larger dimension of the city pin rectangle
  const CITY_COLLISION_RADIUS = Math.max(CITY_COLLISION_HW, CITY_COLLISION_HH_BELOW)
  const cityInputs: GeoLayoutInput[] = cityNodes.map(n => ({
    id: n.id,
    lat: n.location.lat,
    lng: n.location.lng,
    radius: CITY_COLLISION_RADIUS,
  }))
  const cityPositions = layoutNodes(cityInputs, canvasWidth, canvasHeight, scaledCityConfig)

  for (const pos of cityPositions) {
    const node = cityNodes.find(n => n.id === pos.id)
    if (node) node.position = { x: pos.x, y: pos.y }
  }

  // ── 阶段1.5：矩形碰撞后处理 ──
  // d3-force uses circles; post-process with actual rectangular bounds
  // Identify cities that are day-start (need sticker space above)
  const dayStartCityIds = new Set<string>()
  for (const day of routeMap.days) {
    if (day.nodeIds.length > 0) {
      const firstId = day.nodeIds[0]
      const firstNode = allNodes.find(n => n.id === firstId)
      if (firstNode?.type === 'city') dayStartCityIds.add(firstId)
    }
  }

  resolveRectCollisions(cityNodes, canvasWidth, canvasHeight, (node) => {
    const isDayStart = dayStartCityIds.has(node.id)
    const extraAbove = isDayStart ? STICKER_H + Math.round(8 * ls) : 0
    return {
      halfW: CITY_COLLISION_HW,
      halfH_above: CITY_COLLISION_HH_ABOVE + extraAbove,
      halfH_below: CITY_COLLISION_HH_BELOW,
    }
  })

  // ── 阶段2：子图布局，计算 combo 尺寸和方向 ──
  const comboLayouts = new Map<string, ComboLayout>()
  const placedCombos: { x: number; y: number; w: number; h: number }[] = []

  for (const [comboId, children] of groups) {
    const city = comboToCity.get(comboId)
    if (!city || children.length === 0) continue

    const childRadii = new Map<string, number>()
    for (const n of children) {
      const nameLen = n.name.length
      const labelW = dotR * 2 + textGap + nameLen * charW
      const hasTime = !!n.time
      const labelH = hasTime ? lineH * 1.6 : lineH
      childRadii.set(n.id, Math.max(labelW, labelH) / 2)
    }

    // 估算 + 布局 combo 内容
    const maxRadius = Math.max(...Array.from(childRadii.values()))
    const estimatedBoxSize = Math.max(
      maxRadius * 2 * Math.sqrt(children.length),
      children.length * lineH * 1.2,
      80 * ls,
    )

    const subInputs: GeoLayoutInput[] = children.map(n => ({
      id: n.id,
      lat: n.location.lat,
      lng: n.location.lng,
      radius: childRadii.get(n.id)!,
    }))

    let subPositions = layoutNodes(
      subInputs, estimatedBoxSize, estimatedBoxSize,
      scaledSubConfig, city.location.lat, city.location.lng,
    )

    // 计算 combo 边界
    let { minX, minY, maxX, maxY } = computeSubBounds(subPositions, childRadii)
    let comboW = maxX - minX + COMBO_PADDING * 2
    let comboH = maxY - minY + COMBO_PADDING * 2
    let offsetX = -minX + COMBO_PADDING
    let offsetY = -minY + COMBO_PADDING

    // Enforce minimum gap between nodes — push apart any that are too close
    const MIN_GAP = MIN_NODE_GAP
    for (let iter = 0; iter < 10; iter++) {
      let pushed = false
      for (let i = 0; i < subPositions.length; i++) {
        for (let j = i + 1; j < subPositions.length; j++) {
          const a = subPositions[i], b = subPositions[j]
          const ra = childRadii.get(a.id)!, rb = childRadii.get(b.id)!
          const dx = b.x - a.x, dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const minDist = ra + rb + MIN_GAP
          if (dist < minDist) {
            const push = (minDist - dist) / 2
            const nx = dx / dist, ny = dy / dist
            a.x -= nx * push; a.y -= ny * push
            b.x += nx * push; b.y += ny * push
            pushed = true
          }
        }
      }
      if (!pushed) break
    }

    // Recompute bounds after pushing
    ;({ minX, minY, maxX, maxY } = computeSubBounds(subPositions, childRadii))
    comboW = maxX - minX + COMBO_PADDING * 2
    comboH = maxY - minY + COMBO_PADDING * 2
    offsetX = -minX + COMBO_PADDING
    offsetY = -minY + COMBO_PADDING

    // 如果估算偏差大，用实际大小重布局
    const actualBoxSize = Math.max(comboW, comboH)
    if ((actualBoxSize / estimatedBoxSize < 0.5 || actualBoxSize / estimatedBoxSize > 2.0) && children.length > 1) {
      subPositions = layoutNodes(
        subInputs, actualBoxSize, actualBoxSize,
        scaledSubConfig, city.location.lat, city.location.lng,
      )
      // Re-enforce minimum gap after re-layout
      for (let iter = 0; iter < 10; iter++) {
        let pushed = false
        for (let i = 0; i < subPositions.length; i++) {
          for (let j = i + 1; j < subPositions.length; j++) {
            const a = subPositions[i], b = subPositions[j]
            const ra = childRadii.get(a.id)!, rb = childRadii.get(b.id)!
            const dx = b.x - a.x, dy = b.y - a.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const minDist = ra + rb + MIN_GAP
            if (dist < minDist) {
              const push = (minDist - dist) / 2
              const nx = dx / dist, ny = dy / dist
              a.x -= nx * push; a.y -= ny * push
              b.x += nx * push; b.y += ny * push
              pushed = true
            }
          }
        }
        if (!pushed) break
      }
      const { minX: rMinX, minY: rMinY, maxX: rMaxX, maxY: rMaxY } = computeSubBounds(subPositions, childRadii)
      comboW = rMaxX - rMinX + COMBO_PADDING * 2
      comboH = rMaxY - rMinY + COMBO_PADDING * 2
      offsetX = -rMinX + COMBO_PADDING
      offsetY = -rMinY + COMBO_PADDING
    }

    // 选择 combo 方向（考虑已放置的 combo）
    const dir = computeComboDirection(
      city, cityNodes, routeMap.edges, comboW, comboH,
      canvasWidth, canvasHeight, placedCombos, PIN_GAP,
      CITY_COLLISION_HW, CITY_COLLISION_HH_ABOVE, CITY_COLLISION_HH_BELOW,
    )

    // 记录已放置的 combo，供后续 combo 避让
    placedCombos.push({
      x: city.position.x + dir.x,
      y: city.position.y + dir.y,
      w: comboW,
      h: comboH,
    })

    comboLayouts.set(comboId, {
      comboW, comboH, offsetX, offsetY,
      dirX: dir.x, dirY: dir.y,
      positions: subPositions,
    })
  }

  // ── 阶段3：城市重布局（考虑 combo 空间） ──
  const comboRadiusMap = new Map<string, number>()
  for (const [comboId, layout] of comboLayouts) {
    const city = comboToCity.get(comboId)
    if (!city) continue
    const r = computeComboRadius(layout.comboW, layout.comboH, layout.dirX, layout.dirY)
    comboRadiusMap.set(city.id, Math.max(comboRadiusMap.get(city.id) ?? 0, r))
  }

  const enlargedCityInputs: GeoLayoutInput[] = cityNodes.map(n => ({
    id: n.id,
    lat: n.location.lat,
    lng: n.location.lng,
    radius: Math.max(CITY_COLLISION_RADIUS, comboRadiusMap.get(n.id) ?? 0),
  }))

  const finalCityPositions = layoutNodes(enlargedCityInputs, canvasWidth, canvasHeight, scaledCityConfig)

  for (const pos of finalCityPositions) {
    const node = cityNodes.find(n => n.id === pos.id)
    if (node) node.position = { x: pos.x, y: pos.y }
  }

  // ── 阶段4：用新城市位置重新选择 combo 方向并放置 ──
  const finalPlacedCombos: { x: number; y: number; w: number; h: number }[] = []

  for (const [comboId, layout] of comboLayouts) {
    const city = comboToCity.get(comboId)
    const children = groups.get(comboId)
    if (!city || !children) continue

    // 重新选择方向（基于新城市位置 + 已放置的 combo）
    const dir = computeComboDirection(
      city, cityNodes, routeMap.edges, layout.comboW, layout.comboH,
      canvasWidth, canvasHeight, finalPlacedCombos, PIN_GAP,
      CITY_COLLISION_HW, CITY_COLLISION_HH_ABOVE, CITY_COLLISION_HH_BELOW,
    )

    let comboCenterX = city.position.x + dir.x
    let comboCenterY = city.position.y + dir.y

    // clamp combo 到画布内
    const edgeMargin = 5
    const comboLeft = comboCenterX - layout.comboW / 2
    const comboRight = comboCenterX + layout.comboW / 2
    const comboTop = comboCenterY - layout.comboH / 2
    const comboBottom = comboCenterY + layout.comboH / 2

    if (comboLeft < edgeMargin) comboCenterX += edgeMargin - comboLeft
    if (comboRight > canvasWidth - edgeMargin) comboCenterX -= comboRight - (canvasWidth - edgeMargin)
    if (comboTop < edgeMargin) comboCenterY += edgeMargin - comboTop
    if (comboBottom > canvasHeight - edgeMargin) comboCenterY -= comboBottom - (canvasHeight - edgeMargin)

    // 记录已放置的 combo
    finalPlacedCombos.push({
      x: comboCenterX, y: comboCenterY,
      w: layout.comboW, h: layout.comboH,
    })

    for (const pos of layout.positions) {
      const child = children.find(c => c.id === pos.id)!
      child.position = {
        x: comboCenterX + pos.x + layout.offsetX - layout.comboW / 2,
        y: comboCenterY + pos.y + layout.offsetY - layout.comboH / 2,
      }
    }

    const combo = allNodes.find(n => n.id === comboId)!
    combo.width = layout.comboW
    combo.height = layout.comboH
    combo.position = { x: comboCenterX, y: comboCenterY }
  }

  // ── 阶段5：fitToCanvas（测量所有节点） ──
  fitToCanvas(routeMap, canvasWidth, canvasHeight, ls, contentTop, bounds, reservedZones)

  // ── 阶段6：自定义景点 canvas 直接定位到前后已知景点旁边 ──
  const nodeById6 = new Map(routeMap.nodes.map(n => [n.id, n]))
  const labelH6 = Math.max(12, Math.round(22 * ls))
  const allDayNodeIds = routeMap.days.flatMap(d => d.nodeIds)

  for (let i = 0; i < allDayNodeIds.length; i++) {
    const node = nodeById6.get(allDayNodeIds[i])
    if (!node || !node.isCustom) continue

    let anchor: RouteNode | undefined
    for (let j = i - 1; j >= 0; j--) {
      const p = nodeById6.get(allDayNodeIds[j])
      if (p && !p.isCustom && p.type === 'attraction') { anchor = p; break }
    }
    let nextKnown: RouteNode | undefined
    for (let j = i + 1; j < allDayNodeIds.length; j++) {
      const p = nodeById6.get(allDayNodeIds[j])
      if (p && !p.isCustom && p.type === 'attraction') { nextKnown = p; break }
    }

    if (!anchor && !nextKnown) continue
    if (!anchor) anchor = nextKnown!

    let h = 0
    for (const ch of node.name) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0

    let dx: number, dy: number
    if (nextKnown) {
      const vx = nextKnown.position.x - anchor.position.x
      const vy = nextKnown.position.y - anchor.position.y
      const dist = Math.sqrt(vx * vx + vy * vy) || 1
      const nx = vx / dist, ny = vy / dist
      const px = -ny, py = nx
      const perpSign = (h & 1) ? 1 : -1
      dx = nx * labelH6 + px * perpSign * labelH6
      dy = ny * labelH6 + py * perpSign * labelH6
    } else {
      const vertSign = (h & 1) ? 1 : -1
      dy = vertSign * labelH6
      dx = ((h >> 8 & 0xFF) / 255 * 2 - 1) * Math.round(6 * ls)
    }

    node.position = { x: anchor.position.x + dx, y: anchor.position.y + dy }
  }
}

function fitToCanvas(
  routeMap: RouteMap,
  canvasWidth: number,
  canvasHeight: number,
  ls: number,
  contentTop: number = 0,
  bounds?: LayoutBounds,
  reservedZones?: ReservedZone[],
): void {
  const allNodes = routeMap.nodes

  // Use the same sizing as computePositions
  const PIN_SIZE = Math.round(52 * ls)
  const PIN_SHAPE_HH = Math.round(PIN_SIZE * 0.54)
  const LABEL_H = Math.round(24 * ls * 1.0 + 8 * ls)
  const LABEL_BELOW_GAP = Math.round(5 * ls)
  const PIN_HW = Math.round(65 * ls)
  const PIN_HH_ABOVE = PIN_SHAPE_HH
  const PIN_HH_BELOW = PIN_SHAPE_HH + LABEL_BELOW_GAP + LABEL_H

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const node of allNodes) {
    let hw: number, hhAbove: number, hhBelow: number
    if (node.type === 'combo' && node.width && node.height) {
      hw = node.width / 2
      hhAbove = node.height / 2
      hhBelow = node.height / 2
    } else if (node.type === 'city') {
      hw = PIN_HW
      hhAbove = PIN_HH_ABOVE
      hhBelow = PIN_HH_BELOW
    } else {
      continue
    }
    minX = Math.min(minX, node.position.x - hw)
    minY = Math.min(minY, node.position.y - hhAbove)
    maxX = Math.max(maxX, node.position.x + hw)
    maxY = Math.max(maxY, node.position.y + hhBelow)
  }

  const contentW = maxX - minX
  const contentH = maxY - minY
  if (contentW <= 0 || contentH <= 0) return

  // 可用区域：留出 header、footer、以及上下左右 padding
  const padTop = Math.round(15 * ls)
  const padBottom = Math.round(40 * ls)
  const padLR = Math.round(18 * ls)
  const footerH = Math.round(35 * ls)

  let areaX = bounds ? bounds.x + padLR : padLR
  let areaY = bounds ? bounds.y + padTop : contentTop + padTop
  let areaW = bounds ? bounds.width - padLR * 2 : canvasWidth - padLR * 2
  let areaH = bounds ? bounds.height - padTop - padBottom : canvasHeight - contentTop - padTop - footerH - padBottom

  // Shrink available area to avoid reserved zones (titles, decorations)
  if (reservedZones && reservedZones.length > 0) {
    for (const zone of reservedZones) {
      const zx = zone.x * canvasWidth
      const zy = zone.y * canvasHeight
      const zw = zone.width * canvasWidth
      const zh = zone.height * canvasHeight

      // If reserved zone overlaps with current available area, shrink from the closest side
      const overlapLeft = zx < areaX + areaW && zx + zw > areaX
      const overlapTop = zy < areaY + areaH && zy + zh > areaY
      if (!overlapLeft || !overlapTop) continue

      // Determine which side to shrink: prefer the side that removes less area
      const shrinkLeft = (zx + zw) - areaX  // removing left portion
      const shrinkRight = (areaX + areaW) - zx  // removing right portion
      const shrinkTop = (zy + zh) - areaY  // removing top portion
      const shrinkBottom = (areaY + areaH) - zy  // removing bottom portion

      const minShrink = Math.min(shrinkLeft, shrinkRight, shrinkTop, shrinkBottom)
      if (minShrink === shrinkLeft && shrinkLeft < areaW * 0.5) {
        areaX = zx + zw
        areaW -= shrinkLeft
      } else if (minShrink === shrinkRight && shrinkRight < areaW * 0.5) {
        areaW -= shrinkRight
      } else if (minShrink === shrinkTop && shrinkTop < areaH * 0.5) {
        areaY = zy + zh
        areaH -= shrinkTop
      } else if (minShrink === shrinkBottom && shrinkBottom < areaH * 0.5) {
        areaH -= shrinkBottom
      }
    }
  }

  const scaleX = areaW / contentW
  const scaleY = areaH / contentH
  const scale = Math.min(scaleX, scaleY)

  const contentCx = (minX + maxX) / 2
  const contentCy = (minY + maxY) / 2

  const areaCx = areaX + areaW / 2
  const areaCy = areaY + areaH / 2

  for (const node of allNodes) {
    const dx = node.position.x - contentCx
    const dy = node.position.y - contentCy
    node.position.x = areaCx + dx * scale
    node.position.y = areaCy + dy * scale
    if (node.width) node.width = Math.round(node.width * scale)
    if (node.height) node.height = Math.round(node.height * scale)
  }

  // ── Post-scale rect collision resolution ──
  // After scaling, minimum gaps may have shrunk below threshold; re-enforce
  const cityNodesScaled = allNodes.filter(n => n.type === 'city')
  const scalePinHW = PIN_HW * scale
  const scalePinHAbove = PIN_HH_ABOVE * scale
  const scalePinHBelow = PIN_HH_BELOW * scale
  const scaleMinGap = 4 * scale

  resolveRectCollisions(cityNodesScaled, canvasWidth, canvasHeight, () => ({
    halfW: scalePinHW,
    halfH_above: scalePinHAbove,
    halfH_below: scalePinHBelow,
  }), 20, scaleMinGap)

  // resolveRectCollisions 内部 clamp 用 scalePinHW（= PIN_HW * scale），
  // 当 scale < 1 时比实际渲染宽度小，会允许节点过于靠近右边缘，导致 'right' 标签溢出画布。
  // 单独对 X 轴加一次用"实际渲染宽度"的 clamp：
  //   - 'below' 标签：右延伸 ≈ 40px，PIN_HW(73) 已足够
  //   - 'right' 标签：右延伸 ≈ pin_half + gap + label ≈ 100px，需更大的安全边距
  // 用 90*ls 覆盖两种情况，只修 X 轴（Y 轴 resolveRectCollisions 内部已足够）
  // extra clamp：防止 'right' 标签溢出画布
  // 实际右延伸 ≈ pin半宽(20) + gap(7) + label宽(80) = 107px
  // 95*ls ≈ 106px，留 ~4px 安全边距
  // 比 PIN_HW(73px) 更保守，但比 100*ls(112px) 更宽松，保持布局尽量大
  const CLAMP_HW = Math.round(95 * ls)
  for (const node of cityNodesScaled) {
    node.position.x = Math.max(CLAMP_HW + 5, Math.min(canvasWidth - CLAMP_HW - 5, node.position.x))
  }

  routeMap._fitScale = scale
}
