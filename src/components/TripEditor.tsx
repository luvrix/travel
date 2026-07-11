import { useState, useRef, useEffect, useCallback } from 'react'
import type { Trip, Day, Stop, TransportMode } from '../types'
import { searchLocation, getCityName, findLocation, getPopularCities, getAttractionsInCity } from '../geo/search'
import type { GeoEntry } from '../data/geo'
import { DAY_COLORS } from '../lib/colors'
import { MODE_LABEL, MODE_ICON } from '../lib/transport'

const ALL_MODES = (Object.keys(MODE_LABEL) as TransportMode[]).filter(m => m !== 'blink')

const CATEGORY_LABEL: Record<string, string> = {
  city: '城市', attraction: '景点', district: '商圈',
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

// ── useClickOutside ──

function useClickOutside(refs: React.RefObject<HTMLElement | null>[], handler: () => void) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const target = e.target as Node
      if (refs.some(r => r.current?.contains(target))) return
      handlerRef.current()
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])
}

// ── LocationPicker ──

function LocationPicker({ value, onSelect, onClose, nearbyCity }: {
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

  useEffect(() => {
    if (!query.trim()) {
      // 没有输入时显示默认推荐
      if (nearbyCity) {
        const attrs = getAttractionsInCity(nearbyCity)
        setResults(attrs.length > 0 ? attrs : getPopularCities())
      } else {
        setResults(getPopularCities())
      }
      return
    }
    setResults(searchLocation(query))
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

// ── TransportPicker ──

function TransportPicker({ current, onSelect, onClose }: {
  current?: TransportMode
  onSelect: (mode: TransportMode) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside([ref], onClose)

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-max">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm whitespace-nowrap hover:bg-blue-50 ${
          current === 'blink' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'
        }`}
        onMouseDown={e => e.preventDefault()}
        onClick={() => onSelect('blink')}
      >
        <span>→</span>
        <span>闪现</span>
      </div>
      <div className="h-px bg-gray-100 mx-1" />
      {ALL_MODES.map(mode => (
        <div
          key={mode}
          className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm whitespace-nowrap hover:bg-blue-50 ${
            current === mode ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
          }`}
          onMouseDown={e => e.preventDefault()}
          onClick={() => onSelect(mode)}
        >
          <span>{MODE_ICON[mode]}</span>
          <span>{MODE_LABEL[mode]}</span>
        </div>
      ))}
    </div>
  )
}

// ── StopRow ──

function StopRow({ stop, isFirst, color, onChange, onRemove, prevStopName }: {
  stop: Stop
  isFirst: boolean
  color: string
  onChange: (changes: Partial<Stop>) => void
  onRemove: () => void
  prevStopName?: string
}) {
  const [editingLocation, setEditingLocation] = useState(false)
  const [editingTransport, setEditingTransport] = useState(false)

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 hover:bg-gray-50 text-sm group relative">
      {/* Time */}
      {stop.startTime ? (
        <input
          type="time"
          value={stop.startTime}
          onChange={e => onChange({ startTime: e.target.value })}
          onClick={e => (e.target as HTMLInputElement).showPicker?.()}
          className="time-input w-[58px] px-0.5 py-0.5 text-xs border border-transparent hover:border-gray-300 focus:border-blue-300 rounded text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-transparent shrink-0 cursor-pointer"
        />
      ) : (
        <button
          onClick={() => onChange({ startTime: '09:00' })}
          className="w-[58px] px-0.5 py-0.5 text-xs text-gray-300 hover:text-gray-400 bg-transparent shrink-0 cursor-pointer text-center"
        >
          +时间
        </button>
      )}

      {/* Dot */}
      <span className="w-2 h-2 rounded-full shrink-0 self-center" style={{ backgroundColor: color }} />

      {/* Name */}
      <div className="flex-1 min-w-0 overflow-hidden flex items-center">
        <span
          className={`w-full text-gray-700 truncate ${editingLocation ? 'pointer-events-none' : 'cursor-pointer hover:text-blue-600 hover:underline'}`}
          onClick={() => setEditingLocation(true)}
        >
          {stop.name}
        </span>
      </div>

      {/* Transport */}
      <div className="relative shrink-0">
        <span
          className={`text-xs cursor-pointer ${stop.transport && stop.transport !== 'blink' ? 'text-gray-400 hover:text-blue-500' : 'text-gray-300 hover:text-gray-400'}`}
          title={stop.transport && stop.transport !== 'blink' ? MODE_LABEL[stop.transport] : '选择出行方式'}
          onClick={() => setEditingTransport(true)}
        >
          {stop.transport && stop.transport !== 'blink' ? MODE_ICON[stop.transport] : MODE_ICON['blink']}
        </span>
        {editingTransport && (
          <TransportPicker
            current={stop.transport}
            onSelect={mode => { onChange({ transport: mode }); setEditingTransport(false) }}
            onClose={() => setEditingTransport(false)}
          />
        )}
      </div>

      {/* Delete */}
      <button
        onClick={onRemove}
        className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* LocationPicker at row level - doesn't affect name div layout */}
      {editingLocation && (
        <LocationPicker
          value={stop.name}
          nearbyCity={
            findLocation(stop.name)?.city          // 优先当前 stop 的城市
            ?? findLocation(prevStopName ?? '')?.city  // 否则用上一个 stop 的城市
          }
          onSelect={entry => {
            onChange({ name: entry.name, location: { lat: entry.lat, lng: entry.lng } })
            setEditingLocation(false)
          }}
          onClose={() => setEditingLocation(false)}
        />
      )}
    </div>
  )
}

