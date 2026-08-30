import type { RouteMap, RouteNode } from '../types'
import type { LayoutBounds, ReservedZone } from './types'
import {
  CITY_CONFIG,
  SUBGRAPH_CONFIG,
  layoutNodes,
  layoutScale,
  resolveRectCollisions,
  enforceMinGap,
  type GeoLayoutInput,
} from './geoLayout'
import {
  computeComboRadius,
  computeComboDirection,
  computeSubBounds,
  type ComboLayout,
  type PlacedCombo,
  type CityPinSize,
} from './comboPlacement'
import { getElementSizes } from './elementSizes'
import { fitToCanvas } from './fitToCanvas'

export type { ReservedZone }

export function computePositions(
  routeMap: RouteMap,
  canvasWidth: number,
  canvasHeight: number,
  contentTop: number = 0,
  bounds?: LayoutBounds,
  reservedZones?: ReservedZone[],
): void {
  if (routeMap.nodes.length === 0) return

  const ls = layoutScale(canvasWidth, canvasHeight)
  const sizes = getElementSizes(ls)

  const scaledCityConfig = {
    ...CITY_CONFIG,
    collisionPadding: Math.max(CITY_CONFIG.collisionPadding, CITY_CONFIG.collisionPadding * ls),
  }
  const scaledSubConfig = {
    ...SUBGRAPH_CONFIG,
    collisionPadding: Math.max(SUBGRAPH_CONFIG.collisionPadding, SUBGRAPH_CONFIG.collisionPadding * ls),
  }

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

  // 阶段1：城市初始布局
  const cityInputs: GeoLayoutInput[] = cityNodes.map(n => ({
    id: n.id,
    lat: n.location.lat,
    lng: n.location.lng,
    radius: sizes.cityCollisionRadius,
  }))
  const cityPositions = layoutNodes(cityInputs, canvasWidth, canvasHeight, scaledCityConfig)
  for (const pos of cityPositions) {
    const node = cityNodes.find(n => n.id === pos.id)
    if (node) node.position = { x: pos.x, y: pos.y }
  }

  // 阶段1.5：矩形碰撞后处理
  // d3-force uses circles; post-process with actual rectangular bounds
  const dayStartCityIds = new Set<string>()
  for (const day of routeMap.days) {
    if (day.nodeIds.length > 0) {
      const firstNode = allNodes.find(n => n.id === day.nodeIds[0])
      if (firstNode?.type === 'city') dayStartCityIds.add(firstNode.id)
    }
  }

  resolveRectCollisions(cityNodes, canvasWidth, canvasHeight, (node) => {
    const extraAbove = dayStartCityIds.has(node.id)
      ? sizes.stickerH + Math.round(8 * ls)
      : 0
    return {
      halfW: sizes.cityCollisionHW,
      halfH_above: sizes.cityCollisionHHAbove + extraAbove,
      halfH_below: sizes.cityCollisionHHBelow,
    }
  })

  // 阶段2：子图布局 + combo 尺寸/方向
  const comboLayouts = new Map<string, ComboLayout>()
  const placedCombos: PlacedCombo[] = []
  const pinSize: CityPinSize = {
    halfW: sizes.cityCollisionHW,
    halfHAbove: sizes.cityCollisionHHAbove,
    halfHBelow: sizes.cityCollisionHHBelow,
  }

  for (const [comboId, children] of groups) {
    const city = comboToCity.get(comboId)
    if (!city || children.length === 0) continue

    const childRadii = new Map<string, number>()
    for (const n of children) {
      const nameLen = n.name.length
      const labelW = sizes.dotR * 2 + sizes.textGap + nameLen * sizes.charW
      const hasTime = !!n.time
      const labelH = hasTime ? sizes.lineH * 1.6 : sizes.lineH
      childRadii.set(n.id, Math.max(labelW, labelH) / 2)
    }

    const maxRadius = Math.max(...Array.from(childRadii.values()))
    const estimatedBoxSize = Math.max(
      maxRadius * 2 * Math.sqrt(children.length),
      children.length * sizes.lineH * 1.2,
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
      scaledSubConfig,
    )

    enforceMinGap(subPositions, childRadii, sizes.minNodeGap)

    // Recompute bounds after gap enforcement
    const { minX, minY, maxX, maxY } = computeSubBounds(subPositions, childRadii)
    let comboW = maxX - minX + sizes.comboPadding * 2
    let comboH = maxY - minY + sizes.comboPadding * 2
    let offsetX = -minX + sizes.comboPadding
    let offsetY = -minY + sizes.comboPadding

    // If estimate was far off, re-layout at actual size
    const actualBoxSize = Math.max(comboW, comboH)
    if (actualBoxSize / estimatedBoxSize < 0.5 || actualBoxSize / estimatedBoxSize > 2.0) {
      if (children.length > 1) {
        subPositions = layoutNodes(
          subInputs, actualBoxSize, actualBoxSize,
          scaledSubConfig,
        )
        enforceMinGap(subPositions, childRadii, sizes.minNodeGap)
        const r = computeSubBounds(subPositions, childRadii)
        comboW = r.maxX - r.minX + sizes.comboPadding * 2
        comboH = r.maxY - r.minY + sizes.comboPadding * 2
        offsetX = -r.minX + sizes.comboPadding
        offsetY = -r.minY + sizes.comboPadding
      }
    }

    const dir = computeComboDirection(
      city, cityNodes, routeMap.edges, comboW, comboH,
      canvasWidth, canvasHeight, placedCombos, sizes.pinGap, pinSize,
    )

    placedCombos.push({
      x: city.position.x + dir.x,
      y: city.position.y + dir.y,
      w: comboW, h: comboH,
    })

    comboLayouts.set(comboId, {
      comboW, comboH, offsetX, offsetY,
      dirX: dir.x, dirY: dir.y,
      positions: subPositions,
    })
  }

  // 阶段3：城市重布局（考虑 combo 空间）
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
    radius: Math.max(sizes.cityCollisionRadius, comboRadiusMap.get(n.id) ?? 0),
  }))

  const finalCityPositions = layoutNodes(enlargedCityInputs, canvasWidth, canvasHeight, scaledCityConfig)
  for (const pos of finalCityPositions) {
    const node = cityNodes.find(n => n.id === pos.id)
    if (node) node.position = { x: pos.x, y: pos.y }
  }

  // 阶段4：用新城市位置重新选择 combo 方向并放置
  const finalPlacedCombos: PlacedCombo[] = []

  for (const [comboId, layout] of comboLayouts) {
    const city = comboToCity.get(comboId)
    const children = groups.get(comboId)
    if (!city || !children) continue

    const dir = computeComboDirection(
      city, cityNodes, routeMap.edges, layout.comboW, layout.comboH,
      canvasWidth, canvasHeight, finalPlacedCombos, sizes.pinGap, pinSize,
    )

    let comboCenterX = city.position.x + dir.x
    let comboCenterY = city.position.y + dir.y

    // Clamp combo into canvas
    const edgeMargin = 5
    const comboLeft = comboCenterX - layout.comboW / 2
    const comboRight = comboCenterX + layout.comboW / 2
    const comboTop = comboCenterY - layout.comboH / 2
    const comboBottom = comboCenterY + layout.comboH / 2
    if (comboLeft < edgeMargin) comboCenterX += edgeMargin - comboLeft
    if (comboRight > canvasWidth - edgeMargin) comboCenterX -= comboRight - (canvasWidth - edgeMargin)
    if (comboTop < edgeMargin) comboCenterY += edgeMargin - comboTop
    if (comboBottom > canvasHeight - edgeMargin) comboCenterY -= comboBottom - (canvasHeight - edgeMargin)

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

  // 阶段5：fitToCanvas
  fitToCanvas(routeMap, canvasWidth, canvasHeight, sizes, contentTop, bounds, reservedZones)
}
