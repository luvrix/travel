import { useState } from 'react'
import type { Day } from '../../types'
import { DAY_COLORS } from '../../lib/colors'
import { StopRow } from './StopRow'

export function DaySection({ day, dayIndex, onChange, onRemove, onAddStop, onRemoveStop }: {
  day: Day
  dayIndex: number
  onChange: (changes: Partial<Day>) => void
  onRemove: () => void
  onAddStop: () => void
  onRemoveStop: (stopId: string) => void
}) {
  const color = day.color || DAY_COLORS[dayIndex % DAY_COLORS.length]
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null); setDragOverId(null); return
    }
    const fromIdx = day.stops.findIndex(s => s.id === draggedId)
    const toIdx = day.stops.findIndex(s => s.id === targetId)
    if (fromIdx === -1 || toIdx === -1) {
      setDraggedId(null); setDragOverId(null); return
    }
    const newStops = [...day.stops]
    const [moved] = newStops.splice(fromIdx, 1)
    newStops.splice(toIdx, 0, moved)
    onChange({ stops: newStops })
    setDraggedId(null); setDragOverId(null)
  }

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
            color={color}
            prevStopName={si > 0 ? day.stops[si - 1].name : undefined}
            onChange={changes => {
              const newStops = day.stops.map(s => s.id === stop.id ? { ...s, ...changes } : s)
              onChange({ stops: newStops })
            }}
            onRemove={() => onRemoveStop(stop.id)}
            isDragging={draggedId === stop.id}
            isDragOver={dragOverId === stop.id}
            onDragStart={() => setDraggedId(stop.id)}
            onDragEnd={() => { setDraggedId(null); setDragOverId(null) }}
            onDragOverRow={() => setDragOverId(stop.id)}
            onDrop={() => handleDrop(stop.id)}
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
