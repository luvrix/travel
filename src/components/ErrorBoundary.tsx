import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/** 捕获子树渲染错误，显示降级 UI 防止白屏 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    location.reload()
  }

  handleCopyStack = async () => {
    const { error } = this.state
    if (!error) return
    const text = `${error.name}: ${error.message}\n${error.stack ?? ''}`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // 旧浏览器/非 HTTPS：降级下载
      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'error.log'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    const { error } = this.state
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafafa',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{
          maxWidth: 480,
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>🚧</span>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', margin: 0 }}>
              页面出错了
            </h1>
          </div>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
            渲染过程发生异常。可以重新加载页面，或复制错误信息反馈给开发者。
          </p>
          {error && (
            <pre style={{
              background: '#f3f4f6',
              borderRadius: 8,
              padding: 12,
              fontSize: 12,
              color: '#dc2626',
              fontFamily: 'ui-monospace, monospace',
              margin: 0,
              maxHeight: 200,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {error.name}: {error.message}
            </pre>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={this.handleReload}
              style={{
                flex: 1, padding: '10px 16px',
                background: '#2563eb', color: 'white',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
              }}
            >
              重新加载
            </button>
            <button
              onClick={this.handleCopyStack}
              style={{
                flex: 1, padding: '10px 16px',
                background: '#f3f4f6', color: '#374151',
                border: '1px solid #d1d5db', borderRadius: 8,
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
              }}
            >
              复制错误堆栈
            </button>
          </div>
        </div>
      </div>
    )
  }
}
