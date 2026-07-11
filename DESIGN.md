# 旅游路线图 — 设计文档

## 1. 问题分析

现有旅游路线图工具（如 Google Maps、高德地图）存在两个核心体验问题：

### 1.1 距离畸变

```
实际地理位置:  A ---100m--- B ---100m--- C ---------100km--------- D
地图渲染结果:  [ABC] .............................................. D
```

A、B、C 在地图上聚合成一个点，无法区分。缩放到 D 则 ABC 挤成一坨，缩放到 ABC 则 D 消失在视野外。

### 1.2 路径冗余

地图默认按步行/骑行/驾车绘制实际道路路径。用户只关心"去了哪些地方、顺序是什么"，不关心怎么过去。

## 2. 核心设计理念

**保向示意地图 — 保持方位关系，压缩距离差异。**

- 苏州在上海的北面 → 地图上苏州就在北面
- 北京在上海的北方 → 地图上北京就在上方
- A/B/C 相距 100m、D 相距 100km → 地图上四者都清晰可见，不聚合、不溢出

```
真实地理:         示意地图（保向压缩）:

    ·D(100km)         ·D
    |                  |
    |                  |
  A·B·C(100m)      A·─·B·─·C

  ABC 聚成一坨      四点均清晰可辨
  D 远离视野        方位关系正确（D 在北）
```

三个核心原则：
1. **方位保真** — 相对方位（东南西北）必须正确
2. **距离非线性压缩** — 近处拉开、远处压缩，所有点同屏可见
3. **简约连线** — 景点间直线连接，不绘制实际道路

## 3. 布局算法：改良方位角投影 + 力导向碰撞修正

这是整个项目最核心的算法设计，采用两阶段管线：

### 3.1 Stage 1：改良方位角等距投影（幂律径向压缩）

**原理：** 以所有景点的地理重心为投影中心，对每个景点保持其方位角不变，仅对径向距离施加幂律压缩。

```
对于景点 P，相对于中心 C：
  原始:  d = 地理距离(P, C),  θ = 方位角(P, C)
  压缩:  d' = d^α,  θ' = θ  (方位角不变)
  映射:  x = d' · cos(θ),  y = d' · sin(θ)
```

**α 参数选择：**

| α | 1000:1 距离比压缩后 | 适用场景 |
|---|---|---|
| 0.3 | ~8:1 | 极端距离差异 |
| **0.4** | **~16:1** | **推荐默认值，平衡压缩与地理感** |
| 0.5 | ~32:1 | 温和压缩，保留更多地理感 |

以 α=0.4 为例：
- A→B 100m, B→C 100m, C→D 100km
- 原始距离比 1000:1 → 压缩后约 16:1
- ABC 之间不再聚合，D 也不至于飞出画面

**方位保真度分析：**

- 从中心出发的方位角：100% 精确保留
- 非中心点对方位（如 A 相对 B 的方向）：近似保留，误差与两点间距离/到中心距离的比值成正比。旅游场景下同一区域的景点间距远小于到中心的距离，误差可忽略

### 3.2 Stage 2：d3-force 碰撞修正

Stage 1 解决了宏观压缩，但近距离景点（100m 的 ABC）压缩后仍可能重叠。Stage 2 用力导向模拟推开重叠节点：

```typescript
const simulation = d3.forceSimulation(nodes)
  .force("x", d3.forceX(d => d.compressedX).strength(0.9))  // 强锚定到压缩位置
  .force("y", d3.forceY(d => d.compressedY).strength(0.9))  // 保持方位
  .force("collide", d3.forceCollide(MIN_SEPARATION))         // 最小间距防重叠
```

关键：锚定力（0.9）远大于碰撞力，节点只在必要时微移，方位几乎不偏。

### 3.3 为什么不用其他方案

| 方案 | 方位保真 | 处理 100m/100km | 复杂度 | 结论 |
|------|---------|----------------|--------|------|
| **改良方位角投影** | **优秀** | **优秀** | **低** | **采用** |
| MDS 多维缩放 | 差（无方位约束） | 中 | 中 | 不保证方位 |
| 纯力导向 | 中 | 差（无法压缩远距离） | 低 | 无法解决宏观压缩 |
| 等距线性（地铁图） | 无（丢失 2D 方位） | 优秀 | 低 | 不符合需求 |
| 带角度约束的应力优化 | 好（需调参） | 好 | 高 | 无现成库，需手写 |

### 3.4 多日行程处理

每日行程在同张地图上用不同颜色区分，景点位置按其真实坐标统一计算（不分日）。连线按日分组，颜色区分：

```
Day 1 (蓝):  ●·····●······●
Day 2 (橙):         ●·····●·····●
所有景点按地理方位排布在一张地图上
```

## 4. 技术架构

### 4.1 技术栈

| 层级 | 选型 | 理由 |
|------|------|------|
| 框架 | React 19 + TypeScript | 生态最强，图表库支持最好 |
| 地图渲染 | React Flow (@xyflow/react v12) | SVG 渲染、内置缩放/平移、自定义节点为 React 组件 |
| 投影计算 | d3-geo + 自定义投影函数 | 改良方位角投影基于 d3-geo 的 geoProjection 实现 |
| 碰撞修正 | d3-force | 力导向模拟防重叠，与压缩坐标配合 |
| 状态管理 | Zustand | 轻量、简单、TypeScript 友好 |
| 样式 | Tailwind CSS 4 | 原子化、极简输出 |
| 组件 | shadcn/ui | 无样式侵入、高度可定制 |
| 拖拽排序 | @dnd-kit/core | 侧边栏列表排序（移动端友好） |
| 动画 | framer-motion | 节点增删/位置变化时的平滑过渡 |
| 构建 | Vite 6 | 快速冷启动、HMR |

### 4.2 为什么选 React Flow

本项目本质是在 2D 空间中放置节点 + 连线，React Flow 完美匹配：

- **自定义节点** — 景点卡片直接写成 React 组件，Tailwind 样式
- **自定义连线** — 按日着色的直线
- **缩放/平移** — 内置支持，地图天然需要
- **SVG 渲染** — 节点数 5-20 个，SVG 交互性远优于 Canvas
- **拖拽** — 虽然本项目不允许随意拖动节点（位置由算法决定），但 React Flow 的拖拽能力可留作高级功能

### 4.3 渲染管线总览

```
地理坐标 (lat, lng)
    │
    ▼
[Stage 1] 改良方位角投影 (d3-geo custom projection)
    │  d' = d^0.4, θ 不变
    │  输出: 压缩后的 (x, y) 像素坐标
    ▼
[Stage 2] 力导向碰撞修正 (d3-force)
    │  强锚定 + 碰撞推开
    │  输出: 最终 (x, y) 像素坐标
    ▼
[渲染] React Flow
       Node: 景点卡片 (自定义 StopNode)
       Edge: 按日着色的直线 (自定义 StopEdge)
```

## 5. 数据模型：两层架构

用户写 Markdown，系统内部用严格 JSON。两层之间通过**推导引擎**连接：

```
Markdown (用户输入)          →  推导引擎  →  渲染 JSON (系统内部)
"10:00 故宫博物院 飞机"                         { nodeId, location, edgeType: "arc", ... }
```

