import { useCallback } from 'react'
import type { Trip, Day } from '../types'
import { DAY_COLORS } from '../lib/colors'
import { uid } from '../lib/uid'
import { DaySection } from './editor/DaySection'

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
    onChange({
      ...trip,
      days: trip.days.map(d => d.id === dayId ? {
        ...d,
        stops: [...d.stops, { id: uid('stop'), name: '新地点', startTime: '' }],
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
