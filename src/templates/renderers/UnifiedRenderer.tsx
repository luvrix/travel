import { useMemo } from 'react'
import {
  type RendererProps,
  visualScale, buildGradient,
  computeEdgePaths,
} from './shared'
import {
  Frame, Title, Decorations, EdgeLayer, TransportBadges,
  CityPins, AttractionNodes, DayStickers, Footer,
} from './components'

export function UnifiedRenderer({ routeMap, template, canvasWidth, canvasHeight, hasBackgroundPhoto }: RendererProps) {
  const s = visualScale(canvasWidth, canvasHeight)
  const fs = s * Math.min(routeMap._fitScale ?? 1, 1)
  const cities = routeMap.nodes.filter(n => n.type === 'city')
  const attractions = routeMap.nodes.filter(n => n.type === 'attraction')

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

      {/* Cinematic overlay */}
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

      <Frame template={template} s={s} />

      {/* Title & Decorations */}
      <Title template={template} s={s} canvasWidth={canvasWidth} canvasHeight={canvasHeight} title={routeMap.title} date={routeMap.startDate} />
      <Decorations template={template} s={s} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />

      <EdgeLayer edges={edgePaths} template={template} s={fs} />
      <TransportBadges edges={edgePaths} template={template} s={fs} />
      <EdgeLayer edges={edgePaths} template={template} s={fs} localOnly />

      <CityPins cities={cities} template={template} s={fs} canvasWidth={canvasWidth} />
      <AttractionNodes attractions={attractions} template={template} s={fs} />
      <DayStickers days={routeMap.days} nodeMap={nodeMap} template={template} s={fs} />
      <Footer template={template} s={s} />
    </>
  )
}
