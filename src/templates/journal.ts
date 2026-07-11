import type { TemplateConfig } from './types'

export const journalTemplate: TemplateConfig = {
  id: 'journal',
  name: '卡通',
  icon: '🎮',
  description: 'B站二次元风格，粉蓝撞色，青春活泼',

  colors: {
    pinFill: '#FB7299',
    attractionFill: '#23ADE5',
    attractionStroke: '#FFFFFF',
    comboFill: 'rgba(251,114,153,0.05)',
    comboStroke: 'rgba(251,114,153,0.12)',
    comboShadow: 'rgba(35,173,229,0.06)',
    cityLabelFill: '#18191C',
    attractionLabelFill: '#555555',
    transportIconColor: '#23ADE5',
    edgeStroke: '#FB7299',
    canvasBackground: '#F4F4F4',
  },

  fonts: {
    city: { size: 26, weight: '700', color: '#18191C', family: "'PingFang SC', 'Noto Sans SC', sans-serif" },
    attraction: { size: 20, weight: '500', color: '#555555', family: "'PingFang SC', 'Noto Sans SC', sans-serif" },
    transport: { size: 16, weight: '500', color: '#23ADE5', family: "'PingFang SC', sans-serif" },
  },

  gradient: {
    stops: [
      { offset: 0, color: '#FFFFFF' },
      { offset: 0.3, color: '#FBFBFC' },
      { offset: 0.7, color: '#F6F7F9' },
      { offset: 1, color: '#F4F4F4' },
    ],
  },
  gradientDirection: 'vertical',

  header: {
    titleFont: { size: 48, weight: '800', color: '#18191C', family: "'PingFang SC', 'Noto Sans SC', sans-serif" },
    subtitleFont: { size: 16, weight: '400', color: '#888888', family: "'PingFang SC', 'Noto Sans SC', sans-serif" },
    divider: { color: 'rgba(251,114,153,0.2)', style: 'solid' },
    align: 'center',
  },

  titleLayout: {
    x: 0.5,
    y: 0.065,
    align: 'center',
    color: '#18191C',
    fontSize: 48,
    fontWeight: '800',
    fontFamily: "'PingFang SC', 'Noto Sans SC', sans-serif",
    letterSpacing: 1,
  },

  subtitleLayout: {
    x: 0.5,
    y: 0.105,
    align: 'center',
    color: '#888888',
    fontSize: 16,
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
      color: '#FFFFFF',
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 20,
      padding: '2px 10px',
      backgroundColor: '#FB7299',
      letterSpacing: 1,
    },
    {
      type: 'badge',
      x: 0.94,
      y: 0.035,
      text: 'FREE',
      fontSize: 10,
      fontWeight: '600',
      color: '#23ADE5',
      backgroundColor: 'rgba(35,173,229,0.08)',
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
      color: 'rgba(251,114,153,0.3)',
    },
    {
      type: 'watermark',
      x: 0.5,
      y: 0.52,
      rotation: -3,
      text: 'TRIP',
      fontSize: 150,
      color: 'rgba(251,114,153,0.025)',
      fontWeight: '800',
      letterSpacing: 30,
    },
  ],

  frame: {
    borderColor: 'rgba(251,114,153,0.15)',
    innerLineColor: 'rgba(35,173,229,0.06)',
    margin: 16,
    borderWidth: 1.5,
    borderRadius: 20,
    innerLine: { margin: 8, borderWidth: 0.5, borderRadius: 14 },
  },

  footer: {
    text: 'ROUTE MAP',
    color: 'rgba(251,114,153,0.18)',
    letterSpacing: 3,
  },

  background: { type: 'clean' },

  photo: { type: 'hero', source: 'destination' },
  photoStyle: { borderRadius: 16, border: '3px solid rgba(255,255,255,0.9)', shadow: '0 4px 20px rgba(251,114,153,0.10)', filter: 'saturate(1.15)', zIndex: -5 },

  layout: {
    header: { x: 0, y: 0, width: 1, height: 0.12 },
    routeMap: { x: 0, y: 0, width: 1, height: 1 },
    footer: { x: 0, y: 0.95, width: 1, height: 0.05 },
    photos: { x: 0, y: 0, width: 1, height: 1 },
  },

  cityPin: { shape: 'circle-photo', size: 52, showPhoto: true, showLabel: true, labelPosition: 'below' },
  attractionNode: { shape: 'dot', size: 10, showLabel: true, labelPosition: 'right' },
  edge: { lineType: 'curve', trailStyle: 'dot-trail', showTransportBadge: true, glowEffect: false, colorMode: 'day-tinted' },
  comboCard: { style: 'glass', borderRadius: 16 },
  daySticker: { style: 'pill', position: 'above-first-node' },
  headerHeight: 140,
}
