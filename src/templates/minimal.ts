import type { TemplateConfig } from './types'

export const minimalTemplate: TemplateConfig = {
  id: 'minimal',
  name: '极简',
  icon: '◇',
  description: '瑞士极简设计风格，大量留白配精准排版',

  colors: {
    pinFill: '#1A1A1A',
    attractionFill: '#4A4A4A',
    attractionStroke: '#FFFFFF',
    edgeStroke: '#1A1A1A',
    canvasBackground: '#FAFAFA',
  },

  fonts: {
    city: { size: 22, weight: '500', color: '#1A1A1A', family: "'SF Pro Display', 'Helvetica Neue', sans-serif" },
    attraction: { size: 18, weight: '300', color: '#4A4A4A', family: "'SF Pro Display', 'Helvetica Neue', sans-serif" },
  },

  gradient: {
    stops: [
      { offset: 0, color: '#FFFFFF' },
      { offset: 0.33, color: '#FAFAFA' },
      { offset: 0.66, color: '#F5F5F5' },
      { offset: 1, color: '#F0F0F0' },
    ],
  },
  gradientDirection: 'radial',

  header: {
    titleFont: { size: 32, weight: '300', color: '#1A1A1A', family: "'SF Pro Display', 'Helvetica Neue', sans-serif" },
    subtitleFont: { size: 12, weight: '400', color: '#AAAAAA', family: "'SF Pro Display', 'Helvetica Neue', sans-serif" },
    divider: { color: '#E0E0E0', style: 'solid' },
    align: 'left',
  },

  titleLayout: {
    x: 0.06,
    y: 0.94,
    align: 'left',
    color: '#1A1A1A',
    fontSize: 32,
    fontWeight: '300',
    fontFamily: "'SF Pro Display', 'Helvetica Neue', sans-serif",
    letterSpacing: 8,
  },

  subtitleLayout: {
    x: 0.06,
    y: 0.91,
    align: 'left',
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '400',
    fontFamily: "'SF Pro Display', 'Helvetica Neue', sans-serif",
    letterSpacing: 4,
  },

  decorations: [
    {
      type: 'line',
      x: 0.06,
      y: 0.92,
      width: 30,
      thickness: 2,
      color: '#FF0000',
    },
    {
      type: 'label',
      x: 0.94,
      y: 0.94,
      text: 'NO.1',
      fontSize: 10,
      color: '#CCCCCC',
      backgroundColor: 'transparent',
      borderRadius: 0,
      letterSpacing: 3,
    },
  ],

  frame: {
    borderColor: '#E0E0E0',
    margin: 24,
    borderWidth: 0.5,
    borderRadius: 0,
  },

  footer: {
    text: 'ROUTE MAP',
    color: 'rgba(0,0,0,0.1)',
    letterSpacing: 8,
  },

  background: { type: 'clean' },

  photoStyle: { borderRadius: 0, border: 'none', shadow: '0 2px 12px rgba(0,0,0,0.08)', opacity: 0.9, zIndex: -5 },

  cityPin: { shape: 'diamond', size: 40, showLabel: true, labelPosition: 'right' },
  attractionNode: { shape: 'dot', size: 4, showLabel: true, labelPosition: 'right' },
  edge: { lineType: 'curve', trailStyle: 'dash', showTransportBadge: false, glowEffect: false, colorMode: 'day-tinted' },
  daySticker: { style: 'pill', position: 'above-first-node' },
  headerHeight: 60,
}