渲染 JSON 是画图引擎的唯一数据源，所有隐式行为已被展开，引擎不需要做任何推断。

### 5.1 第一层：用户输入模型（Trip）

这是 Markdown 解析后的直接产物，保留用户意图，不做推导：

```typescript
interface Trip {
  id: string
  title: string
  startDate: string          // "2026-05-01"
  days: Day[]
}

interface Day {
  id: string
  color: string              // "#3B82F6"
  stops: Stop[]
}

interface Stop {
  id: string
  name: string               // "故宫博物院"
  startTime: string          // "10:00"
  location: { lat: number; lng: number }  // 由地理数据库查找填充
  transport?: TransportMode  // 用户指定的出行方式，未指定则为 undefined
}

type TransportMode = 'flight' | 'train' | 'bus' | 'car' | 'taxi' | 'subway' | 'walk' | 'bike'
```

### 5.2 第二层：渲染 JSON（RouteMap）

推导引擎从 Trip 生成 RouteMap，这是画图引擎的唯一输入：

```typescript
interface RouteMap {
  title: string
  startDate: string
  days: RouteDay[]
  nodes: RouteNode[]         // 所有节点（景点 + 城市），去重
  edges: RouteEdge[]         // 所有连线，类型已确定
}

interface RouteDay {
  dayIndex: number           // 0-based
  color: string
  /** 当日节点序列（引用 nodes 中的 id） */
  nodeIds: string[]
}

/** 渲染节点 — 景点或城市 */
interface RouteNode {
  id: string
  name: string
  type: 'attraction' | 'city'
  location: { lat: number; lng: number }
  /** 推导引擎计算的画布坐标 */
  position: { x: number; y: number }
}

/** 渲染连线 — 所有属性已确定，引擎直接画 */
interface RouteEdge {
  id: string
  sourceId: string
  targetId: string
  /** 连线类型：直线或弧线 */
  line: 'straight' | 'arc'
  /** 线型：实线或虚线 */
  dash: 'solid' | 'dashed'
  /** 颜色：同城用当日颜色，跨城用灰色 */
  color: string
  /** 交通方式图标（弧线中点或直线旁） */
  icon?: TransportMode
  /** 所属日（用于按日过滤） */
  dayIndex: number
}
```

### 5.3 推导引擎：Trip → RouteMap

推导引擎做三件事：**补全出行方式、插入城市节点、确定连线属性。**

```typescript
function compileTrip(trip: Trip): RouteMap {
  const nodeMap = new Map<string, RouteNode>()
  const edges: RouteEdge[] = []
  const routeDays: RouteDay[] = []

  for (let di = 0; di < trip.days.length; di++) {
    const day = trip.days[di]
    const dayNodeIds: string[] = []

    for (let si = 0; si < day.stops.length; si++) {
      const stop = day.stops[si]
      const city = getCity(stop.location)   // 从坐标反查城市名

      // 1. 注册景点节点
      ensureNode(nodeMap, stop.id, stop.name, 'attraction', stop.location)

      if (si === 0) {
        dayNodeIds.push(stop.id)
        continue
      }

      const prev = day.stops[si - 1]
      const prevCity = getCity(prev.location)
      const isCrossCity = city !== prevCity

      // 2. 补全出行方式
      const transport = stop.transport ?? inferTransport(isCrossCity)

      // 3. 构建连线
      if (isCrossCity) {
        // 跨城：插入出发城市节点 → 弧线 → 到达城市节点
        const prevCityId = ensureNode(nodeMap, `city-${prevCity}`, prevCity, 'city',
          findCityLocation(prevCity) ?? prev.location)
        const currCityId = ensureNode(nodeMap, `city-${city}`, city, 'city',
          findCityLocation(city) ?? stop.location)

        // prev → 出发城市（直线，当日色）
        edges.push(makeEdge(prev.id, prevCityId, 'straight', 'solid', day.color, undefined, di))
        // 出发城市 → 到达城市（弧线，虚线，灰色，带图标）
        edges.push(makeEdge(prevCityId, currCityId, 'arc', 'dashed', '#9CA3AF', transport, di))
        // 到达城市 → 当前景点（直线，当日色）
        edges.push(makeEdge(currCityId, stop.id, 'straight', 'solid', day.color, undefined, di))

        dayNodeIds.push(prevCityId, currCityId, stop.id)
      } else {
        // 同城：直线
        const edgeDash = ['bus', 'car'].includes(transport) ? 'dashed' : 'solid'
        edges.push(makeEdge(prev.id, stop.id, 'straight', edgeDash, day.color, transport, di))
        dayNodeIds.push(stop.id)
      }
    }

    routeDays.push({ dayIndex: di, color: day.color, nodeIds: dayNodeIds })
  }

  // 4. 计算布局坐标（投影 + 碰撞修正）
  const nodes = Array.from(nodeMap.values())
  computePositions(nodes)

  return {
    title: trip.title,
    startDate: trip.startDate,
    days: routeDays,
    nodes,
    edges,
  }
}

/** 推断出行方式 */
function inferTransport(isCrossCity: boolean): TransportMode {
  return isCrossCity ? 'flight' : 'walk'
}

/** 连线工厂 */
function makeEdge(
  sourceId: string, targetId: string,
  line: 'straight' | 'arc', dash: 'solid' | 'dashed',
  color: string, icon: TransportMode | undefined, dayIndex: number,
): RouteEdge {
  return {
    id: `edge-${sourceId}-${targetId}`,
    sourceId, targetId, line, dash, color,
    icon: icon ?? undefined,
    dayIndex,
  }
}

/** 确保节点唯一 */
function ensureNode(
  map: Map<string, RouteNode>,
  id: string, name: string, type: 'attraction' | 'city',
  location: { lat: number; lng: number },
): string {
  if (!map.has(id)) {
    map.set(id, { id, name, type, location, position: { x: 0, y: 0 } })
  }
  return id
}
```

### 5.4 完整示例

**用户 Markdown 输入：**

```markdown
# 北京3日游(2026-05-01)

## Day 1
- 07:00 上海
- 10:00 故宫博物院 飞机
- 11:30 景山公园 步行
- 13:00 南锣鼓巷 打车

## Day 2
- 08:30 八达岭长城 大巴
- 13:00 颐和园
- 15:30 圆明园

## Day 3
- 10:00 天坛公园
- 12:30 前门大街
- 18:00 上海 飞机
```

**推导引擎输出的渲染 JSON：**

