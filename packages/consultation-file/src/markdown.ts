import type { CastingRecord, Hexagram, Line } from '@hexagram/core/types'

import {
  castingMarkdownSection,
  emergingHexagramMarkdownSection,
  linesMarkdownBlock,
  queryMarkdownSection,
  standingHexagramMarkdownSection,
  transformationMarkdownSection,
} from './markdown-sections.js'

function hasMovingLines(hexagram: Hexagram): boolean {
  return hexagram.some((line: Line) => line === 6 || line === 9)
}

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
