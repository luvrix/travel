import { useRef } from 'react'
import type { TransportMode } from '../../types'
import { MODE_LABEL, MODE_ICON } from '../../lib/transport'
import { useClickOutside } from './useClickOutside'

const ALL_MODES = (Object.keys(MODE_LABEL) as TransportMode[]).filter(m => m !== 'blink')

export function TransportPicker({ current, onSelect, onClose }: {
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
