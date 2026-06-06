import { buildConsultationView } from '@hexagram/consultation-view/build-view'
import type { CastingRecord, Hexagram } from '@hexagram/core/types'

import { serializeConsultationMarkdownBody } from './serialize-markdown.js'

/**
 * Compose the Markdown body for a consultation. The frontmatter envelope is
 * applied separately by `serializeFrontmatter`. A `null` `casting` renders
 * the CASTING section as "Casting not recorded".
 *
 * Delegates to the medium-neutral consultation-view IR and serializes the
 * Markdown body from it.
 */
export function markdownConsultationBody(
  query: string,
  hexagram: Hexagram,
  casting: CastingRecord | null,
): string {
  return serializeConsultationMarkdownBody(
    buildConsultationView(query, hexagram, casting),
  )
}
