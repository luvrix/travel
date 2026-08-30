import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { UnifiedRenderer } from './UnifiedRenderer'
import { getTemplate } from '../index'
import type { RouteMap } from '../../types'

const makeRouteMap = (overrides: Partial<RouteMap> = {}): RouteMap => ({
  title: '测试行程',
  startDate: '2026-06-01',
  days: [{ dayIndex: 0, color: '#3b82f6', nodeIds: ['n1', 'n2'] }],
  nodes: [
    { id: 'n1', name: '北京', type: 'city', location: { lat: 39.9, lng: 116.4 }, position: { x: 540, y: 960 } },
    { id: 'n2', name: '故宫', type: 'attraction', location: { lat: 39.92, lng: 116.39 }, position: { x: 600, y: 800 } },
  ],
  edges: [
    { id: 'e1', sourceId: 'n1', targetId: 'n2', line: 'straight', dash: 'solid', color: '#3b82f6', dayIndex: 0 },
  ],
  _fitScale: 1,
  ...overrides,
})

describe('UnifiedRenderer', () => {
  it('渲染标题和日期', () => {
    const { container } = render(
      <UnifiedRenderer
        routeMap={makeRouteMap({ title: '京沪3日游', startDate: '2026-07-15' })}
        template={getTemplate('minimal')}
        canvasWidth={1080}
        canvasHeight={1920}
      />,
    )
    expect(container.textContent).toContain('京沪3日游')
    expect(container.textContent).toContain('2026-07-15')
  })

  it('渲染所有 city 和 attraction 节点', () => {
    const { container } = render(
      <UnifiedRenderer
        routeMap={makeRouteMap()}
        template={getTemplate('minimal')}
        canvasWidth={1080}
        canvasHeight={1920}
      />,
    )
    expect(container.textContent).toContain('北京')
    expect(container.textContent).toContain('故宫')
  })

  it('跨城段（flight）渲染交通图标', () => {
    const routeMap = makeRouteMap({
      nodes: [
        { id: 'n1', name: '北京', type: 'city', location: { lat: 39.9, lng: 116.4 }, position: { x: 300, y: 600 } },
        { id: 'n2', name: '上海', type: 'city', location: { lat: 31.2, lng: 121.5 }, position: { x: 800, y: 1300 } },
      ],
      edges: [
        { id: 'e1', sourceId: 'n1', targetId: 'n2', line: 'arc', dash: 'dashed', color: '#3b82f6', icon: 'flight', dayIndex: 0 },
      ],
    })
    const { container } = render(
      <UnifiedRenderer
        routeMap={routeMap}
        template={getTemplate('minimal')}
        canvasWidth={1080}
        canvasHeight={1920}
      />,
    )
    // 跨城段应该有 SVG path（弧线）
    const paths = container.querySelectorAll('svg path')
    expect(paths.length).toBeGreaterThan(0)
  })

  it('切换不同模板不崩溃（8 套）', () => {
    const templateIds = ['minimal', 'magazine', 'journal', 'cinematic', 'bluesky', 'cartoon', 'handdrawn', 'trendy'] as const
    for (const id of templateIds) {
      const { unmount } = render(
        <UnifiedRenderer
          routeMap={makeRouteMap()}
          template={getTemplate(id)}
          canvasWidth={1080}
          canvasHeight={1920}
        />,
      )
      unmount()
    }
    // 走完无 throw 即通过
    expect(true).toBe(true)
  })

  it('节点为空时也不崩溃', () => {
    const { container } = render(
      <UnifiedRenderer
        routeMap={makeRouteMap({ nodes: [], edges: [] })}
        template={getTemplate('minimal')}
        canvasWidth={1080}
        canvasHeight={1920}
      />,
    )
    expect(container.textContent).toContain('测试行程')
  })
})