```json
{
  "title": "北京3日游",
  "startDate": "2026-05-01",
  "days": [
    { "dayIndex": 0, "color": "#3B82F6", "nodeIds": ["s1","city-shanghai","city-beijing","s2","s3","s4"] },
    { "dayIndex": 1, "color": "#F59E0B", "nodeIds": ["s5","s6","s7"] },
    { "dayIndex": 2, "color": "#10B981", "nodeIds": ["s8","s9","city-beijing","city-shanghai","s10"] }
  ],
  "nodes": [
    { "id": "s1",  "name": "上海",         "type": "city",      "location": {"lat":31.23,"lng":121.47}, "position": {"x":0,"y":0} },
    { "id": "city-shanghai", "name": "上海", "type": "city",     "location": {"lat":31.23,"lng":121.47}, "position": {"x":0,"y":0} },
    { "id": "city-beijing",  "name": "北京", "type": "city",     "location": {"lat":39.90,"lng":116.40}, "position": {"x":0,"y":0} },
    { "id": "s2",  "name": "故宫博物院",     "type": "attraction","location": {"lat":39.92,"lng":116.40}, "position": {"x":0,"y":0} },
    { "id": "s3",  "name": "景山公园",       "type": "attraction","location": {"lat":39.92,"lng":116.40}, "position": {"x":0,"y":0} },
    { "id": "s4",  "name": "南锣鼓巷",       "type": "attraction","location": {"lat":39.94,"lng":116.40}, "position": {"x":0,"y":0} },
    { "id": "s5",  "name": "八达岭长城",     "type": "attraction","location": {"lat":40.36,"lng":116.02}, "position": {"x":0,"y":0} },
    { "id": "s6",  "name": "颐和园",         "type": "attraction","location": {"lat":39.99,"lng":116.27}, "position": {"x":0,"y":0} },
    { "id": "s7",  "name": "圆明园",         "type": "attraction","location": {"lat":40.01,"lng":116.30}, "position": {"x":0,"y":0} },
    { "id": "s8",  "name": "天坛公园",       "type": "attraction","location": {"lat":39.88,"lng":116.41}, "position": {"x":0,"y":0} },
    { "id": "s9",  "name": "前门大街",       "type": "attraction","location": {"lat":39.90,"lng":116.40}, "position": {"x":0,"y":0} },
    { "id": "s10", "name": "上海",           "type": "city",      "location": {"lat":31.23,"lng":121.47}, "position": {"x":0,"y":0} }
  ],
  "edges": [
    { "id": "e1",  "sourceId": "s1",  "targetId": "city-shanghai", "line": "straight", "dash": "solid",  "color": "#3B82F6", "icon": null,       "dayIndex": 0 },
    { "id": "e2",  "sourceId": "city-shanghai", "targetId": "city-beijing", "line": "arc", "dash": "dashed", "color": "#9CA3AF", "icon": "flight", "dayIndex": 0 },
    { "id": "e3",  "sourceId": "city-beijing",  "targetId": "s2",           "line": "straight", "dash": "solid",  "color": "#3B82F6", "icon": null,  "dayIndex": 0 },
    { "id": "e4",  "sourceId": "s2",  "targetId": "s3",  "line": "straight", "dash": "solid",  "color": "#3B82F6", "icon": "walk",     "dayIndex": 0 },
    { "id": "e5",  "sourceId": "s3",  "targetId": "s4",  "line": "straight", "dash": "solid",  "color": "#3B82F6", "icon": "taxi",     "dayIndex": 0 },
    { "id": "e6",  "sourceId": "s4",  "targetId": "s5",  "line": "straight", "dash": "dashed", "color": "#F59E0B", "icon": "bus",      "dayIndex": 1 },
    { "id": "e7",  "sourceId": "s5",  "targetId": "s6",  "line": "straight", "dash": "solid",  "color": "#F59E0B", "icon": "walk",     "dayIndex": 1 },
    { "id": "e8",  "sourceId": "s6",  "targetId": "s7",  "line": "straight", "dash": "solid",  "color": "#F59E0B", "icon": "walk",     "dayIndex": 1 },
    { "id": "e9",  "sourceId": "s7",  "targetId": "s8",  "line": "straight", "dash": "solid",  "color": "#10B981", "icon": "walk",     "dayIndex": 2 },
    { "id": "e10", "sourceId": "s8",  "targetId": "s9",  "line": "straight", "dash": "solid",  "color": "#10B981", "icon": "walk",     "dayIndex": 2 },
    { "id": "e11", "sourceId": "s9",  "targetId": "city-beijing",  "line": "straight", "dash": "solid",  "color": "#10B981", "icon": null,  "dayIndex": 2 },
    { "id": "e12", "sourceId": "city-beijing",  "targetId": "city-shanghai", "line": "arc", "dash": "dashed", "color": "#9CA3AF", "icon": "flight", "dayIndex": 2 },
    { "id": "e13", "sourceId": "city-shanghai", "targetId": "s10", "line": "straight", "dash": "solid",  "color": "#10B981", "icon": null,   "dayIndex": 2 }
  ]
}
```

**推导引擎做了什么（对比用户输入 vs 系统输出）：**

| 用户写的 | 系统推导 | 渲染 JSON 变化 |
|---------|---------|--------------|
| `- 07:00 上海` | 上海是城市 | `type: "city"` |
| `- 10:00 故宫 飞机` | 上海→北京跨城 | 插入 `city-shanghai` + `city-beijing` 节点，生成 3 条边（直线+弧线+直线） |
| `- 11:30 景山 步行` | 同城，步行 | `line: "straight", dash: "solid", icon: "walk"` |
| `- 13:00 南锣 打车` | 同城，打车 | `line: "straight", dash: "solid", icon: "taxi"` |
| `- 08:30 八达岭 大巴` | 同城（都在北京），大巴 | `dash: "dashed"` (大巴用虚线) |
| `- 13:00 颐和园` | 未指定方式→步行 | 自动补 `icon: "walk"` |
| `- 18:00 上海 飞机` | 北京→上海跨城 | 插入 `city-beijing` + `city-shanghai`（复用已有），生成弧线 |

### 5.5 出行方式的可视化映射

| TransportMode | 连线类型 | 说明 |
|---------------|---------|------|
| flight | 弧线 + 虚线 | 跨城默认，飞越天际 |
| train | 弧线 + 虚线 | 高铁也跨城，用弧线 |
| bus | 直线 + 虚线 | 长途大巴，虚线但不太弧 |
| car | 直线 + 虚线 | 自驾，可能有弯路 |
| taxi | 直线 + 实线 | 市内打车 |
| subway | 直线 + 实线 | 地铁 |
| walk | 直线 + 实线 | 步行，同城默认 |
| bike | 直线 + 实线 | 骑行 |
| 未指定 | 自动推断 | 同城=步行实线，跨城=飞机弧线 |

## 6. 坐标获取：离线地理数据库

布局算法的前提是每个景点有经纬度坐标。在离线优先的约束下，采用**三级降级策略**：

### 6.1 数据库结构

```
src/data/
├── cities.json          # 中国地级市（~340 条）
├── attractions.json     # 热门景点（~2000 条，5A + 头部4A）
└── districts.json       # 核心商圈/街区（~500 条）
```

**单条数据格式：**

```typescript
interface GeoEntry {
  name: string          // "故宫博物院"
  aliases?: string[]    // ["故宫", "紫禁城"]
  pinyin: string        // "gugongbowuyuan" — 用于拼音搜索
  lat: number           // 39.9163
  lng: number           // 116.3972
  city: string          // "北京"
  category: 'city' | 'attraction' | 'district'
}
```

**数据量估算：**

