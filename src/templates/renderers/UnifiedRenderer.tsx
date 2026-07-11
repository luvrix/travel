import { useMemo } from 'react'
import type { RouteMap, RouteNode } from '../../types'
import type { TemplateConfig } from '../types'
import {
  type RendererProps,
  visualScale, rgba, buildGradient,
  computeEdgePaths,
} from './shared'
import {
  Frame, Title, Decorations, EdgeLayer, TransportBadges, ComboCards,
  CityPins, AttractionNodes, DayStickers, Footer,
} from './components'

export function UnifiedRenderer({ routeMap, template, canvasWidth, canvasHeight, hasBackgroundPhoto }: RendererProps) {
  const s = visualScale(canvasWidth, canvasHeight)
  const fs = s * Math.min(routeMap._fitScale ?? 1, 1)
  const cities = routeMap.nodes.filter(n => n.type === 'city')
  const attractions = routeMap.nodes.filter(n => n.type === 'attraction')
  const combos = routeMap.nodes.filter(n => n.type === 'combo')

  const nodeMap = useMemo(() => new Map(routeMap.nodes.map(n => [n.id, n])), [routeMap.nodes])
  const edgePaths = useMemo(
    () => computeEdgePaths(routeMap.edges, nodeMap, fs, template.colors.edgeStroke, template.edge.lineType, template.edge.colorMode),
    [routeMap.edges, nodeMap, fs, template.colors.edgeStroke, template.edge.lineType, template.edge.colorMode],
  )

  const bgGradient = buildGradient(template.gradient, template.gradientDirection)

  const bg = template.background

  return (
    <>
      {/* Background — zIndex -10 so photos (zIndex -5) render above it;
          reduce opacity when a background photo exists (zIndex -15) so it shows through
          data-bg-layer: excluded when exporting transparent-background version */}
      <div data-bg-layer style={{ position: 'absolute', inset: 0, background: bgGradient, zIndex: -10, opacity: hasBackgroundPhoto ? 0.25 : 1 }} />

      {/* Background overlays */}
      {bg.type === 'cinematic' && (
        <>
          <div data-bg-layer style={{
            position: 'absolute', inset: 0, zIndex: -10,
            background: `linear-gradient(180deg, ${bg.topColor} 0%, rgba(0,0,0,0.2) ${bg.topStop * 100}%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.1) 70%, ${bg.bottomColor} 100%)`,
            opacity: hasBackgroundPhoto ? 0.7 : 1,
          }} />
          <div data-bg-layer style={{
            position: 'absolute', inset: 0, zIndex: -10,
            background: bgGradient,
            opacity: hasBackgroundPhoto ? bg.colorWashOpacity * 0.5 : bg.colorWashOpacity,
            mixBlendMode: 'overlay',
          }} />
          {template.edge.glowEffect && (
            <div data-bg-layer style={{
              position: 'absolute', inset: 0, zIndex: -9,
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              opacity: hasBackgroundPhoto ? 0.3 : 1,
              pointerEvents: 'none',
            }} />
          )}
          {template.edge.glowEffect && (
            <div data-bg-layer style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 5,
              background: `linear-gradient(90deg, ${template.colors.pinFill}, ${template.colors.attractionFill})`,
              opacity: hasBackgroundPhoto ? 0.3 : 0.5,
              pointerEvents: 'none',
            }} />
          )}
        </>
      )}

      {bg.type === 'timeline' && (
        <>
          <div data-bg-layer style={{
            position: 'absolute', inset: 0, zIndex: -10,
            background: 'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 12%, rgba(0,0,0,0.2) 25%, rgba(0,0,0,0.1) 100%)',
            opacity: hasBackgroundPhoto ? 0.7 : 1,
          }} />
          <div data-bg-layer style={{
            position: 'absolute', inset: 0, zIndex: -10,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.6) 100%)',
            opacity: hasBackgroundPhoto ? 0.7 : 1,
          }} />
          <div data-bg-layer style={{
            position: 'absolute', inset: 0, zIndex: -10,
            background: bgGradient,
            opacity: hasBackgroundPhoto ? bg.colorWashOpacity * 0.5 : bg.colorWashOpacity,
            mixBlendMode: 'overlay',
          }} />
        </>
      )}

      <Frame template={template} s={s} />

      {/* Title & Decorations */}
      <Title template={template} s={s} canvasWidth={canvasWidth} canvasHeight={canvasHeight} title={routeMap.title} date={routeMap.startDate} />
      <Decorations template={template} s={s} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />

      {/* Legacy header for templates without titleLayout */}
      {!template.titleLayout && bg.type === 'timeline' && (
        <TimelineHeader template={template} s={s} title={routeMap.title} date={routeMap.startDate} />
      )}

      {bg.type === 'timeline' && (
        <TimelineSidebar days={routeMap.days} nodeMap={nodeMap} template={template} s={s} canvasHeight={canvasHeight} />
      )}

      <EdgeLayer edges={edgePaths} template={template} s={fs} />
      <TransportBadges edges={edgePaths} template={template} s={fs} />
      <ComboCards combos={combos} template={template} s={fs} />
      <EdgeLayer edges={edgePaths} template={template} s={fs} localOnly />

      {bg.type === 'timeline' ? (
        <TimelineCityPins cities={cities} template={template} s={fs} />
      ) : (
        <CityPins cities={cities} template={template} s={fs} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
      )}

      <AttractionNodes attractions={attractions} template={template} s={fs} />
      <DayStickers days={routeMap.days} nodeMap={nodeMap} template={template} s={fs} />
      <Footer template={template} s={s} />

      {/* Corner decorations */}
      {template.corners && <Corners corners={template.corners} s={s} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />}
    </>
  )
}

