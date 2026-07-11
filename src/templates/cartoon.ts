import type { TemplateConfig } from './types'

export const cartoonTemplate: TemplateConfig = {
  id: 'cartoon',
  name: '香氛',
  icon: '🎨',
  description: '小红书生活风格，珊瑚红配暖粉，圆润活泼',

  colors: {
    pinFill: '#FF2C55',
    attractionFill: '#FFB6C1',
    attractionStroke: '#FFFFFF',
    comboFill: 'rgba(255,44,85,0.04)',
    comboStroke: 'rgba(255,44,85,0.10)',
    comboShadow: 'rgba(255,182,193,0.10)',
    cityLabelFill: '#000000',
    attractionLabelFill: '#808080',
    transportIconColor: '#FF2C55',
    edgeStroke: '#D8A7B1',
    canvasBackground: '#FFF5F5',
  },

  fonts: {
    city: { size: 26, weight: '700', color: '#000000', family: "'PingFang SC', 'Noto Sans SC', sans-serif" },
    attraction: { size: 20, weight: '500', color: '#808080', family: "'PingFang SC', 'Noto Sans SC', sans-serif" },
    transport: { size: 16, weight: '500', color: '#FF2C55', family: "'PingFang SC', sans-serif" },
  },

  gradient: {
    stops: [
      { offset: 0, color: '#FFF5F5' },
      { offset: 0.3, color: '#FFF0F3' },
      { offset: 0.7, color: '#FFECF0' },
      { offset: 1, color: '#FFE8EE' },
    ],
  },
  gradientDirection: 'vertical',

  header: {
    titleFont: { size: 52, weight: '800', color: '#000000', family: "'PingFang SC', 'Noto Sans SC', sans-serif" },
    subtitleFont: { size: 18, weight: '400', color: '#808080', family: "'PingFang SC', 'Noto Sans SC', sans-serif" },
    divider: { color: 'rgba(255,44,85,0.15)', style: 'solid' },
    align: 'center',
  },

  titleLayout: {
    x: 0.5,
    y: 0.065,
    align: 'center',
    color: '#000000',
    fontSize: 52,
    fontWeight: '800',
    fontFamily: "'PingFang SC', 'Noto Sans SC', sans-serif",
    letterSpacing: 2,
  },

  subtitleLayout: {
    x: 0.5,
    y: 0.105,
    align: 'center',
    color: '#808080',
    fontSize: 18,
    fontWeight: '400',
    fontFamily: "'PingFang SC', 'Noto Sans SC', sans-serif",
    letterSpacing: 0.5,
  },

  decorations: [
    {
      type: 'badge',
      x: 0.06,
      y: 0.035,
      text: 'TRAVEL',
      fontSize: 10,
      fontWeight: '600',
      color: '#FF2C55',
      borderColor: 'rgba(255,44,85,0.20)',
      borderWidth: 1,
      borderRadius: 20,
      padding: '2px 10px',
      backgroundColor: 'rgba(255,44,85,0.06)',
      letterSpacing: 1,
    },
    {
      type: 'badge',
      x: 0.94,
      y: 0.035,
      text: 'LIFE',
      fontSize: 10,
      fontWeight: '600',
      color: '#FFB6C1',
      backgroundColor: '#FFF0F3',
      borderRadius: 20,
      padding: '2px 10px',
      letterSpacing: 1,
    },
    {
      type: 'line',
      x: 0.5,
      y: 0.13,
      width: 60,
      thickness: 2,
      color: '#FFB6C1',
    },
    {
      type: 'watermark',
      x: 0.5,
      y: 0.55,
      rotation: -4,
      text: 'TRIP',
      fontSize: 150,
      color: 'rgba(255,44,85,0.025)',
      fontWeight: '800',
      letterSpacing: 30,
    },
  ],

  frame: {
    borderColor: 'rgba(255,44,85,0.12)',
    innerLineColor: 'rgba(255,182,193,0.15)',
    margin: 16,
    borderWidth: 1.5,
    borderRadius: 24,
    innerLine: { margin: 8, borderWidth: 0.5, borderRadius: 18 },
  },

  footer: {
    text: 'ROUTE MAP',
    color: 'rgba(255,44,85,0.18)',
    letterSpacing: 4,
  },

  background: { type: 'clean' },

  photo: { type: 'hero', source: 'destination' },
  photoStyle: { borderRadius: 16, border: '3px solid rgba(255,255,255,0.8)', shadow: '0 4px 20px rgba(255,44,85,0.10)', filter: 'saturate(1.1)', zIndex: -5 },

  layout: {
    header: { x: 0, y: 0, width: 1, height: 0.12 },
    routeMap: { x: 0, y: 0, width: 1, height: 1 },
    footer: { x: 0, y: 0.95, width: 1, height: 0.05 },
    photos: { x: 0, y: 0, width: 1, height: 1 },
  },

  cityPin: { shape: 'circle-photo', size: 56, showPhoto: true, showLabel: true, labelPosition: 'below' },
  attractionNode: { shape: 'dot', size: 10, showLabel: true, labelPosition: 'right' },
  edge: { lineType: 'curve', trailStyle: 'dot-trail', showTransportBadge: true, glowEffect: false, colorMode: 'day-tinted' },
  comboCard: { style: 'glass', borderRadius: 20 },
  daySticker: { style: 'pill', position: 'above-first-node' },
  headerHeight: 145,
}