| 数据集 | 条数 | JSON 大小 | 说明 |
|--------|------|-----------|------|
| cities.json | ~340 | ~30 KB | 全国地级市及以上，含别名和拼音 |
| attractions.json | ~2000 | ~200 KB | 5A景区+头部4A+热门打卡点 |
| districts.json | ~500 | ~50 KB | 知名商圈、美食街、古街区 |
| **合计** | **~2840** | **~280 KB** | gzip 后约 60 KB，完全可接受 |

### 6.2 本地搜索算法

```typescript
import Fuse from 'fuse.js'
import { cities, attractions, districts } from '../data'

const SEARCH_INDEX = [
  ...cities, ...attractions, ...districts
]

const fuse = new Fuse(SEARCH_INDEX, {
  keys: [
    { name: 'name', weight: 2 },      // 名称最优先
    { name: 'aliases', weight: 1.5 },  // 别名次之
    { name: 'pinyin', weight: 0.8 },   // 拼音支持
    { name: 'city', weight: 0.5 },     // 城市名辅助
  ],
  threshold: 0.35,  // 宽松匹配，旅游场景用户输入不一定精确
  includeScore: true,
})

export function searchLocation(query: string): GeoEntry[] {
  return fuse.search(query).map(r => r.item).slice(0, 8)
}
```

**搜索示例：**

| 用户输入 | 匹配结果 |
|---------|---------|
| "故宫" | 故宫博物院 (北京) |
| "外滩" | 外滩 (上海) |
| "gugong" | 故宫博物院 (拼音匹配) |
| "西湖" | 西湖风景名胜区 (杭州) |
| "春熙路" | 春熙路商圈 (成都) |

### 6.3 三级降级流程

```
用户输入地址文本
    │
    ▼
[Level 1] 本地数据库搜索
    │  Fuse.js 模糊匹配
    │  命中 → 直接使用坐标
    ▼
[Level 2] 用户在示意地图上手动放置
    │  已有其他景点时：基于已有点推算
    │  无已有点时：放在画布中心
    ▼
[Level 3] 手动输入经纬度
    │  仅限高级用户
    ▼
坐标确定，参与布局计算
```

**Level 2 的手动放置交互：**

```
┌─────────────────────────────────┐
│  添加景点: 南锣鼓巷              │
│                                 │
│  未在数据库中找到该地点           │
│  请在地图上点击放置：             │
│                                 │
│        ·八达岭                   │
│        │                        │
│     故宫──景山                   │
│       点击此处 ← ─ ─ ─ ─ ─     │
│                                 │
│  提示：放置位置影响相对方位       │
│  南锣鼓巷在故宫的____方向         │
│  [东] [南] [西] [北]             │
│                                 │
│  [取消]           [确认放置]     │
└─────────────────────────────────┘
```

关键设计：手动放置时，提供方向提示按钮（东南西北），用户只需确认相对方位，系统自动推算坐标：

```typescript
function estimateCoordinate(
  referenceStop: Stop,     // 参考景点
  direction: '东' | '南' | '西' | '北' | '东北' | '西北' | '东南' | '西南',
  distanceKm: number = 5  // 默认 5km，示意地图中距离不敏感
): { lat: number; lng: number } {
  const bearing: Record<string, number> = {
    '东': 90, '西': 270, '南': 180, '北': 0,
    '东北': 45, '西北': 315, '东南': 135, '西南': 225,
  }
  const θ = bearing[direction] * Math.PI / 180
  const R = 6371 // 地球半径 km
  const δ = distanceKm / R

  const lat1 = referenceStop.location.lat * Math.PI / 180
  const lng1 = referenceStop.location.lng * Math.PI / 180

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(δ) + Math.cos(lat1) * Math.sin(δ) * Math.cos(θ)
  )
  const lng2 = lng1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(lat1),
    Math.cos(δ) - Math.sin(lat1) * Math.sin(lat2)
  )

  return { lat: lat2 * 180 / Math.PI, lng: lng2 * 180 / Math.PI }
}
```

### 6.4 数据维护

数据来源为公开的行政区划和景区名录，不涉及 API 调用：

| 数据 | 来源 | 更新频率 |
|------|------|----------|
| 城市坐标 | 国家统计局行政区划代码 + 公开经纬度数据 | 年度 |
| 景区名录 | 文旅部 5A/4A 景区公示名单 | 半年度 |
| 商圈/街区 | 人工整理头部热门地点 | 按需 |

数据打包进应用构建产物，无需运行时网络请求。

## 7. 关键算法实现

### 7.1 改良方位角投影

```typescript
import { geoProjection } from 'd3-geo'

/**
 * 创建改良方位角投影
 * 保持方位角不变，对径向距离施加幂律压缩
 * @param alpha 压缩指数，0.4 为推荐默认值
 */
function schematicAzimuthalRaw(alpha: number = 0.4) {
  return function(lambda: number, phi: number): [number, number] {
    const cx = Math.cos(lambda)
    const cy = Math.cos(phi)
    const k0 = cx * cy // 角距离的余弦

    if (k0 < -1 + 1e-6) return [2, 0] // 对跖点

    const angularDist = Math.acos(Math.max(-1, Math.min(1, k0)))

    // 幂律压缩径向距离
    const compressedDist = angularDist > 1e-10
      ? Math.pow(angularDist, alpha)
      : 0

    // 标准方位角投影公式，替换为压缩距离
    const k = angularDist > 1e-10
      ? compressedDist / Math.sin(angularDist)
      : 1

    return [
      k * cy * Math.sin(lambda),
      k * Math.sin(phi)
    ]
  }
}

// 使用：以行程地理中心为投影中心
function createSchematicProjection(
  centerLon: number,
  centerLat: number,
  width: number,
  height: number,
  alpha: number = 0.4
) {
  return geoProjection(schematicAzimuthalRaw(alpha))
    .scale(Math.min(width, height) / 4)
    .translate([width / 2, height / 2])
    .rotate([-centerLon, -centerLat])
}
```

### 7.2 力导向碰撞修正

```typescript
import d3 from 'd3-force'

interface LayoutNode {
  id: string
  compressedX: number  // Stage 1 输出
  compressedY: number
  x: number            // 最终输出
  y: number
}

const MIN_SEPARATION = 80  // 节点最小间距（px）

function resolveCollisions(nodes: LayoutNode[]): LayoutNode[] {
  const simulation = d3.forceSimulation(nodes)
    .force("x", d3.forceX<LayoutNode>(d => d.compressedX).strength(0.9))
    .force("y", d3.forceY<LayoutNode>(d => d.compressedY).strength(0.9))
    .force("collide", d3.forceCollide(MIN_SEPARATION))
    .alphaDecay(0.05)
    .stop()

  // 手动迭代至收敛（避免异步）
  for (let i = 0; i < 120; i++) simulation.tick()

  return nodes
}
```

### 7.3 布局管线：RouteMap → 坐标计算

推导引擎已生成 RouteMap（nodes + edges），布局管线只负责一件事：**把地理坐标换算成画布坐标。**