function Corners({ corners, s, canvasWidth, canvasHeight }: {
  corners: NonNullable<TemplateConfig['corners']>; s: number; canvasWidth: number; canvasHeight: number
}) {
  return (
    <>
      {corners.map((c, i) => {
        const isLeft = c.position.includes('left')
        const isTop = c.position.includes('top')
        return (
          <svg
            key={`corner-${i}`}
            style={{
              position: 'absolute',
              left: isLeft ? 0 : canvasWidth - c.width * s,
              top: isTop ? 0 : canvasHeight - c.height * s,
              width: c.width * s,
              height: c.height * s,
              pointerEvents: 'none',
            }}
            viewBox={`0 0 ${c.width} ${c.height}`}
            dangerouslySetInnerHTML={{ __html: c.svg }}
          />
        )
      })}
    </>
  )
}

// ── Timeline-specific sub-components ──

function TimelineHeader({ template, s, title, date }: {
  template: TemplateConfig; s: number; title: string; date: string
}) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      height: template.headerHeight,
      display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', justifyContent: 'center',
      paddingLeft: 30 * s,
      background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%)',
    }}>
      <div style={{
        fontSize: template.header.titleFont.size * s,
        fontWeight: template.header.titleFont.weight,
        color: '#FFFFFF',
        textShadow: '0 2px 12px rgba(0,0,0,0.7)',
        letterSpacing: 2 * s,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: template.header.subtitleFont.size * s,
        fontWeight: template.header.subtitleFont.weight,
        color: 'rgba(255,255,255,0.8)',
        textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        marginTop: 4 * s,
      }}>
        {date}
      </div>
    </div>
  )
}

function TimelineSidebar({ days, nodeMap, template, s, canvasHeight }: {
  days: RouteMap['days']; nodeMap: Map<string, RouteNode>; template: TemplateConfig; s: number; canvasHeight: number
}) {
  const lineX = 28 * s
  const topOffset = 120 * s
  const bottomOffset = 80 * s
  const trackH = canvasHeight - topOffset - bottomOffset

  return (
    <>
      <div style={{
        position: 'absolute',
        left: lineX, top: topOffset,
        width: 2 * s, height: trackH,
        background: 'rgba(255,255,255,0.2)',
      }} />
      {days.map((day) => {
        const y = topOffset + (trackH / days.length) * (day.dayIndex + 0.5)
        return (
          <div key={`tl-day-${day.dayIndex}`} style={{
            position: 'absolute',
            left: 0, top: y - 12 * s,
            width: 56 * s,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              position: 'absolute',
              left: lineX - 4 * s,
              width: 10 * s, height: 10 * s,
              borderRadius: '50%',
              background: day.color,
              boxShadow: `0 0 ${8 * s}px ${rgba(day.color, 0.5)}`,
            }} />
            <div style={{
              position: 'absolute',
              left: lineX + 16 * s,
              color: 'rgba(255,255,255,0.7)',
              fontSize: Math.round(18 * s),
              fontWeight: 600,
              whiteSpace: 'nowrap',
              letterSpacing: 0.5,
            }}>
              D{day.dayIndex + 1}
            </div>
          </div>
        )
      })}
    </>
  )
}

function TimelineCityPins({ cities, template, s }: {
  cities: RouteNode[]
  template: TemplateConfig; s: number
}) {
  const pin = template.cityPin
  const size = pin.size * s
  const shW = size * 0.75
  const shH = size * 0.75

  return (
    <>
      {cities.map(city => (
        <div key={city.id} style={{
          position: 'absolute',
          left: city.position.x - shW / 2,
          top: city.position.y - shH / 2,
          display: 'flex', alignItems: 'center', gap: 6 * s,
        }}>
          <div style={{
            width: shW, height: shH,
            borderRadius: 8 * s,
            border: `${2 * s}px solid ${template.colors.pinFill}`,
            boxShadow: `0 ${3 * s}px ${8 * s}px rgba(0,0,0,0.4)`,
            background: template.colors.pinFill,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: Math.round(size * 0.4), fontWeight: 700 }}>
              {city.name[0]}
            </span>
          </div>
          {pin.showLabel && (
            <div style={{
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: 10 * s,
              padding: `${3 * s}px ${10 * s}px`,
              color: '#fff',
              fontSize: Math.round(template.fonts.city.size * s),
              fontWeight: 700,
              whiteSpace: 'nowrap',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}>
              {city.time ? `${city.name}  ${city.time}` : city.name}
            </div>
          )}
        </div>
      ))}
    </>
  )
}
