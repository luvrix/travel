import { useState, useRef, useEffect } from 'react'
import type { GeoEntry } from '../../data/geo'
import { searchLocation, getPopularCities, getAttractionsInCity } from '../../geo/search'
import { searchAmap } from '../../geo/amap'
import { useClickOutside } from './useClickOutside'

const CATEGORY_LABEL: Record<string, string> = {
  city: '城市', attraction: '景点', district: '商圈',
}

export function LocationPicker({ value, onSelect, onClose, nearbyCity }: {
  value: string
  onSelect: (entry: GeoEntry) => void
  onClose: () => void
  nearbyCity?: string
}) {
  // '新地点' 是占位词，打开时应显示 nearbyCity 推荐，不能作为搜索词
  const [query, setQuery] = useState(value === '新地点' ? '' : value)
  const [results, setResults] = useState<GeoEntry[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useClickOutside([wrapperRef], onClose)

  useEffect(() => { inputRef.current?.select() }, [])

  // debounce：避免每按一键就触发 flexsearch + 高德查询
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      const q = query.trim()
      if (!q) {
        if (nearbyCity) {
          const attrs = await getAttractionsInCity(nearbyCity)
          if (cancelled) return
          setResults(attrs.length > 0 ? attrs : await getPopularCities())
        } else {
          setResults(await getPopularCities())
        }
        return
      }
      const r = await searchLocation(q)
      if (cancelled) return
      if (r.length > 0) { setResults(r); return }
      // 本地未命中 → 查高德（少于 2 字符的不查，避免无意义请求）
      if (q.length < 2) { setResults([]); return }
      const amapEntry = await searchAmap(q)
      if (cancelled) return
      setResults(amapEntry ? [amapEntry] : [])
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, nearbyCity])

  return (
    <div ref={wrapperRef} className="absolute top-full left-1/2 -translate-x-1/2 z-50 bg-white rounded shadow-lg border border-gray-200 w-max max-w-[264px]">
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onClose() }}
        className="w-full px-2 py-1 text-sm border-b border-gray-200 focus:outline-none"
        placeholder="搜索城市或景点..."
        autoFocus
      />
      {results.length > 0 && (
        <div className="max-h-40 overflow-y-auto">
          {!query.trim() && (
            <div className="px-2 py-1 text-[10px] text-gray-400 border-b border-gray-100">
              {nearbyCity ? `${nearbyCity} 热门景点` : '热门城市'}
            </div>
          )}
          {results.map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-blue-50 cursor-pointer text-sm whitespace-nowrap"
              onMouseDown={e => e.preventDefault()}
              onClick={() => onSelect(entry)}
            >
              <span className="text-gray-800">{entry.name}</span>
              <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-500">{CATEGORY_LABEL[entry.category]}</span>
              {entry.city !== entry.name && (
                <span className="text-[10px] text-gray-400">{entry.city}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
