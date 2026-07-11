/** 出行方式 */
export type TransportMode = 'flight' | 'train' | 'bus' | 'car' | 'taxi' | 'subway' | 'walk' | 'bike' | 'ship' | 'blink'

// ============ 第一层：用户输入模型 ============

export interface Trip {
  id: string
  title: string
  startDate: string
  days: Day[]
}

export interface Day {
  id: string
  color: string
  stops: Stop[]
}

export interface Stop {
  id: string
  name: string
  startTime: string
  location: { lat: number; lng: number }
  transport?: TransportMode
}

// ============ 第二层：渲染 JSON ============

export interface RouteMap {
  title: string
  startDate: string
  days: RouteDay[]
  nodes: RouteNode[]
  edges: RouteEdge[]
  /** fitToCanvas 的缩放比，渲染端用于同步缩放字体/尺寸 */
  _fitScale?: number
}

export interface RouteDay {
  dayIndex: number
  color: string
  nodeIds: string[]
}

export interface RouteNode {
  id: string
  name: string
  type: 'attraction' | 'city' | 'combo'
  location: { lat: number; lng: number }
  position: { x: number; y: number }
  parentId?: string
  width?: number
  height?: number
  time?: string
  isCustom?: boolean
}

export interface RouteEdge {
  id: string
  sourceId: string
  targetId: string
  line: 'straight' | 'arc'
  dash: 'solid' | 'dashed'
  color: string
  icon?: TransportMode
  dayIndex: number
  time?: string
}