// ── DaySection ──

function DaySection({ day, dayIndex, onChange, onRemove, onAddStop, onRemoveStop }: {
  day: Day
  dayIndex: number
  onChange: (changes: Partial<Day>) => void
  onRemove: () => void
  onAddStop: () => void
  onRemoveStop: (stopId: string) => void
}) {
  const color = day.color || DAY_COLORS[dayIndex % DAY_COLORS.length]

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color }}>
            Day {dayIndex + 1}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="pb-1">
        {day.stops.map((stop, si) => (
          <StopRow
                key={stop.id}
                stop={stop}
                isFirst={si === 0}
                color={color}
                prevStopName={si > 0 ? day.stops[si - 1].name : undefined}
                onChange={changes => {
                  const newStops = day.stops.map(s => s.id === stop.id ? { ...s, ...changes } : s)
                  onChange({ stops: newStops })
                }}
                onRemove={() => onRemoveStop(stop.id)}
              />
            ))}
        <button
          onClick={onAddStop}
          className="flex items-center gap-1 px-4 py-1 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50 w-full transition-colors"
        >
          + 添加地点
        </button>
      </div>
    </div>
  )
}

// ── TripEditor ──

interface TripEditorProps {
  trip: Trip
  onChange: (trip: Trip) => void
}

export function TripEditor({ trip, onChange }: TripEditorProps) {
  const updateDay = useCallback((dayId: string, changes: Partial<Day>) => {
    onChange({ ...trip, days: trip.days.map(d => d.id === dayId ? { ...d, ...changes } : d) })
  }, [trip, onChange])

  const removeDay = useCallback((dayId: string) => {
    onChange({ ...trip, days: trip.days.filter(d => d.id !== dayId) })
  }, [trip, onChange])

  const addDay = useCallback(() => {
    const color = DAY_COLORS[trip.days.length % DAY_COLORS.length]
    onChange({ ...trip, days: [...trip.days, { id: uid('day'), color, stops: [] }] })
  }, [trip, onChange])

  const addStop = useCallback((dayId: string) => {
    const day = trip.days.find(d => d.id === dayId)
    // 推导默认位置：取前一个 stop 的位置，没有则取中国中心
    // 始终用固定默认坐标，不继承前一个 stop 的坐标
    // 这样 isPlaceholderStop（检查名字+坐标）能正确识别并过滤
    const defaultLocation = { lat: 35.0, lng: 105.0 }
    onChange({
      ...trip,
      days: trip.days.map(d => d.id === dayId ? {
        ...d,
        stops: [...d.stops, { id: uid('stop'), name: '新地点', startTime: '', location: defaultLocation }],
      } : d),
    })
  }, [trip, onChange])

  const removeStop = useCallback((dayId: string, stopId: string) => {
    onChange({
      ...trip,
      days: trip.days.map(d => d.id === dayId ? { ...d, stops: d.stops.filter(s => s.id !== stopId) } : d),
    })
  }, [trip, onChange])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {trip.days.map((day, di) => (
          <DaySection
            key={day.id}
            day={day}
            dayIndex={di}
            onChange={changes => updateDay(day.id, changes)}
            onRemove={() => removeDay(day.id)}
            onAddStop={() => addStop(day.id)}
            onRemoveStop={stopId => removeStop(day.id, stopId)}
          />
        ))}
      </div>
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={addDay}
          className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        >
          + 添加天数
        </button>
      </div>
    </div>
  )
}
