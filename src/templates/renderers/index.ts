import type { ComponentType } from 'react'
import type { RendererProps } from './shared'
import { UnifiedRenderer } from './UnifiedRenderer'

export function getRenderer(): ComponentType<RendererProps> {
  return UnifiedRenderer
}
