import type { TemplateConfig } from './types'

export const cinematicTemplate: TemplateConfig = {
  id: 'cinematic',
  name: '暗夜',
  icon: '🌃',
  description: '电影感霓虹风格，深色背景配发光线条',

  colors: {
    pinFill: '#00E5FF',
    attractionFill: '#7C4DFF',
    attractionStroke: 'rgba(124,77,255,0.3)',
    comboFill: 'rgba(255,255,255,0.06)',
    comboStroke: 'rgba(0,229,255,0.15)',
    comboShadow: 'rgba(0,229,255,0.08)',
    cityLabelFill: '#00E5FF',
    attractionLabelFill: '#B388FF',
    transportIconColor: '#00E5FF',
    edgeStroke: '#00BCD4',
    canvasBackground: '#0A0E27',
  },

  fonts: {
    city: { size: 28, weight: '700', color: '#00E5FF', family: "'SF Pro Display', 'Helvetica Neue', sans-serif" },
    attraction: { size: 22, weight: '500', color: '#B388FF', family: "'SF Pro Display', 'Helvetica Neue', sans-serif" },
    transport: { size: 18, weight: '400', color: '#00BCD4', family: 'sans-serif' },
  },

  gradient: {
    stops: [
      { offset: 0, color: '#0A0E27' },
      { offset: 0.3, color: '#121838' },
      { offset: 0.7, color: '#0D1229' },
      { offset: 1, color: '#080B1E' },
    ],
  },
  gradientDirection: 'vertical',

  header: {
    titleFont: { size: 60, weight: '800', color: '#FFFFFF', family: "'SF Pro Display', 'Helvetica Neue', sans-serif" },
    subtitleFont: { size: 28, weight: '400', color: 'rgba(255,255,255,0.6)', family: "'SF Pro Display', 'Helvetica Neue', sans-serif" },
    divider: { color: 'rgba(0,229,255,0.3)', style: 'solid' },
    align: 'center',
  },

  frame: {
    borderColor: 'rgba(0,229,255,0.2)',
    innerLineColor: 'rgba(0,229,255,0.08)',
    margin: 20,
    borderWidth: 1,
    borderRadius: 0,
    innerLine: { margin: 10, borderWidth: 1, borderRadius: 0 },
  },

  footer: {
    text: 'ROUTE MAP',
    color: 'rgba(0,229,255,0.20)',
    letterSpacing: 4,
  },

  background: {
    type: 'cinematic',
    topColor: 'rgba(0,0,0,0.7)',
    topStop: 0.15,
    bottomColor: 'rgba(0,0,0,0.8)',
    bottomStop: 0.70,
    colorWashOpacity: 0.25,
  },

  photo: { type: 'hero', source: 'destination' },
  photoStyle: { borderRadius: 8, border: '1px solid rgba(0,229,255,0.1)', shadow: '0 8px 32px rgba(0,0,0,0.5)', filter: 'saturate(0.85) contrast(1.1)', zIndex: -5 },
  layout: {
    header: { x: 0, y: 0, width: 1, height: 0.10 },
    routeMap: { x: 0, y: 0, width: 1, height: 1 },
    footer: { x: 0, y: 0.95, width: 1, height: 0.05 },
    photos: { x: 0, y: 0, width: 1, height: 1 },
  },

  cityPin: { shape: 'circle-photo', size: 60, showPhoto: true, showLabel: true, labelPosition: 'below' },
  attractionNode: { shape: 'dot', size: 10, showLabel: true, labelPosition: 'right' },
  edge: { lineType: 'curve', trailStyle: 'dot-trail', showTransportBadge: true, glowEffect: true, colorMode: 'day' },
  comboCard: { style: 'glass', borderRadius: 12 },
  daySticker: { style: 'pill', position: 'above-first-node' },
  headerHeight: 150,
}
