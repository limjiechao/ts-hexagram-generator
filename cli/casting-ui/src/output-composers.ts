import { buildConsultationView } from '@hexagram/consultation-view/build-view'
import type { CastingRecord, Hexagram } from '@hexagram/core/types'
import { serializeConsoleOutput } from '@hexagram/readout/serialize-ansi'

/**
 * Compose the full plain console output by projecting the medium-neutral
 * consultation-view IR. One composer path: the same IR + serializers that feed
 * the Ink viewer and the saved `.md` file drive the `--plain` output too.
 */
export function consultationConsoleOutput(
  query: string,
  hexagram: Hexagram,
  casting: CastingRecord,
): string {
  return serializeConsoleOutput(buildConsultationView(query, hexagram, casting))
}
