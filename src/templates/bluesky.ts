import type { TemplateConfig } from './types'

export const blueskyTemplate: TemplateConfig = {
  id: 'bluesky',
  name: '蓝天',
  icon: '☁️',
  description: '清新天空风格，蓝白渐变配云朵装饰',

  colors: {
    pinFill: '#4A90D9',
    attractionFill: '#87CEEB',
    attractionStroke: '#FFFFFF',
    comboFill: 'rgba(200,230,250,0.3)',
    comboStroke: 'rgba(74,144,217,0.15)',
    comboShadow: 'rgba(74,144,217,0.10)',
    cityLabelFill: '#2E6BB0',
    attractionLabelFill: '#4A90D9',
    transportIconColor: '#ADD8E6',
    edgeStroke: '#ADD8E6',
    canvasBackground: '#87CEEB',
  },

  fonts: {
    city: { size: 26, weight: '700', color: '#2E6BB0', family: "'PingFang SC', 'Noto Sans SC', sans-serif" },
    attraction: { size: 22, weight: '500', color: '#4A90D9', family: "'PingFang SC', 'Noto Sans SC', sans-serif" },
    transport: { size: 18, weight: '400', color: '#ADD8E6', family: "'PingFang SC', sans-serif" },
  },

  gradient: {
    stops: [
      { offset: 0, color: '#87CEEB' },
      { offset: 0.33, color: '#B0E0E6' },
      { offset: 0.66, color: '#E0F0FF' },
      { offset: 1, color: '#F0F8FF' },
    ],
  },
  gradientDirection: 'vertical',

  header: {
    titleFont: { size: 54, weight: '800', color: '#FFFFFF', family: "'PingFang SC', 'Noto Sans SC', sans-serif" },
    subtitleFont: { size: 20, weight: '400', color: 'rgba(255,255,255,0.85)', family: "'PingFang SC', 'Noto Sans SC', sans-serif" },
    divider: { color: 'rgba(255,255,255,0.3)', style: 'solid' },
    align: 'center',
  },

  titleLayout: {
    x: 0.5,
    y: 0.07,
    align: 'center',
    color: '#FFFFFF',
    fontSize: 54,
    fontWeight: '800',
    fontFamily: "'PingFang SC', 'Noto Sans SC', sans-serif",
    textShadow: '0 2px 15px rgba(74,144,217,0.4), 0 0 30px rgba(135,206,235,0.3)',
    letterSpacing: 4,
  },

  subtitleLayout: {
    x: 0.5,
    y: 0.11,
    align: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 20,
    fontWeight: '400',
    fontFamily: "'PingFang SC', 'Noto Sans SC', sans-serif",
    textShadow: '0 1px 8px rgba(74,144,217,0.3)',
  },

  decorations: [
    {
      type: 'label',
      x: 0.06,
      y: 0.04,
      text: '☁ CLEAR SKY',
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
      backgroundColor: '#4A90D9',
      borderRadius: 20,
      padding: '3px 12px',
    },
    {
      type: 'label',
      x: 0.94,
      y: 0.04,
      text: '☀ INFINITE',
      fontSize: 11,
      fontWeight: '600',
      color: '#4A90D9',
      backgroundColor: 'rgba(255,255,255,0.8)',
      borderRadius: 20,
      padding: '3px 12px',
    },
    {
      type: 'line',
      x: 0.5,
      y: 0.13,
      width: 60,
      thickness: 1,
      color: 'rgba(255,255,255,0.5)',
    },
  ],

  frame: {
    borderColor: 'rgba(74,144,217,0.2)',
    innerLineColor: 'rgba(74,144,217,0.08)',
    margin: 16,
    borderWidth: 2,
    borderRadius: 20,
    innerLine: { margin: 8, borderWidth: 1, borderRadius: 16 },
  },

  footer: {
    text: 'ROUTE MAP',
    color: 'rgba(74,144,217,0.22)',
    letterSpacing: 4,
  },

  background: {
    type: 'cinematic',
    topColor: 'rgba(74,144,217,0.2)',
    topStop: 0.1,
    bottomColor: 'rgba(135,206,235,0.1)',
    bottomStop: 0.7,
    colorWashOpacity: 0.15,
  },

  photo: { type: 'hero', source: 'destination' },
  photoStyle: { borderRadius: 16, border: '3px solid rgba(255,255,255,0.7)', shadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: -5 },

  layout: {
    header: { x: 0, y: 0, width: 1, height: 0.12 },
    routeMap: { x: 0, y: 0, width: 1, height: 1 },
    footer: { x: 0, y: 0.95, width: 1, height: 0.05 },
    photos: { x: 0, y: 0, width: 1, height: 1 },
  },

  cityPin: { shape: 'circle-photo', size: 56, showPhoto: true, showLabel: true, labelPosition: 'below' },
  attractionNode: { shape: 'dot', size: 10, showLabel: true, labelPosition: 'right' },
  edge: { lineType: 'curve', trailStyle: 'dot-trail', showTransportBadge: true, glowEffect: true, colorMode: 'day-tinted' },
  comboCard: { style: 'glass', borderRadius: 16 },
  daySticker: { style: 'pill', position: 'above-first-node' },
  headerHeight: 140,
}
