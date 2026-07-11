import type { TemplateConfig } from './types'

export const magazineTemplate: TemplateConfig = {
  id: 'magazine',
  name: '杂志',
  icon: '📰',
  description: '杂志编辑风格，粗衬线字体配纯白背景',

  colors: {
    pinFill: '#1A1A1A',
    attractionFill: '#555555',
    attractionStroke: '#E0E0E0',
    comboFill: 'rgba(245,245,245,0.6)',
    comboStroke: '#E0E0E0',
    comboShadow: 'rgba(0,0,0,0.05)',
    cityLabelFill: '#1A1A1A',
    attractionLabelFill: '#555555',
    transportIconColor: '#999999',
    edgeStroke: '#CCCCCC',
    canvasBackground: '#FFFFFF',
  },

  fonts: {
    city: { size: 24, weight: '800', color: '#1A1A1A', family: "'Noto Serif SC', 'Songti SC', Georgia, serif" },
    attraction: { size: 20, weight: '400', color: '#555555', family: "'Noto Serif SC', 'Songti SC', Georgia, serif" },
    transport: { size: 16, weight: '300', color: '#999999', family: "'Noto Serif SC', Georgia, serif" },
  },

  gradient: {
    stops: [
      { offset: 0, color: '#FFFFFF' },
      { offset: 0.3, color: '#FAFAFA' },
      { offset: 0.7, color: '#F5F5F5' },
      { offset: 1, color: '#F0F0F0' },
    ],
  },
  gradientDirection: 'vertical',

  header: {
    titleFont: { size: 64, weight: '900', color: '#1A1A1A', family: "'Noto Serif SC', 'Songti SC', Georgia, serif" },
    subtitleFont: { size: 18, weight: '300', color: '#999999', family: "'Noto Serif SC', Georgia, serif" },
    divider: { color: '#1A1A1A', style: 'solid' },
    align: 'left',
  },

  titleLayout: {
    x: 0.06,
    y: 0.06,
    align: 'left',
    color: '#1A1A1A',
    fontSize: 64,
    fontWeight: '900',
    fontFamily: "'Noto Serif SC', 'Songti SC', Georgia, serif",
    letterSpacing: 8,
  },

  subtitleLayout: {
    x: 0.06,
    y: 0.10,
    align: 'left',
    color: '#999999',
    fontSize: 18,
    fontWeight: '300',
    fontFamily: "'Noto Serif SC', Georgia, serif",
  },

  decorations: [
    {
      type: 'badge',
      x: 0.06,
      y: 0.12,
      text: "EDITOR'S PICK",
      fontSize: 10,
      fontWeight: '700',
      color: '#1A1A1A',
      borderColor: '#1A1A1A',
      borderWidth: 1.5,
      borderRadius: 0,
      letterSpacing: 3,
      textTransform: 'uppercase',
    },
    {
      type: 'line',
      x: 0.94,
      y: 0.95,
      width: 40,
      thickness: 1,
      color: '#CCCCCC',
    },
  ],

  background: { type: 'clean' },

  photo: { type: 'strip' },
  photoStyle: { borderRadius: 2, border: '1px solid rgba(0,0,0,0.1)', shadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: -5 },

  layout: {
    header: { x: 0, y: 0, width: 1, height: 0.10 },
    routeMap: { x: 0, y: 0, width: 1, height: 1 },
    footer: { x: 0, y: 0.95, width: 1, height: 0.05 },
    photos: { x: 0, y: 0, width: 1, height: 1 },
  },

  cityPin: { shape: 'diamond', size: 44, showPhoto: true, showLabel: true, labelPosition: 'right' },
  attractionNode: { shape: 'dot', size: 6, showLabel: true, labelPosition: 'right' },
  edge: { lineType: 'straight', trailStyle: 'flow', showTransportBadge: false, glowEffect: false, colorMode: 'day-tinted' },
  comboCard: { style: 'outline', borderRadius: 2 },
  daySticker: { style: 'pill', position: 'above-first-node' },

  headerHeight: 100,

  footer: {
    text: 'ROUTE MAP',
    color: 'rgba(26,26,26,0.15)',
    letterSpacing: 5,
  },
}