```typescript
import type { RouteMap, RouteNode } from '../types'

export function computePositions(
  routeMap: RouteMap,
  canvasWidth: number,
  canvasHeight: number,
  alpha: number = 0.4
): void {
  // 1. 计算地理重心
  const center = computeCentroid(routeMap.nodes.map(n => n.location))

  // 2. Stage 1: 改良方位角投影
  const projection = createSchematicProjection(
    center.lng, center.lat,
    canvasWidth, canvasHeight,
    alpha
  )

  // 计算压缩坐标
  for (const node of routeMap.nodes) {
    const [x, y] = projection([node.location.lng, node.location.lat])!
    node.position = { x: x ?? 0, y: y ?? 0 }
  }

  // 3. Stage 2: 碰撞修正
  const layoutNodes = routeMap.nodes.map(n => ({
    id: n.id,
    compressedX: n.position.x,
    compressedY: n.position.y,
    x: n.position.x,
    y: n.position.y,
  }))
  resolveCollisions(layoutNodes)

  // 写回坐标
  const resolvedMap = new Map(layoutNodes.map(n => [n.id, n]))
  for (const node of routeMap.nodes) {
    const resolved = resolvedMap.get(node.id)
    if (resolved) node.position = { x: resolved.x, y: resolved.y }
  }
}

function computeCentroid(locations: { lat: number; lng: number }[]) {
  const n = locations.length
  return {
    lat: locations.reduce((s, l) => s + l.lat, 0) / n,
    lng: locations.reduce((s, l) => s + l.lng, 0) / n,
  }
}
```

### 7.4 渲染管线总览

```
Markdown
  │
  ▼ parseMarkdown()
Trip (用户输入模型)
  │
  ▼ searchLocations() — 地理数据库查找坐标
Trip (坐标已填充)
  │
  ▼ compileTrip() — 推导引擎
RouteMap (渲染 JSON，nodes + edges 已确定)
  │
  ▼ computePositions() — 投影 + 碰撞修正
RouteMap (position 已计算)
  │
  ▼ React Flow 渲染
```

每一步的输入输出明确，任何一步都可以独立测试。

## 8. 界面设计

### 8.1 整体布局

```
┌──────────────────────────────────────────────────────────┐
│  北京 3 日游                               [设置] [导出]  │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│  侧边栏   │              示意地图画布                     │
│          │                                               │
│  Day 1   │         ○ 上海                                │
│   ✈ 上海→北京│          ╲                                │
│   10:00 故宫 │       ···✈️···                            │
│   11:30 景山 │            ╲                              │
│   13:00 南锣 │          ○ 北京                           │
│          │           ╱    ╲                              │
│  Day 2   │      故宫──景山  颐和园──圆明园                │
│   八达岭  │          ╲                                   │
│   颐和园  │        南锣鼓巷                               │
│   圆明园  │                                              │
│          │                                               │
│  Day 3   │         ·八达岭                               │
│   天坛    │                                              │
│   前门    │       天坛──前门大街                           │
│   ✈ 北京→上海│                  ╲                         │
│          │               ···✈️···                        │
│          │                    ╲                           │
│          │                   ○ 上海                      │
├──────────┴───────────────────────────────────────────────┤
│  点击景点查看详情 · 滚轮缩放 · 拖拽平移                     │
└──────────────────────────────────────────────────────────┘
```

**关键设计：** 两级视觉层级
- **城市节点** → 空心圆 `○`，简约，是交通枢纽
- **景点节点** → 卡片，承载信息，是停留点
- **跨城连线** → 弧线 + 虚线 + 交通图标，表示"飞过去"
- **同城连线** → 直线 + 实线 + 日颜色，表示"走过去"

### 8.2 节点样式 — 两类

**景点节点（StopNode）：**

```
  ┌──────────────┐
  │  故宫博物院    │  ← 景点名
  │  09:00        │  ← 到达时间
  └──────────────┘
```

- 圆角卡片，白色背景，浅灰边框
- 选中时左侧色条高亮当日颜色

**城市节点（TransitNode）：**

```
     ○ 上海
```

- 空心圆 + 城市名标签
- 圆直径 10px，灰色边框
- 不承载详情信息，仅作为交通端点

### 8.3 连线样式 — 两类

**同城连线（StraightEdge）：**

```
  ┌──────┐          ┌──────┐
  │ 故宫  │──────────│ 景山  │
  └──────┘          └──────┘
       实线，1.5px，当日颜色
```

- 直线，实线
- 粗细 1.5px，颜色对应所属日

**跨城连线（ArcEdge）：**

```
  ○ 上海
    ╲
     ·········✈️·········
                          ╲
                        ○ 北京
     弧线，虚线，灰色，带交通图标
```

- 弧线（向上拱起，隐喻"飞过去"）
- 虚线 `strokeDasharray: 6 4`
- 灰色 `#9CA3AF`
- 弧线中点放置交通方式图标（✈️ 飞机 / 🚄 高铁 / 🚗 自驾）
- 往返两段弧线错开（一段拱起、一段下凹），避免重叠

### 8.4 α 参数交互

提供一个"地理感 — 示意感"滑块，让用户调节 α 值：

```
地理感 ◀━━━━━━━━━━●━━━━▶ 示意感
         α=0.5      α=0.4      α=0.3
       (接近真实)  (推荐)    (最大压缩)
```

α 越小压缩越强，所有点越集中；α 越大越接近真实地理距离。

### 8.5 移动端适配

| 场景 | 方案 |
|------|------|
| 窄屏 (<768px) | 侧边栏变为底部抽屉，地图全屏 |
| 触控操作 | 双指缩放、单指平移 |
| 节点尺寸 | 最小 44px 触控区域 |
| 信息展示 | 点击节点弹出详情底部弹窗 |

### 8.6 视觉风格

- **配色**: 白底 + 灰度文字 + 每日行程一个强调色
- **连线颜色**: Day1=#3B82F6(蓝), Day2=#F59E0B(橙), Day3=#10B981(绿)...
- **字体**: 系统默认（-apple-system, sans-serif）
- **图标**: Lucide Icons（线条风格）
- **动画**: 节点位置变化时平滑过渡（300ms ease）, α 滑块调节时实时重投影

## 9. 功能清单

### P0 — MVP

| 功能 | 描述 |
|------|------|
| 创建行程 | 输入行程名称、日期范围 |
| 添加单日 | 在行程中添加"Day 1"、"Day 2"... |
| 添加景点 | 输入名称，本地数据库模糊搜索匹配坐标；未命中时手动放置 |
| 示意地图渲染 | 保向压缩投影 + 碰撞修正 + React Flow 渲染 |
| 按日着色连线 | 不同日的路线用不同颜色区分 |
| 缩放平移 | 画布支持鼠标滚轮缩放、拖拽平移 |
| 删除景点 | 从列表和地图中移除 |
| 导出图片 | 将示意地图导出为 PNG（2x 高清）/ SVG |
| 导出 Markdown | 结构化行程文本（天数、时间、从→到、时长、备注） |

### P1 — 增强

| 功能 | 描述 |
|------|------|
| 景点详情 | 点击节点弹出详情面板（描述、时长、标签、备注） |
| 侧边栏拖拽排序 | 调整景点在当日行程中的顺序 |
| α 滑块 | "地理感—示意感"调节，实时重投影 |
| 景点搜索/选点 | 本地 Fuse.js 搜索自动补全 + 手动方位放置兜底 |
| 复制到剪贴板 | Markdown 行程一键复制 |
| 本地存储 | 数据持久化到 localStorage |

