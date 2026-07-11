import type { TransportMode } from '../types'

export const MODE_LABEL: Record<TransportMode, string> = {
  flight: '飞机', train: '高铁', bus: '大巴', car: '自驾',
  taxi: '打车', subway: '地铁', walk: '步行', bike: '骑行', ship: '轮船',
  blink: '闪现',
}

export const MODE_ICON: Record<TransportMode, string> = {
  flight: '✈️', train: '🚄', bus: '🚌', car: '🚗',
  taxi: '🚕', subway: '🚇', walk: '🚶', bike: '🚲', ship: '🚢',
  blink: '→',
}
