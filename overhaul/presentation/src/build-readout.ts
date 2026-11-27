import type { Consultation } from '@hexagram/consultation-journal/consultation'
import type { DivinedAt } from '@hexagram/consultation-journal/divined-at'
import type { Hexagram } from '@hexagram/oracle/hexagram'
import type { Resolution } from '@hexagram/oracle/resolution'
import type { Transformation } from '@hexagram/oracle/transformation'
import type { Trigram } from '@hexagram/oracle/trigram'
import type { PassageText } from '@hexagram/scripture-catalogue/passage-text'
import type { TrigramName } from '@hexagram/scripture-catalogue/trigram-name'

import type {
  ConsultationReadout,
  NamedHexagram,
  TransformationReadout,
} from '#src/readout.js'

/**
 * Use case 3's result, as this package takes it. `application` may import
 * this package and not the reverse, so the shape is restated from its two
 * parts: the Oracle's Resolution, and the passage texts in order, each
 * Applicable Passage followed by its Commentaries, then the Yilin Verse.
 */
export interface ResolvedTransformation {
  readonly resolution: Resolution
  readonly passageTexts: readonly PassageText[]
}

/**
 * The names a Readout shows, looked up through use case 8 with the same
 * Reading Preference as use case 3: one `NamedHexagram` for each Hexagram
 * `hexagramsNamed` lists, and the `TrigramName`s of each Trigram
 * `trigramsNamed` lists, in any order.
 */
export interface ReadoutNames {
  readonly hexagrams: readonly NamedHexagram[]
  readonly trigrams: readonly TrigramName[]
}

/**
 * Every Hexagram whose names a Readout of the Resolution shows, each once:
 * the Standing and Emerging Hexagrams and each one's Nuclear, Inverse and
 * Reversed Hexagrams. The caller looks each up through use case 8.
 */
export function hexagramsNamed(resolution: Resolution): readonly Hexagram[] {
  throw new Error('not built', { cause: resolution })
}

/**
 * Every Trigram whose name and imagery a Readout of the Resolution shows,
 * each once: the Standing and Emerging Hexagrams' Upper and Lower Trigrams.
 */
export function trigramsNamed(resolution: Resolution): readonly Trigram[] {
  throw new Error('not built', { cause: resolution })
}

/**
 * The Readout of a Transformation, from use case 3's result for it and the
 * names `hexagramsNamed` and `trigramsNamed` asked for. The passages split
 * across the Hexagram tabs as `HexagramTab` says; each Commentary joins the
 * passage its Citation names, and one no Edition gives is left out. Throws a
 * `RangeError` when `names` lacks a Hexagram the Readout shows, or when
 * `resolved` is not the Resolution of `transformation`: the caller's error,
 * not a condition to show.
 */
export function transformationReadout(
  transformation: Transformation,
  resolved: ResolvedTransformation,
  names: ReadoutNames,
): TransformationReadout {
  throw new Error('not built', { cause: { transformation, resolved, names } })
}

/**
 * The Readout of a Consultation: its Query, Divined At and Casting tab,
 * then its Transformation's Readout as `transformationReadout` builds it.
 * A Recorded Consultation's Casting tab shows that it has none; no Casting
 * is ever invented for it (ADR-0026).
 */
export function consultationReadout(
  consultation: Consultation,
  resolved: ResolvedTransformation,
  names: ReadoutNames,
): ConsultationReadout {
  throw new Error('not built', { cause: { consultation, resolved, names } })
}

/**
 * Divined At as every Readout and the browse list write it: a Moment as
 * `YYYY-MM-DD HH:mm`, the date and time its own offset reads, the offset
 * not written; a Day as `YYYY-MM-DD` alone (ADR-0046).
 */
export function divinedAtText(divinedAt: DivinedAt): string {
  throw new Error('not built', { cause: divinedAt })
}
