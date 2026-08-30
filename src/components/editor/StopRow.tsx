import { useState, useEffect } from 'react'
import type { Stop } from '../../types'
import { findLocation } from '../../geo/search'
import { MODE_LABEL, MODE_ICON } from '../../lib/transport'
import { LocationPicker } from './LocationPicker'
import { TransportPicker } from './TransportPicker'

export function StopRow({ stop, color, onChange, onRemove, prevStopName, isDragging, isDragOver, onDragStart, onDragEnd, onDragOverRow, onDrop }: {
  stop: Stop
  color: string
  onChange: (changes: Partial<Stop>) => void
  onRemove: () => void
  prevStopName?: string
  isDragging: boolean
  isDragOver: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onDragOverRow: () => void
  onDrop: () => void
}) {
  const [editingLocation, setEditingLocation] = useState(false)
  const [editingTransport, setEditingTransport] = useState(false)
  const [nearbyCity, setNearbyCity] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const cur = await findLocation(stop.name)
      if (cancelled) return
      if (cur?.city) { setNearbyCity(cur.city); return }
      if (prevStopName) {
        const prev = await findLocation(prevStopName)
        if (!cancelled) setNearbyCity(prev?.city)
        return
      }
      setNearbyCity(undefined)
    })()
    return () => { cancelled = true }
  }, [stop.name, prevStopName])

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', stop.id) } catch { /* 某些浏览器禁用 clipboard */ } onDragStart() }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOverRow() }}
      onDrop={(e) => { e.preventDefault(); onDrop() }}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-1.5 px-3 py-1 hover:bg-gray-50 text-sm group relative transition-opacity cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      } ${isDragOver ? 'border-t-2 border-blue-400' : ''}`}
    >
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
          nearbyCity={nearbyCity}
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
