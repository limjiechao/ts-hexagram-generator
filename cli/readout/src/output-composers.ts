import {
  buildConsultationView,
  castingSection,
  querySection,
} from '@hexagram/consultation-view/build-view'
import type {
  CastingAbsenceReason,
  CastingRecord,
  Hexagram,
  PartialCastingRecord,
} from '@hexagram/core/types'

import {
  serializeCastingAnsi,
  serializeConsultationTabs,
  serializeQueryAnsi,
} from './serialize-ansi.js'

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
 * It delegates to the medium-neutral consultation-view IR and serializes the
 * tab strings from it.
 *
 * `casting` is `null` for a consultation with no recorded casting (e.g. one
 * migrated from a pre-CASTING legacy `.txt`); the casting tab then renders a
 * "Casting not recorded" notice. `absenceReason` names WHY casting is absent
 * (from the loaded envelope's `castingAbsence`); it defaults to null for the
 * live flows, which never carry a reason.
 */
export function buildConsultationSections(
  query: string,
  hexagram: Hexagram,
  casting: CastingRecord | null,
  absenceReason: CastingAbsenceReason | null = null,
): ConsultationSections {
  return serializeConsultationTabs(
    buildConsultationView(query, hexagram, casting, absenceReason),
  )
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
  // WHY: a partial (mid-flow) casting render needs only the query + ledger; the
  // hexagram isn't known yet, so we mint just those two sections via the shared
  // sub-builders instead of round-tripping a sentinel [7,7,7,7,7,7] through
  // buildConsultationView. These sub-builders are the single section-mint point
  // (ADR-0018); both serializers are called directly here, bypassing the
  // sectionsForMedium projection (visibility is moot for a 2-section mid-flow render).
  return {
    query: serializeQueryAnsi(querySection(query)),
    casting: serializeCastingAnsi(castingSection(casting)),
  }
}
