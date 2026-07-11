import type { Trip } from '../types'
import type { TemplateConfig } from '../templates/types'

function dateToSeason(dateStr: string): string {
  const month = parseInt(dateStr?.slice(5, 7) ?? '0', 10)
  if (month >= 3 && month <= 5) return '春日'
  if (month >= 6 && month <= 8) return '夏日'
  if (month >= 9 && month <= 11) return '秋日'
  return '冬日'
}

// 按纬度聚类（纬度差 < threshold 度视为同一区域）
function groupByLatitude(
  stops: Array<{ name: string; lat: number }>,
  threshold = 2.0,
): Array<{ names: string[]; lat: number }> {
  const sorted = [...stops].sort((a, b) => b.lat - a.lat)
  const groups: Array<{ names: string[]; lat: number }> = []
  for (const s of sorted) {
    const last = groups[groups.length - 1]
    if (last && Math.abs(last.lat - s.lat) < threshold) {
      last.names.push(s.name)
      last.lat = (last.lat * (last.names.length - 1) + s.lat) / last.names.length
    } else {
      groups.push({ names: [s.name], lat: s.lat })
    }
  }
  return groups
}

export function buildSystemPrompt(
  trip: Trip,
  template: TemplateConfig,
): string {
  const seen = new Set<string>()
  const stops: Array<{ name: string; lat: number }> = []
  for (const day of trip.days) {
    for (const stop of day.stops) {
      if (stop.name && !seen.has(stop.name)) {
        seen.add(stop.name)
        stops.push({ name: stop.name, lat: stop.location.lat })
      }
    }
  }
  if (!stops.length) return ''

  const season = dateToSeason(trip.startDate)
  const { canvasBackground, pinFill } = template.colors
  const bg = canvasBackground || '#FAFAFA'
  const accent = pinFill || '#333333'

  // 按纬度分组，最多2组，每组最多3个景点
  const groups = groupByLatitude(stops, 2.0)
  const north = groups[0]
  const south = groups[groups.length - 1]
  const hasTwoRegions = groups.length > 1 && Math.abs(north.lat - south.lat) > 2.0

  // 生成景点内容描述（不指定位置）
  const scenes: string[] = []
  scenes.push(`${north.names.slice(0, 3).join('、')}的标志性风景`)
  if (hasTwoRegions) {
    scenes.push(`${south.names.slice(0, 3).join('、')}的标志性风景`)
  }

  // 地理位置引导（用方向性词，不用绝对角落）
  const geoHint = hasTwoRegions
    ? `北方景致（${north.names.slice(0, 2).join('、')}）安排在画面偏上区域，南方景致（${south.names.slice(0, 2).join('、')}）安排在画面偏下区域，两者之间保持大片空白。`
    : `景致（${north.names.slice(0, 3).join('、')}）偏向画面一侧，其余区域保持空白。`

  const sceneCount = hasTwoRegions ? 2 : 1

  const heroScene = scenes[0]
  const accentScene = scenes[1] ?? null

  const compositionDesc = accentScene
    ? `画面留白是主角，景色是点缀。` +
      `北方（${heroScene}）作为主要视觉重心，面积稍大，自然落于画面某处，不居中；` +
      `南方（${accentScene}）作为呼应，面积更小，落于另一处，与主景保持足够间距。` +
      `两处景色大小不同、位置不对称，空白区域远多于有笔触的区域。`
    : `画面以大片空白为主，${heroScene}作为唯一视觉重心，面积克制，` +
      `自然落于画面某处偏一侧，不居中，四周留有充裕空白。`

  return (
    `旅行手账水彩插画背景，${season}旅行，底色 ${bg}，主色调 ${accent}。\n\n` +
    `${compositionDesc}\n\n` +
    `每处景色边缘向外自然晕染，笔触逐渐稀疏，最终无痕融入底色。笔触轻柔，浓淡不均，有手绘的随意感，不追求对称和整齐。\n\n` +
    `画面任何位置不得出现文字、数字、字母、标注或水印。` +
    `不得出现圆形边框、矩形卡片、几何轮廓线。` +
    `不得将风景铺满画布，仅允许水彩笔触点缀。`
  )
}