### P2 — 进阶

| 功能 | 描述 |
|------|------|
| 多日行程叠加 | 所有天的路线同屏显示，颜色区分 |
| 迷你参考地图 | 角落显示真实地理小地图，辅助定位 |
| 分享 | 生成分享链接/图片 |
| 模板 | 预设热门城市行程模板 |

## 10. 项目结构

```
travel/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx                       # 入口
│   ├── App.tsx                        # 根组件
│   ├── types/
│   │   └── index.ts                   # 数据模型（Trip, Day, Stop）
│   ├── store/
│   │   └── trip-store.ts              # 状态管理（zustand）
│   ├── data/
│   │   ├── cities.json                # 中国地级市坐标（~340条）
│   │   ├── attractions.json           # 热门景点坐标（~2000条）
│   │   └── districts.json             # 核心商圈/街区坐标（~500条）
│   ├── geo/
│   │   ├── search.ts                  # Fuse.js 本地模糊搜索
│   │   ├── coordinate-estimator.ts    # 方位推算坐标（手动放置时）
│   │   └── types.ts                   # GeoEntry 类型定义
│   ├── projection/
│   │   ├── schematic-azimuthal.ts     # 改良方位角投影（Stage 1）
│   │   ├── collision-resolver.ts      # 力导向碰撞修正（Stage 2）
│   │   └── layout-pipeline.ts         # 完整布局管线
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx          # 整体布局骨架
│   │   │   ├── Sidebar.tsx            # 侧边栏
│   │   │   └── CanvasArea.tsx         # 画布区域容器
│   │   ├── trip/
│   │   │   ├── TripHeader.tsx         # 行程标题栏
│   │   │   ├── DayGroup.tsx           # 单日分组（列表模式）
│   │   │   ├── StopItem.tsx           # 侧边栏景点条目
│   │   │   ├── AddStopButton.tsx      # 添加景点按钮
│   │   │   └── MarkdownEditor.tsx     # Markdown 文本编辑器
│   │   ├── canvas/
│   │   │   ├── RouteCanvas.tsx        # React Flow 画布
│   │   │   ├── StopNode.tsx           # 景点节点（卡片）
│   │   │   ├── TransitNode.tsx        # 城市节点（空心圆）
│   │   │   ├── StraightEdge.tsx       # 同城连线（直线实线）
│   │   │   ├── ArcEdge.tsx            # 跨城连线（弧线虚线 + 图标）
│   │   │   └── AlphaSlider.tsx        # α 参数滑块
│   │   └── dialogs/
│   │       ├── CreateTripDialog.tsx
│   │       ├── AddStopDialog.tsx       # 含地图选点
│   │       ├── StopDetailDialog.tsx
│   │       └── ExportDialog.tsx        # 导出选项面板
│   ├── hooks/
│   │   ├── useLayout.ts               # 布局计算 + 重投影
│   │   └── useTrip.ts                 # 行程数据操作
│   ├── lib/
│   │   ├── geo.ts                     # 地理计算（质心、距离、方位角）
│   │   ├── persistence.ts             # localStorage 读写
│   │   ├── markdown-parser.ts         # Markdown → Trip 解析
│   │   ├── markdown-generator.ts      # Trip → Markdown 生成
│   │   └── image-export.ts            # PNG/SVG 图片导出
│   └── styles/
│       └── globals.css                # Tailwind 基础样式
```

## 11. 自定义节点与连线

### 11.1 景点节点（StopNode）

```tsx
import { Handle, Position } from '@xyflow/react'
import type { Stop } from '../types'

export function StopNode({ data, selected }: { data: Stop; selected: boolean }) {
  return (
    <div
      className={`
        min-w-[100px] rounded-lg border bg-white px-3 py-2 shadow-sm
        ${selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}
      `}
    >
      <div className="text-sm font-medium text-gray-900">{data.name}</div>
      {data.startTime && (
        <div className="mt-0.5 text-xs text-gray-400">{data.startTime}</div>
      )}
      <Handle type="target" position={Position.Top} className="!bg-transparent !w-0 !h-0 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !w-0 !h-0 !border-0" />
      <Handle type="target" position={Position.Left} className="!bg-transparent !w-0 !h-0 !border-0" />
      <Handle type="source" position={Position.Right} className="!bg-transparent !w-0 !h-0 !border-0" />
    </div>
  )
}
```

### 11.2 城市节点（TransitNode）

```tsx
import { Handle, Position } from '@xyflow/react'

export function TransitNode({ data }: { data: { name: string } }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-400 bg-white" />
      <div className="mt-1 text-xs text-gray-500">{data.name}</div>
      <Handle type="target" position={Position.Top} className="!bg-transparent !w-0 !h-0 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !w-0 !h-0 !border-0" />
      <Handle type="target" position={Position.Left} className="!bg-transparent !w-0 !h-0 !border-0" />
      <Handle type="source" position={Position.Right} className="!bg-transparent !w-0 !h-0 !border-0" />
    </div>
  )
}
```

### 11.3 同城连线（StraightEdge）

```tsx
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'

export function StraightEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    curvature: 0,
  })

  return (
    <BaseEdge
      path={edgePath}
      style={{ ...style, strokeWidth: 1.5 }}
    />
  )
}
```

### 11.4 跨城连线（ArcEdge）

弧线向上拱起，隐喻"飞越"。中点放置交通方式图标。往返两段弧线方向错开。

```tsx
import { BaseEdge, type EdgeProps } from '@xyflow/react'
import { Plane, Train, Car } from 'lucide-react'

const MODE_ICONS = {
  flight: Plane,
  train: Train,
  car: Car,
}

export function ArcEdge({
  sourceX, sourceY, targetX, targetY,
  data,
  style,
}: EdgeProps & { data?: { mode?: string } }) {
  const mode = (data?.mode ?? 'flight') as keyof typeof MODE_ICONS
  const Icon = MODE_ICONS[mode] ?? Plane

  // 计算弧线：控制点在中点上方偏移
  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const dist = Math.sqrt(dx * dx + dy * dy)
  // 弧高 = 距离的 20%，方向垂直于连线向上
  const arcHeight = dist * 0.2
  const cx = midX - (dy / dist) * arcHeight
  const cy = midY + (dx / dist) * arcHeight

  const path = `M ${sourceX} ${sourceY} Q ${cx} ${cy} ${targetX} ${targetY}`

  return (
    <>
      <BaseEdge
        path={path}
        style={{
          ...style,
          stroke: '#9CA3AF',
          strokeWidth: 1.5,
          strokeDasharray: '6 4',
        }}
      />
      {/* 交通图标在弧线中点 */}
      <foreignObject x={midX - 10} y={midY - 10} width={20} height={20}>
        <Icon className="w-3.5 h-3.5 text-gray-400" />
      </foreignObject>
    </>
  )
}
```

## 12. Markdown：双向数据格式

Markdown 不只是导出格式，还是**输入格式**。用户手写一段 Markdown，系统直接解析成行程数据并渲染示意地图。编辑器里改文字，地图实时更新；地图上操作，编辑器里文字同步变化。

