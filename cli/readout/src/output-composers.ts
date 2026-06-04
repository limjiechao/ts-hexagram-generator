import { getEmergingHexagram } from '@hexagram/core/getters'
import { isMovingLine } from '@hexagram/core/line-semantics'
import type {
  CastingRecord,
  Hexagram,
  PartialCastingRecord,
} from '@hexagram/core/types'

import { castingSection } from './casting-ledger.js'
import {
  emergingHexagramSection,
  hexagramTextSection,
  linesBlock,
  querySection,
  standingHexagramSection,
  transformationSection,
} from './output-sections.js'

/**
 * The consultation broken into its presentational sections, each a
 * pre-formatted ANSI string. Consumed both by `consultationConsoleOutput`
 * (the plain composer) and by the Ink tabbed viewer.
 *
 * - `casting` always renders — every consultation has eighteen divisions.
 * - `transformation` always renders (it shows "(No transformation)" when
 *   there are no moving lines).
 * - `emerging` is `null` when there are no moving lines — the emerging
 *   hexagram is identical to the standing one, so there is no emerging tab.
 */
export interface ConsultationSections {
  query: string
  casting: string
  transformation: string
  standing: string
  emerging: string | null
}

/**
 * Build the consultation's presentational sections. This is the
 * content-generation layer shared by the plain output and the Ink viewer.
 *
 * `casting` is `null` for a consultation with no recorded casting (e.g. one
 * migrated from a pre-CASTING legacy `.txt`); the casting tab then renders a
 * "Casting not recorded" notice.
 */
export function buildConsultationSections(
  query: string,
  hexagram: Hexagram,
  casting: CastingRecord | null,
): ConsultationSections {
  const movingLines = hexagram.filter(isMovingLine)
  const standingLines = linesBlock(hexagram)

  return {
    query: querySection(query),
    casting: castingSection(casting),
    transformation: transformationSection(hexagram),
    standing: [
      standingHexagramSection(hexagram),
      hexagramTextSection(hexagram),
      ...(standingLines ? [standingLines] : []),
    ]
      .join('\n\n')
      .trim(),
    emerging:
      movingLines.length > 0
        ? `${emergingHexagramSection(hexagram)}\n\n${hexagramTextSection(getEmergingHexagram(hexagram))}`.trim()
        : null,
  }
}

/**
 * Build just the two sections that render while the casting is still being
 * collected — the query (frozen once submitted) and the partial casting
 * table. Used by the Ink viewer for transient mid-flow rendering; the other
 * sections (transformation, standing, emerging) are only meaningful after
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
