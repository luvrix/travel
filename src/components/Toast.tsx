import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

type ToastKind = 'error' | 'success' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

export interface ToastApi {
  show: (message: string, kind?: ToastKind) => void
  error: (message: string) => void
  success: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const TOAST_DURATION = 3500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, kind, message }])
  }, [])

  const api: ToastApi = {
    show,
    error: (m) => show(m, 'error'),
    success: (m) => show(m, 'success'),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, TOAST_DURATION)
    return () => clearTimeout(timer)
  }, [onClose])

  const bg = toast.kind === 'error' ? '#dc2626'
    : toast.kind === 'success' ? '#16a34a'
    : '#1f2937'

  return (
    <div style={{
      background: bg, color: 'white',
      padding: '10px 18px', borderRadius: 8,
      fontSize: 13, fontWeight: 500,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      maxWidth: 420, wordBreak: 'break-word',
      animation: 'toast-in 0.2s ease-out',
    }}>
      {toast.message}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook 与 Provider 同文件，是 React 习惯写法
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
