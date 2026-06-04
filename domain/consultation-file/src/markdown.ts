import { hasMovingLines } from '@hexagram/core/line-semantics'
import type { CastingRecord, Hexagram } from '@hexagram/core/types'

import {
  castingMarkdownSection,
  emergingHexagramMarkdownSection,
  linesMarkdownBlock,
  queryMarkdownSection,
  standingHexagramMarkdownSection,
  transformationMarkdownSection,
} from './markdown-sections.js'

/**
 * Compose the Markdown body for a consultation. The frontmatter envelope is
 * applied separately by `serializeFrontmatter`. A `null` `casting` renders
 * the CASTING section as "Casting not recorded".
 */
export function markdownConsultationBody(
  query: string,
  hexagram: Hexagram,
  casting: CastingRecord | null,
): string {
  const parts = [
    queryMarkdownSection(query),
    castingMarkdownSection(casting),
    transformationMarkdownSection(hexagram),
    standingHexagramMarkdownSection(hexagram),
  ]
  if (hasMovingLines(hexagram)) {
    parts.push(emergingHexagramMarkdownSection(hexagram))
  }
  parts.push(linesMarkdownBlock(hexagram))
  return parts.join('\n')
}
