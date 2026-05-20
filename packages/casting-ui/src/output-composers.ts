import { getEmergingHexagram } from '@hexagram/core/getters'
import type { CastingRecord, Hexagram } from '@hexagram/types'
import {
  castingSection,
  emergingHexagramSection,
  isMovingLine,
  linesBlock,
  noMovingLinesSection,
  querySection,
  standingHexagramSection,
  transformationSection,
} from '@hexagram/viewer-core'

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

${standingHexagramSection(hexagram)}

${linesBlock(hexagram)}

${movingLines.length > 0 ? emergingHexagramSection(hexagram) : ''}

${movingLines.length > 0 ? noMovingLinesSection(getEmergingHexagram(hexagram), { showNoMovingLinesNotice: false }) : ''}
`
}
