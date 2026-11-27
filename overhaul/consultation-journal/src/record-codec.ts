import type { Pick } from '@hexagram/oracle/pick'

import type { Consultation } from '#src/consultation.js'
import type { DivisionMethod } from '#src/division-method.js'
import type { UnreadableReason } from '#src/unreadable-file.js'

/** One Line's three Picks, in Round order. */
type LinePicks = readonly [Pick, Pick, Pick]

/** The fields every version-2 record holds. */
interface RecordFields {
  readonly schemaVersion: 2
  /** The Consultation Id, a ULID. */
  readonly id: string
  /** ISO 8601: a date-time with its UTC offset, or a date only. */
  readonly divinedAt: string
  /** The Query, verbatim. */
  readonly query: string
  /** Six Line Values, Line Position 1 first, for example `"789876"`. */
  readonly transformation: string
}

/**
 * The canonical version-2 record every Consultation Store keeps (ADR-0030),
 * as plain data: strings, numbers, arrays and objects only, so a Store
 * writes it as YAML frontmatter and a bundle as JSON. A Cast Consultation's
 * record adds its Casting's 18 Picks, six Lines of three, bottom-up, and its
 * Division Method; a Recorded Consultation's has neither. Its keys come in
 * ADR-0030's table order.
 */
export type ConsultationRecord =
  | RecordFields
  | (RecordFields & {
      readonly casting: readonly [
        LinePicks,
        LinePicks,
        LinePicks,
        LinePicks,
        LinePicks,
        LinePicks,
      ]
      readonly divisionMethod: DivisionMethod
    })

/** A loaded Consultation, or the reason the record is an Unreadable file. */
export type DecodeResult =
  | { readonly outcome: 'decoded'; readonly consultation: Consultation }
  | {
      readonly outcome: 'unreadable'
      readonly reason: Extract<
        UnreadableReason,
        {
          readonly kind:
            | 'not-version-2'
            | 'invalid-field'
            | 'casting-does-not-replay'
        }
      >
    }

/**
 * The Consultation's version-2 record (ADR-0030). Every Consultation has
 * one, so it never fails, and decoding the record gives back an equal
 * Consultation.
 */
export function encodeRecord(consultation: Consultation): ConsultationRecord {
  throw new Error('not built', { cause: consultation })
}

/**
 * Loads a version-2 record, parsed but unchecked, as a Consultation. It
 * reads only the plain data `ConsultationRecord` names, so a Store parses
 * its text into that model first. It checks, in this order, and reports the
 * first failure: that the record is a mapping with `schemaVersion` `2`;
 * each field in ADR-0030's table order; then, for a Cast Consultation, that
 * its Casting replays through the Oracle's Divisions from the Empty Casting
 * to its Transformation (ADR-0026). Fields the record does not name are
 * ignored. It never throws.
 */
export function decodeRecord(record: unknown): DecodeResult {
  throw new Error('not built', { cause: record })
}
