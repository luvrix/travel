import { useEffect, useRef } from 'react'

/** 点击指定 refs 之外的区域时触发 handler */
export function useClickOutside(refs: React.RefObject<HTMLElement | null>[], handler: () => void) {
  const handlerRef = useRef(handler)
  useEffect(() => { handlerRef.current = handler })

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const target = e.target as Node
      if (refs.some(r => r.current?.contains(target))) return
      handlerRef.current()
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在 mount 时绑一次监听，handler 通过 ref 拿最新值
  }, [])
}
