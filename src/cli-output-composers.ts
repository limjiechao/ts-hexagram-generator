import { isMovingLine } from './cli-utils-validators.js'
import { getResultantHexagram } from './getters.js'
import {
  castingSection,
  linesBlock,
  noMovingLinesSection,
  originatingHexagramSection,
  querySection,
  resultantHexagramSection,
  transformationSection,
} from './cli-output-sections.js'
import type {
  CastingRecord,
  Hexagram,
  PartialCastingRecord,
} from './types'

/**
 * The consultation broken into its presentational sections, each a
 * pre-formatted ANSI string. Consumed both by `consultationConsoleOutput`
 * (the plain composer) and by the Ink tabbed viewer.
 *
 * - `casting` always renders — every consultation has eighteen divisions.
 * - `transformation` always renders (it shows "(No transformation)" when
 *   there are no moving lines).
 * - `resultant` is `null` when there are no moving lines — the resultant
 *   hexagram is identical to the originating one, so there is no resultant tab.
 */
export interface ConsultationSections {
  query: string
  casting: string
  transformation: string
  originating: string
  resultant: string | null
}

/**
 * Build the consultation's presentational sections. This is the
 * content-generation layer shared by the plain output and the Ink viewer.
 */
export function buildConsultationSections(
  query: string,
  hexagram: Hexagram,
  casting: CastingRecord,
): ConsultationSections {
  const movingLines = hexagram.filter(isMovingLine)

  return {
    query: querySection(query),
    casting: castingSection(casting),
    transformation: transformationSection(hexagram),
    originating:
      `${originatingHexagramSection(hexagram)}\n\n${linesBlock(hexagram)}`.trim(),
    resultant:
      movingLines.length > 0
        ? `${resultantHexagramSection(hexagram)}\n\n${noMovingLinesSection(getResultantHexagram(hexagram), { showNoMovingLinesNotice: false })}`.trim()
        : null,
  }
}

/**
 * Build just the two sections that render while the casting is still being
 * collected — the query (frozen once submitted) and the partial casting
 * table. Used by the Ink viewer for transient mid-flow rendering; the other
 * sections (transformation, originating, resultant) are only meaningful after
 * the hexagram is complete and are built via `buildConsultationSections`.
 */
export function buildPartialCastingSections(
  query: string,
  casting: PartialCastingRecord,
): Pick<ConsultationSections, 'query' | 'casting'> {
  return {
    query: querySection(query),
    casting: castingSection(casting),
  }
}

/**
 * Compose the full plain console output. Kept as a thin composer over the
 * same section builders that feed `buildConsultationSections`, so the
 * `--plain` output (and the saved file) stays byte-identical.
 */
export function consultationConsoleOutput(
  query: string,
  hexagram: Hexagram,
  casting: CastingRecord,
): string {
  const movingLines = hexagram.filter(isMovingLine)

  return `

${querySection(query)}

${castingSection(casting)}

${transformationSection(hexagram)}

${originatingHexagramSection(hexagram)}

${linesBlock(hexagram)}

${movingLines.length > 0 ? resultantHexagramSection(hexagram) : ''}

${movingLines.length > 0 ? noMovingLinesSection(getResultantHexagram(hexagram), { showNoMovingLinesNotice: false }) : ''}
`
}
