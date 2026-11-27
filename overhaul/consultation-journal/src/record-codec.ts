import type { CompleteCasting, PartialCasting } from '@hexagram/oracle/casting'
import { divide, emptyCasting } from '@hexagram/oracle/division'
import type { Pick } from '@hexagram/oracle/pick'
import type { Round } from '@hexagram/oracle/round'
import type { Transformation } from '@hexagram/oracle/transformation'

import { isConsultationId, type ConsultationId } from '#src/consultation-id.js'
import type { Consultation } from '#src/consultation.js'
import {
  isDay,
  isUtcOffset,
  type Day,
  type DivinedAt,
  type Moment,
  type UtcOffset,
} from '#src/divined-at.js'
import type { DivisionMethod } from '#src/division-method.js'
import { isQuery, type Query } from '#src/query.js'
import type { RecordField, UnreadableReason } from '#src/unreadable-file.js'

/** One Line's three Picks, in Round order. */
type LinePicks = readonly [Pick, Pick, Pick]

/** The fields every version-2 record holds. */
interface RecordFields {
  readonly schemaVersion: 2
  /** The Consultation Id, a ULID. */
  readonly id: string
  /**
   * ISO 8601: a date only, `YYYY-MM-DD`, or a date-time in the Moment's own
   * UTC offset, written `YYYY-MM-DDTHH:mm:ss.sss±HH:MM` with exactly three
   * fraction digits.
   */
  readonly divinedAt: string
  /** The Query, verbatim. */
  readonly query: string
  /**
   * Six Line Values, Line Position 1 first, for example `"789876"`; always
   * a string, never a number.
   */
  readonly transformation: string
}

/**
 * The canonical version-2 record every Consultation Store keeps (ADR-0046),
 * as plain data: strings, numbers, arrays and objects only, so a Store
 * writes it as YAML frontmatter and a bundle as JSON. A Cast Consultation's
 * record adds its Casting's 18 Picks, six Lines of three, bottom-up, and its
 * Division Method; a Recorded Consultation's has neither. Its keys come in
 * ADR-0046's table order.
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
 * The Consultation's version-2 record (ADR-0046). It never fails, and
 * decoding the record gives back an equal Consultation: a Moment keeps its
 * milliseconds and its own offset. That holds only for a Moment whose
 * `epochMilliseconds` is an integer and whose date in its own offset lies
 * in the years 0000 to 9999; for any other Moment the `divinedAt` text is
 * unspecified.
 */
export function encodeRecord(consultation: Consultation): ConsultationRecord {
  const fields: RecordFields = {
    schemaVersion: 2,
    id: consultation.id,
    divinedAt: encodeDivinedAt(consultation.divinedAt),
    query: consultation.query,
    transformation: consultation.transformation.join(''),
  }
  if (consultation.origin === 'recorded') return fields
  return {
    ...fields,
    casting: encodeCasting(consultation.casting),
    divisionMethod: consultation.divisionMethod,
  }
}

/**
 * Loads a version-2 record, parsed but unchecked, as a Consultation. It
 * reads only the JSON data model (strings, numbers, booleans, null, arrays
 * and plain objects), so a Store parses its text into that model first; a
 * value of the wrong type, such as a `transformation` that parsed as a
 * number, is an invalid field. Only a missing key is absent: an explicit
 * `null`, `casting: null` among them, is an invalid field. A date-time
 * `divinedAt` is accepted with three fraction digits or none, and only with
 * an offset `isUtcOffset` admits, so `Z` is refused; a date that does not
 * exist, or a time outside 00:00:00 to 23:59:59, is refused, never
 * normalised. A record is a Cast Consultation's when it has the `casting`
 * key, whatever its value. It checks, in this order, and reports the
 * first failure: that the record is a mapping with `schemaVersion` `2`;
 * each field in ADR-0046's table order; then, for a Cast Consultation, that
 * its Casting replays through the Oracle's Divisions from the Empty Casting
 * to its Transformation (ADR-0026). Fields the record does not name are
 * ignored. It never throws.
 */