### 12.1 格式设计原则

1. **用户随手能写** — 不需要学任何新语法，就是普通 Markdown
2. **最小约定** — 只靠 `#` `##` `-` 和自然的时间写法来结构化
3. **容错解析** — 时间和日期都是可选的，只有地点名是必须的
4. **双向同步** — 编辑器 ↔ 地图，任一侧修改都实时反映到另一侧

### 12.2 格式规范

每行固定三段：**时间 地点 出行方式**。时间必填，出行方式可选。

```markdown
# 行程标题(起始日期)

## Day 1
- 07:00 上海
- 10:00 故宫博物院 飞机
- 11:30 景山公园 步行
- 13:00 南锣鼓巷 打车

## Day 2
- 08:30 八达岭长城 大巴
- 13:00 颐和园
- 15:30 圆明园

## Day 3
- 10:00 天坛公园
- 12:30 前门大街
- 18:00 上海 飞机
```

**解析规则：**

| 语法元素 | 格式 | 是否必填 | 示例 |
|---------|------|---------|------|
| 行程标题 | `# 标题(起始日期)` | 是 | `# 北京3日游(2026-05-01)` |
| 日序 | `## Day N` | 是 | `## Day 1` |
| 时间 | `HH:MM` 在最前面 | **是** | `07:00` |
| 地点 | 时间后面的文本 | 是 | `故宫博物院` |
| 出行方式 | 地点名后面的中文关键词 | 否 | `飞机` |

**完整顺序：** `- HH:MM 地点名 [出行方式]`

**出行方式关键词（纯文本，纯键盘输入）：**

| 方式 | 关键词 | 别名 | 地图表现 |
|------|--------|------|---------|
| 飞机 | 飞机 | 飞、航班 | 弧线虚线 |
| 高铁 | 高铁 | 火车、动车 | 弧线虚线 |
| 大巴 | 大巴 | 巴士、客运 | 直线虚线 |
| 自驾 | 自驾 | 开车 | 直线虚线 |
| 出租车 | 打车 | 出租、的士 | 直线实线 |
| 地铁 | 地铁 | — | 直线实线 |
| 步行 | 步行 | 走、走路 | 直线实线 |
| 骑行 | 骑行 | 骑车 | 直线实线 |

> 别名是给用户便利的，系统内部统一映射到一种 TransportMode。

**完整示例（跨城往返）：**

```markdown
# 北京3日游(2026-05-01)

## Day 1
- 07:00 上海
- 10:00 故宫博物院 飞机
- 11:30 景山公园 步行
- 13:00 南锣鼓巷 打车

## Day 2
- 08:30 八达岭长城 大巴
- 13:00 颐和园
- 15:30 圆明园

## Day 3
- 10:00 天坛公园
- 12:30 前门大街
- 18:00 上海 飞机
```

**系统自动推导（隐式行为）：**

| 用户写的 | 系统理解 | 地图渲染 |
|---------|---------|---------|
| `- 07:00 上海` → `- 10:00 故宫 飞机` | 从上海飞到北京故宫 | ○上海 ╌飞机╌ ○北京 ── 故宫 |
| `- 11:30 景山 步行` | 从故宫步行到景山 | 故宫 ──步行── 景山 |
| `- 13:00 南锣 打车` | 从景山打车到南锣 | 景山 ──打车── 南锣 |
| `- 18:00 上海 飞机` | 从北京飞回上海 | 南锣 ── ○北京 ╌飞机╌ ○上海 |

**最简示例（纯同城）：**

```markdown
# 周末苏州(2026-05-10)

## Day 1
- 09:00 拙政园
- 11:00 狮子林
- 13:00 平江路

## Day 2
- 09:00 虎丘
- 12:00 留园
- 14:00 山塘街
```

### 12.3 解析器实现

```typescript
interface ParsedTrip {
  title: string
  days: ParsedDay[]
}

interface ParsedDay {
  label: string       // "Day 1"
  stops: ParsedStop[]
}

interface ParsedStop {
  name: string
  startTime: string      // 必填
  transport?: TransportMode
}

// 关键词 → TransportMode 映射（含别名）
const TRANSPORT_KEYWORDS: [string, TransportMode][] = [
  ['飞机', 'flight'], ['飞', 'flight'], ['航班', 'flight'],
  ['高铁', 'train'], ['火车', 'train'], ['动车', 'train'],
  ['大巴', 'bus'], ['巴士', 'bus'], ['客运', 'bus'],
  ['自驾', 'car'], ['开车', 'car'],
  ['打车', 'taxi'], ['出租', 'taxi'], ['的士', 'taxi'],
  ['地铁', 'subway'],
  ['步行', 'walk'], ['走', 'walk'], ['走路', 'walk'],
  ['骑行', 'bike'], ['骑车', 'bike'],
]

// 按关键词长度降序排列，优先匹配长的（"步行" > "走"）
const SORTED_KEYWORDS = [...TRANSPORT_KEYWORDS].sort(
  (a, b) => b[0].length - a[0].length
)

function parseMarkdown(md: string): ParsedTrip {
  const lines = md.split('\n')
  let title = ''
  let startDate = ''
  const days: ParsedDay[] = []
  let currentDay: ParsedDay | null = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // # 标题(日期)
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      const heading = line.slice(2).trim()
      const dateMatch = heading.match(/\((\d{4}-\d{2}-\d{2})\)\s*$/)
      if (dateMatch) {
        startDate = dateMatch[1]
        title = heading.slice(0, heading.length - dateMatch[0].length).trim()
      } else {
        title = heading
      }
      continue
    }

    // ## Day N
    const dayMatch = line.match(/^##\s+Day\s+(\d+)/)
    if (dayMatch) {
      currentDay = { label: `Day ${dayMatch[1]}`, stops: [] }
      days.push(currentDay)
      continue
    }

    if (line.startsWith('- ') && currentDay) {
      const parsed = parseStopLine(line.slice(2).trim())
      if (parsed) currentDay.stops.push(parsed)
    }
  }

  return { title, startDate, days }
}

function parseStopLine(text: string): ParsedStop | null {
  // 格式: "HH:MM 地点名 [出行方式]"
  const timeMatch = text.match(/^(\d{1,2}:\d{2})\s+(.+)/)
  if (!timeMatch) return null  // 没有时间，跳过

  const startTime = timeMatch[1]
  let rest = timeMatch[2].trim()

  // 提取出行方式: 末尾关键词匹配
  let transport: TransportMode | undefined
  for (const [keyword, mode] of SORTED_KEYWORDS) {
    if (rest.endsWith(' ' + keyword) || rest === keyword) {
      transport = mode
      rest = rest.slice(0, rest.length - keyword.length).trim()
      break
    }
  }

  return { name: rest.trim(), startTime, transport }
}
```

### 12.4 反向生成：数据 → Markdown

