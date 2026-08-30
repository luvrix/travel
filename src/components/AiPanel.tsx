import { useEffect, useState } from 'react'
import { buildSystemPrompt } from '../lib/promptBuilder'
import type { Trip } from '../types'
import type { TemplateConfig, TemplateId } from '../templates/types'
import { getTemplate } from '../templates'

interface AiPanelProps {
  trip: Trip
  templateId: TemplateId
  rendering: boolean
  error: string
  onClose: () => void
  onSubmit: (params: { apiKey: string; prompt: string }) => void
}

export function AiPanel({ trip, templateId, rendering, error, onClose, onSubmit }: AiPanelProps) {
  const [useSystemPrompt, setUseSystemPrompt] = useState(true)
  const [userAiPrompt, setUserAiPrompt] = useState('')
  const [aiApiKey, setAiApiKey] = useState(() => sessionStorage.getItem('sf_api_key') ?? '')

  // 关闭面板时清空用户提示词，下次打开是干净状态
  useEffect(() => { return () => { setUserAiPrompt('') } }, [])

  const templateConfig: TemplateConfig = getTemplate(templateId)
  const systemPrompt = buildSystemPrompt(trip, templateConfig)
  const trimmedUserPrompt = userAiPrompt.trim().slice(0, 200)
  const finalPrompt = [
    useSystemPrompt ? systemPrompt : '',
    trimmedUserPrompt,
  ].filter(Boolean).join('，')

  const handleSubmit = () => {
    if (!aiApiKey.trim()) return
    sessionStorage.setItem('sf_api_key', aiApiKey.trim())
    onSubmit({ apiKey: aiApiKey.trim(), prompt: finalPrompt })
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-[420px] bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">AI 渲染配置</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setUseSystemPrompt(v => !v)}
          className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 ${useSystemPrompt ? 'bg-gray-700' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${useSystemPrompt ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
        <span className="text-sm text-gray-600">系统提示词</span>
      </div>

      {useSystemPrompt && (
        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2 leading-relaxed max-h-32 overflow-y-auto select-all cursor-text">
          {systemPrompt}
        </div>
      )}

      <div>
        <label className="text-xs text-gray-500 mb-1 block">自定义提示词（追加在系统提示词后）</label>
        <textarea
          value={userAiPrompt}
          onChange={e => setUserAiPrompt(e.target.value)}
          placeholder="例：赛博朋克风格，霓虹灯光，雨夜..."
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
        />
      </div>

      {finalPrompt && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 leading-relaxed">
          <span className="font-medium text-gray-600">最终提示词：</span>{finalPrompt.slice(0, 120)}{finalPrompt.length > 120 ? '...' : ''}
        </div>
      )}

      <div>
        <label className="text-xs text-gray-500 mb-1 block">硅基流动 API Key</label>
        <input
          type="password"
          value={aiApiKey}
          onChange={e => setAiApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
      </div>

      {error && (
        <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={rendering || !aiApiKey.trim()}
        className="w-full py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {rendering ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            AI 生成中...
          </>
        ) : 'AI 渲染'}
      </button>
    </div>
  )
}
