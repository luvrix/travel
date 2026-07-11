import { useState, useRef, useEffect } from 'react'
import { getAllTemplates } from '../templates'
import type { TemplateId } from '../templates/types'

interface TemplatePickerProps {
  current: TemplateId
  onChange: (id: TemplateId) => void
}

export function TemplatePicker({ current, onChange }: TemplatePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const templates = getAllTemplates()
  const active = templates.find(t => t.id === current)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <span
          className="w-4 h-4 rounded-full border border-gray-300"
          style={{
            background: active
              ? `linear-gradient(135deg, ${active.gradient.stops.slice(0, 2).map(s => s.color).join(', ')})`
              : '#eee',
          }}
        />
        <span>{active?.name ?? '模板'}</span>
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-xl shadow-xl border border-gray-200 z-50 w-[460px]">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">选择模板</div>
          <div className="flex flex-wrap gap-2">
            {templates.map(t => {
              const gradient = `linear-gradient(135deg, ${t.gradient.stops.slice(0, 3).map(s => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')})`
              return (
                <button
                  key={t.id}
                  onClick={() => { onChange(t.id); setOpen(false) }}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 transition-all ${
                    current === t.id
                      ? ''
                      : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                  }`}
                  style={{
                    width: 'calc(25% - 8px)',
                    ...(current === t.id
                      ? { borderColor: '#E03A3A', backgroundColor: 'rgba(224,58,58,0.07)' }
                      : {}),
                  }}
                >
                  <span
                    className="w-7 h-7 rounded-md border border-gray-200 shadow-sm shrink-0"
                    style={{ background: gradient }}
                  />
                  <span className="text-xs font-medium text-gray-700 leading-tight truncate">{t.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