```typescript
const MODE_LABEL: Record<TransportMode, string> = {
  flight: '飞机', train: '高铁', bus: '大巴', car: '自驾',
  taxi: '打车', subway: '地铁', walk: '步行', bike: '骑行',
}

function toMarkdown(trip: Trip): string {
  const lines: string[] = []

  lines.push(`# ${trip.title}(${trip.startDate})`)
  lines.push('')

  trip.days.forEach((day, i) => {
    lines.push(`## Day ${i + 1}`)
    lines.push('')

    for (const stop of day.stops) {
      const parts: string[] = ['- ', stop.startTime]
      parts.push(stop.name)
      if (stop.transport) parts.push(MODE_LABEL[stop.transport])
      lines.push(parts.join(' '))
    }
    lines.push('')
  })

  return lines.join('\n')
}
```

### 12.5 双向同步架构

```
┌─────────────────┐     parseMarkdown()     ┌──────────────┐
│                 │  ─────────────────────▶  │              │
│  Markdown 编辑器 │                          │  Trip 数据模型 │
│                 │  ◀─────────────────────  │              │
└─────────────────┘     toMarkdown()        └──────┬───────┘
                                                    │
                                      buildFlowData() + 搜索坐标
                                                    │
                                                    ▼
                                            ┌──────────────┐
                                            │  示意地图画布  │
                                            └──────────────┘
```

**同步规则：**

| 操作 | 触发 | 结果 |
|------|------|------|
| 编辑器输入 | `parseMarkdown()` | 更新 Trip 数据 → 地图重新渲染 |
| 地图上添加景点 | 更新 Trip 数据 | `toMarkdown()` → 编辑器内容更新 |
| 地图上删除景点 | 更新 Trip 数据 | `toMarkdown()` → 编辑器内容更新 |
| 地图上拖拽排序 | 更新 Trip 数据 | `toMarkdown()` → 编辑器内容更新 |
| 编辑器输入非法格式 | 解析容错 | 忽略无法解析的行，保留已有数据 |

### 12.6 编辑器界面

Markdown 编辑器作为侧边栏的一个 tab，与列表视图切换：

```
┌──────────────────────────────────────────────────────────┐
│  北京 3 日游                               [列表] [文本] │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│ # 北京3日游│           示意地图画布                        │
│          │                                               │
│ ## Day 1 │              ·八达岭                          │
│ - 09:00  │               ╲                               │
│   故宫   │          故宫──景山                            │
│ - 11:30  │              ╲                                │
│   景山   │            南锣鼓巷                            │
│ - 13:00  │                                               │
│   南锣   │         颐和园──圆明园                         │
│          │                                               │
│ ## Day 2 │                                               │
│ - 八达岭 │                                               │
│ - 颐和园 │                                               │
│          │                                               │
├──────────┴───────────────────────────────────────────────┤
│  左侧可直接编辑 Markdown，右侧地图实时更新                   │
└──────────────────────────────────────────────────────────┘
```

- **[列表]** tab：结构化列表视图，拖拽排序、添加/删除按钮
- **[文本]** tab：纯 Markdown 编辑器，直接编辑文本
- 两个 tab 共享同一个 Trip 数据模型，切换时内容一致

### 12.7 图片导出

**PNG** — html-to-image 将 React Flow SVG 画布光栅化：

```typescript
import { toPng } from 'html-to-image'

async function exportPng(canvasEl: HTMLElement, fileName = 'route-map.png') {
  const dataUrl = await toPng(canvasEl, {
    quality: 1,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  })
  const a = document.createElement('a')
  a.download = fileName
  a.href = dataUrl
  a.click()
}
```

**SVG** — 直接序列化 React Flow 底层 SVG：

```typescript
async function exportSvg(canvasEl: HTMLElement, fileName = 'route-map.svg') {
  const svg = canvasEl.querySelector('svg.react-flow__viewport')
  if (!svg) return
  const str = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' })
  const a = document.createElement('a')
  a.download = fileName
  a.href = URL.createObjectURL(blob)
  a.click()
  URL.revokeObjectURL(a.href)
}
```

**导出交互：** 点击顶栏"导出"按钮：

```
┌──────────────────────────┐
│  导出                    │
├──────────────────────────┤
│  [PNG]  [SVG]  [Markdown] │
│                    [复制] │
└──────────────────────────┘
```

四个操作一键触发，无需额外配置。

## 13. 实施路线

| 阶段 | 内容 | 预计时间 |
|------|------|----------|
| Phase 1 | 项目脚手架 + 数据模型 + 改良方位角投影 + React Flow 渲染 | 3 天 |
| Phase 2 | d3-force 碰撞修正 + 侧边栏 + 添加/删除景点 | 2 天 |
| Phase 3 | 景点搜索选点 + 景点详情 + α 滑块 + 本地持久化 | 3 天 |
| Phase 4 | 移动端适配 + 导出图片 + 视觉打磨 | 2 天 |
| Phase 5 | 多日叠加 + 迷你参考地图 + 分享 | 3 天 |

## 13. 依赖清单

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@xyflow/react": "^12.0.0",
    "d3-geo": "^3.1.0",
    "d3-force": "^3.0.0",
    "zustand": "^5.0.0",
    "framer-motion": "^12.0.0",
    "@dnd-kit/core": "^6.0.0",
    "@dnd-kit/sortable": "^10.0.0",
    "lucide-react": "^0.460.0",
    "fuse.js": "^7.0.0",
    "html-to-image": "^1.11.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/d3-geo": "^3.1.0",
    "@types/d3-force": "^3.0.0"
  }
}
```

## 14. 效果示意

### 14.1 跨城往返：上海 ✈ 北京 ✈ 上海

Markdown 输入:
```
- 07:00 上海
- 10:00 故宫博物院 飞机
- 11:30 景山公园 步行
- 13:00 南锣鼓巷 打车
- 18:00 上海 飞机
```

地图渲染:
```
  ○ 上海                            ○ 上海
    ╲                                  ↑
     ·····飞机·····                    ·····飞机·····
                   ╲                  ╱
                   ○ 北京 ────────────┘
                    ╱    ╲
               故宫──景山
                   ╲
               打车──南锣鼓巷

  城市节点○自动插入    弧线=跨城    直线=同城
```

用户只写了5个地点，系统自动：
- 识别上海→北京是跨城 → 插入两个城市节点 + 弧线
- 识别"飞机" → 弧线上显示飞机图标
- 识别故宫/景山/南锣在北京 → 同城直线
- 识别北京→上海是跨城 → 弧线返回

### 14.2 纯同城：北京 2 日游

Markdown 输入:
```
- 09:00 故宫博物院
- 11:00 景山公园
- 13:00 南锣鼓巷
- 14:00 八达岭长城 大巴
- 17:00 颐和园
```

地图渲染:
```
     ·八达岭
        ↑大巴
   故宫──景山
       ╲
     南锣鼓巷

  颐和园

  无城市节点，全部直线
  "大巴"标注在连线上
```

### 14.3 统一模型对比

| 旧设计（两种类型） | 新设计（统一 Stop） |
|---|---|
| Stop + Transit 两种类型 | 只有 Stop 一种类型 |
| 用户要区分"景点"和"交通" | 用户只写地点，出行方式是可选前缀 |
| Transit 需要 from/to 两个城市 | 出发地自动从前一个 Stop 推导 |
| 城市节点是 Transit 的一部分 | 城市节点由系统自动插入 |
| 连线类型由数据类型决定 | 连线类型由系统自动推导 |