export function decodeRecord(record: unknown): DecodeResult {
  if (!isPlainObject(record) || record.schemaVersion !== 2) {
    return unreadable({ kind: 'not-version-2' })
  }
  const id = record.id
  if (typeof id !== 'string' || !isConsultationId(id)) return invalid('id')
  const divinedAt = decodeDivinedAt(record.divinedAt)
  if (divinedAt === undefined) return invalid('divinedAt')
  const picks = record.casting
  if (picks === undefined) return decodeRecorded(record, id, divinedAt)
  if (divinedAt.precision === 'day') return invalid('divinedAt')
  return decodeCast(record, id, divinedAt, picks)
}

/** The 18 Picks a Cast Consultation's record holds. */
type RecordCasting = Extract<
  ConsultationRecord,
  { casting: unknown }
>['casting']

/**
 * A parsed record: a mapping from the JSON data model. A missing key and one
 * holding undefined both read as undefined, so both are absent.
 */
type ParsedRecord = Readonly<Record<string, unknown>>

const divisionMethods: readonly DivisionMethod[] = [
  'automatic',
  'physical',
  'virtual',
]

function encodeCasting(casting: CompleteCasting): RecordCasting {
  const [first, second, third, fourth, fifth, sixth] = casting.rounds
  return [
    linePicks(first),
    linePicks(second),
    linePicks(third),
    linePicks(fourth),
    linePicks(fifth),
    linePicks(sixth),
  ]
}

function linePicks([first, second, third]: readonly [
  Round,
  Round,
  Round,
]): LinePicks {
  return [first.pick, second.pick, third.pick]
}

function encodeDivinedAt(divinedAt: DivinedAt): string {
  if (divinedAt.precision === 'day') {
    return isoDate(divinedAt.year, divinedAt.month, divinedAt.day)
  }
  // Shifted by its offset, the instant's UTC fields read as the Moment's own
  // wall-clock time.
  const local = new Date(
    divinedAt.epochMilliseconds + offsetMinutes(divinedAt.offset) * 60_000,
  )
  const date = isoDate(
    local.getUTCFullYear(),
    local.getUTCMonth() + 1,
    local.getUTCDate(),
  )
  const time = `${pad(local.getUTCHours(), 2)}:${pad(local.getUTCMinutes(), 2)}:${pad(local.getUTCSeconds(), 2)}.${pad(local.getUTCMilliseconds(), 3)}`
  return `${date}T${time}${divinedAt.offset}`
}

