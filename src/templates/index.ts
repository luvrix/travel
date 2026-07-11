import type { TemplateId, TemplateConfig } from './types'
import { minimalTemplate } from './minimal'
import { cartoonTemplate } from './cartoon'
import { journalTemplate } from './journal'
import { blueskyTemplate } from './bluesky'
import { magazineTemplate } from './magazine'
import { handdrawnTemplate } from './handdrawn'
import { trendyTemplate } from './trendy'
import { cinematicTemplate } from './cinematic'

const registry = new Map<TemplateId, TemplateConfig>([
  ['minimal', minimalTemplate],
  ['cartoon', cartoonTemplate],
  ['journal', journalTemplate],
  ['bluesky', blueskyTemplate],
  ['magazine', magazineTemplate],
  ['handdrawn', handdrawnTemplate],
  ['trendy', trendyTemplate],
  ['cinematic', cinematicTemplate],
])

export function getTemplate(id: TemplateId): TemplateConfig {
  return registry.get(id) ?? minimalTemplate
}

export function getAllTemplates(): TemplateConfig[] {
  return Array.from(registry.values())
}
