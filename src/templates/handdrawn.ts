import type { TemplateConfig } from './types'

export const handdrawnTemplate: TemplateConfig = {
  id: 'handdrawn',
  name: '手绘',
  icon: '✏️',
  description: '手绘素描风格，牛皮纸配手写字体',

  colors: {
    pinFill: '#5D4037',
    attractionFill: '#8D6E63',
    attractionStroke: '#A1887F',
    comboFill: 'rgba(245,237,227,0.5)',
    comboStroke: '#A1887F',
    comboShadow: 'rgba(93,64,55,0.08)',
    cityLabelFill: '#3E2723',
    attractionLabelFill: '#795548',
    transportIconColor: '#8D6E63',
    edgeStroke: '#795548',
    canvasBackground: '#F5EDE3',
  },

  fonts: {
    city: { size: 24, weight: '700', color: '#3E2723', family: "'Caveat', 'Kalam', cursive" },
    attraction: { size: 20, weight: '400', color: '#795548', family: "'Caveat', 'Kalam', cursive" },
    transport: { size: 16, weight: '400', color: '#8D6E63', family: "'Caveat', 'Kalam', cursive" },
  },

  gradient: {
    stops: [
      { offset: 0, color: '#F5EDE3' },
      { offset: 0.3, color: '#F0E6D8' },
      { offset: 0.7, color: '#EDE0D0' },
      { offset: 1, color: '#E8D8C4' },
    ],
  },
  gradientDirection: 'vertical',

  header: {
    titleFont: { size: 52, weight: '700', color: '#3E2723', family: "'Caveat', 'Kalam', cursive" },
    subtitleFont: { size: 22, weight: '400', color: '#795548', family: "'Caveat', 'Kalam', cursive" },
    divider: { color: 'rgba(93,64,55,0.3)', style: 'dashed' },
    align: 'center',
  },

  titleLayout: {
    x: 0.5,
    y: 0.06,
    rotation: -2,
    align: 'center',
    color: '#3E2723',
    fontSize: 52,
    fontWeight: '700',
    fontFamily: "'Caveat', 'Kalam', cursive",
    letterSpacing: 3,
  },

  subtitleLayout: {
    x: 0.5,
    y: 0.10,
    rotation: -2,
    align: 'center',
    color: '#795548',
    fontSize: 22,
    fontWeight: '400',
    fontFamily: "'Caveat', 'Kalam', cursive",
  },

  decorations: [
    {
      type: 'stamp',
      x: 0.88,
      y: 0.05,
      rotation: 5,
      text: 'SKETCH',
      fontSize: 14,
      fontWeight: '700',
      color: 'rgba(93,64,55,0.3)',
      doubleBorder: true,
      letterSpacing: 4,
      textTransform: 'uppercase',
    },
    {
      type: 'line',
      x: 0.5,
      y: 0.13,
      rotation: -1,
      width: 80,
      thickness: 1.5,
      color: 'rgba(93,64,55,0.3)',
    },
    {
      type: 'label',
      x: 0.5,
      y: 0.96,
      rotation: 0,
      text: '✎ drawn by hand',
      fontSize: 12,
      fontWeight: '400',
      color: 'rgba(93,64,55,0.35)',
      backgroundColor: 'transparent',
      borderRadius: 0,
    },
  ],

  background: { type: 'clean' },

  photo: { type: 'grid', columns: 2, rows: 2, gap: 6 },
  photoStyle: { borderRadius: 12, border: '2px solid rgba(121,85,72,0.2)', shadow: '0 3px 12px rgba(121,85,72,0.15)', filter: 'sepia(0.15)', zIndex: -5 },

  layout: {
    header: { x: 0, y: 0, width: 1, height: 0.10 },
    routeMap: { x: 0, y: 0, width: 1, height: 1 },
    footer: { x: 0, y: 0.95, width: 1, height: 0.05 },
    photos: { x: 0, y: 0, width: 1, height: 1 },
  },

  cityPin: { shape: 'pin-drop', size: 48, showPhoto: true, showLabel: true, labelPosition: 'below' },
  attractionNode: { shape: 'diamond', size: 8, showLabel: true, labelPosition: 'right' },
  edge: { lineType: 'curve', trailStyle: 'dash', showTransportBadge: false, glowEffect: false, colorMode: 'day-tinted' },
  comboCard: { style: 'outline', borderRadius: 8 },
  daySticker: { style: 'pill', position: 'above-first-node' },

  headerHeight: 130,

  footer: {
    text: 'ROUTE MAP',
    color: 'rgba(93,64,55,0.2)',
    letterSpacing: 4,
  },
}