function isoDate(year: number, month: number, dayOfMonth: number): string {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(dayOfMonth, 2)}`
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0')
}

function offsetMinutes(offset: UtcOffset): number {
  const sign = offset.startsWith('-') ? -1 : 1
  return sign * (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(4, 6)))
}

function decodeRecorded(
  record: ParsedRecord,
  id: ConsultationId,
  divinedAt: DivinedAt,
): DecodeResult {
  const text = decodeQueryAndTransformation(record)
  if ('invalid' in text) return invalid(text.invalid)
  if (record.divisionMethod !== undefined) {
    return invalid('divisionMethod')
  }
  return decoded({ origin: 'recorded', id, divinedAt, ...text })
}

function decodeCast(
  record: ParsedRecord,
  id: ConsultationId,
  divinedAt: Moment,
  picks: unknown,
): DecodeResult {
  const text = decodeQueryAndTransformation(record)
  if ('invalid' in text) return invalid(text.invalid)
  if (!isRecordCasting(picks)) return invalid('casting')
  const divisionMethod = record.divisionMethod
  if (!isDivisionMethod(divisionMethod)) return invalid('divisionMethod')
  const casting = replay(picks)
  if (
    casting === undefined ||
    !sameTransformation(casting.transformation, text.transformation)
  ) {
    return unreadable({ kind: 'casting-does-not-replay' })
  }
  return decoded({
    origin: 'cast',
    id,
    divinedAt,
    ...text,
    casting,
    divisionMethod,
  })
}

function decodeQueryAndTransformation(
  record: ParsedRecord,
):
  | { readonly query: Query; readonly transformation: Transformation }
  | { readonly invalid: RecordField } {
  const query = record.query
  if (typeof query !== 'string' || !isQuery(query)) return { invalid: 'query' }
  const transformation = record.transformation
  if (typeof transformation !== 'string') return { invalid: 'transformation' }
  const lineValues = [...transformation].map(Number)
  if (!isTransformation(lineValues)) return { invalid: 'transformation' }
  return { query, transformation: lineValues }
}

const datePattern = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/
const dateTimePattern =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hours>\d{2}):(?<minutes>\d{2}):(?<seconds>\d{2})(?:\.(?<milliseconds>\d{3}))?(?<offset>[+-]\d{2}:\d{2})$/

function decodeDivinedAt(value: unknown): DivinedAt | undefined {
  if (typeof value !== 'string') return undefined
  const date = datePattern.exec(value)?.groups
  if (date !== undefined) return calendarDay(date)
  const dateTime = dateTimePattern.exec(value)?.groups
  if (dateTime === undefined) return undefined
  const day = calendarDay(dateTime)
  const hours = Number(dateTime.hours)
  const minutes = Number(dateTime.minutes)
  const seconds = Number(dateTime.seconds)
  const { offset = '' } = dateTime
  if (day === undefined || hours > 23 || minutes > 59 || seconds > 59) {
    return undefined
  }
  if (!isUtcOffset(offset)) return undefined
  // Date.UTC reads the years 0 to 99 as 1900 to 1999, so the date is set on
  // its own.
  const instant = new Date(0)
  instant.setUTCFullYear(day.year, day.month - 1, day.day)
  instant.setUTCHours(
    hours,
    minutes,
    seconds,
    Number(dateTime.milliseconds ?? 0),
  )
  return {
    precision: 'moment',
    epochMilliseconds: instant.getTime() - offsetMinutes(offset) * 60_000,
    offset,
  }
}

function calendarDay(
  groups: Readonly<Record<string, string | undefined>>,
): Day | undefined {
  const day = {
    precision: 'day',
    year: Number(groups.year),
    month: Number(groups.month),
    day: Number(groups.day),
  } as const
  return isDay(day) ? day : undefined
}

function isTransformation(values: readonly number[]): values is Transformation {
  return (
    values.length === 6 &&
    values.every((value) => value >= 6 && value <= 9 && Number.isInteger(value))
  )
}

function isRecordCasting(value: unknown): value is RecordCasting {
  return (
    Array.isArray(value) &&
    value.length === 6 &&
    value.every(
      (line) =>
        Array.isArray(line) &&
        line.length === 3 &&
        line.every((pick) => Number.isInteger(pick)),
    )
  )
}

function isDivisionMethod(value: unknown): value is DivisionMethod {
  return divisionMethods.some((method) => method === value)
}

/**
 * Divides by each Pick in turn from the Empty Casting (ADR-0026): the
 * complete Casting, or undefined when a Division is refused.
 */
function replay(picks: RecordCasting): CompleteCasting | undefined {
  let casting: PartialCasting = emptyCasting
  for (const pick of picks.flat()) {
    const result = divide(casting, pick)
    if (result.outcome !== 'divided') return undefined
    if (result.casting.state === 'complete') return result.casting
    casting = result.casting
  }
  return undefined
}

function sameTransformation(
  left: Transformation,
  right: Transformation,
): boolean {
  return left.every((lineValue, index) => lineValue === right[index])
}

function isPlainObject(value: unknown): value is ParsedRecord {
  if (typeof value !== 'object' || value === null) return false
  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function unreadable(
  reason: Extract<DecodeResult, { outcome: 'unreadable' }>['reason'],
): DecodeResult {
  return { outcome: 'unreadable', reason }
}

function invalid(fieldName: RecordField): DecodeResult {
  return unreadable({ kind: 'invalid-field', field: fieldName })
}

function decoded(consultation: Consultation): DecodeResult {
  return { outcome: 'decoded', consultation }
}
