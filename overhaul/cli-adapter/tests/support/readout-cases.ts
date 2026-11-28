import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { CastConsultation } from '@hexagram/consultation-journal/cast-consultation'
import type { Consultation } from '@hexagram/consultation-journal/consultation'
import {
  isConsultationId,
  type ConsultationId,
} from '@hexagram/consultation-journal/consultation-id'
import {
  isDay,
  isUtcOffset,
  type Day,
  type Moment,
} from '@hexagram/consultation-journal/divined-at'
import type { DivisionMethod } from '@hexagram/consultation-journal/division-method'
import { isQuery, type Query } from '@hexagram/consultation-journal/query'
import type { CompleteCasting, PartialCasting } from '@hexagram/oracle/casting'
import { divide, emptyCasting } from '@hexagram/oracle/division'
import type { LineValue } from '@hexagram/oracle/line-value'
import type { Pick } from '@hexagram/oracle/pick'
import type { Transformation } from '@hexagram/oracle/transformation'

// The five Consultations of the Readout's byte fixtures: X之X, all
// six Lines of 乾 moving, several Moving Lines, a Recorded Consultation with
// a Moment, and one with a date-only Divined At. Every Query, Id and date is
// invented. Each Line is cast by the smallest Picks that give its Line Value,
// the Picks today's fixtures use, so each ledger can be read against today's.

function consultationId(text: string): ConsultationId {
  if (!isConsultationId(text)) throw new Error(`${text} is no ULID`)
  return text
}

function query(text: string): Query {
  if (!isQuery(text)) throw new Error('a blank Query')
  return text
}

/** A Moment at its UTC instant, read in `offset`. */
function moment(utcMilliseconds: number, offset: string): Moment {
  if (!isUtcOffset(offset)) throw new Error(`${offset} is no offset`)
  return { precision: 'moment', epochMilliseconds: utcMilliseconds, offset }
}

function day(year: number, month: number, dayOfMonth: number): Day {
  const value = { precision: 'day', year, month, day: dayOfMonth } as const
  if (!isDay(value)) throw new Error('no such day')
  return value
}

const picksFor: Record<LineValue, readonly Pick[]> = {
  6: [4, 3, 3],
  7: [1, 3, 3],
  8: [1, 1, 3],
  9: [1, 1, 1],
}

/** The Casting of this Transformation by `picksFor`, divided through the Oracle. */
function castingOf(transformation: Transformation): CompleteCasting {
  let casting: PartialCasting = emptyCasting
  for (const pick of transformation.flatMap((value) => picksFor[value])) {
    const result = divide(casting, pick)
    if (result.outcome !== 'divided') throw new Error(`refused Pick ${pick}`)
    if (result.casting.state === 'complete') return result.casting
    casting = result.casting
  }
  throw new Error('fewer than eighteen Picks')
}

function cast(
  transformation: Transformation,
  text: string,
  divinedAt: Moment,
  divisionMethod: DivisionMethod,
): CastConsultation {
  const casting = castingOf(transformation)
  return {
    origin: 'cast',
    id: consultationId('01M6E6AHA84T7V2M5N6P0R1S2K'),
    query: query(text),
    divinedAt,
    transformation: casting.transformation,
    casting,
    divisionMethod,
  }
}

export interface ReadoutCase {
  /** The fixture files' name: `plain-<name>.txt`, `ink-<name>.json`. */
  readonly name: string
  readonly consultation: Consultation
  /** Whether the fixtures hold a `.no-colour` twin of this case. */
  readonly plainWithoutColour: boolean
  readonly inkWithoutColour: boolean
}

export const readoutCases: readonly ReadoutCase[] = [
  {
    // X之X (既濟), cast, 2026-11-02 21:14 at +08:00.
    name: 'cast-x-zhi-x',
    consultation: cast(
      [7, 8, 7, 8, 7, 8],
      'Should the granary at Greyfen Hold be rebuilt before winter?',
      moment(Date.UTC(2026, 10, 2, 13, 14), '+08:00'),
      'automatic',
    ),
    plainWithoutColour: false,
    inkWithoutColour: false,
  },
  {
    // 乾 → 坤, every Line moving: 用九 with its 小象, no 用六. The seconds
    // of 07:45:59 are dropped, never rounded.
    name: 'cast-all-moving',
    consultation: cast(
      [9, 9, 9, 9, 9, 9],
      'Will the beacon on Greyfen Tor be lit before the thaw?',
      moment(Date.UTC(2026, 10, 5, 6, 45, 59), '+01:00'),
      'virtual',
    ),
    plainWithoutColour: true,
    inkWithoutColour: false,
  },
  {
    // 井之既濟, 初六 and 九二 moving. 23:59:30 at -05:00 is already
    // 11-13 in UTC; the Readout gives the date its own offset reads.
    name: 'cast-several-moving',
    consultation: cast(
      [6, 9, 7, 8, 7, 8],
      'How will Steward Aelric’s journey to Westmill unfold?',
      moment(Date.UTC(2026, 10, 13, 4, 59, 30), '-05:00'),
      'physical',
    ),
    plainWithoutColour: true,
    inkWithoutColour: true,
  },
  {
    // 未濟之睽, recorded with a Moment, its Query on two lines.
    name: 'recorded-moment',
    consultation: {
      origin: 'recorded',
      id: consultationId('01M6E6AHA84T7V2M5N6P0R1S2M'),
      query: query(
        'Should the Greyfen Hold council\nseat a new reeve this spring?',
      ),
      divinedAt: moment(Date.UTC(2026, 9, 30, 2, 35), '+05:30'),
      transformation: [6, 7, 8, 7, 8, 7],
    },
    plainWithoutColour: false,
    inkWithoutColour: false,
  },
  {
    // 乾之乾, recorded to the day only.
    name: 'recorded-day',
    consultation: {
      origin: 'recorded',
      id: consultationId('01M6E6AHA84T7V2M5N6P0R1S2N'),
      query: query('Will Steward Aelric’s embassy to Westmill succeed?'),
      divinedAt: day(2026, 10, 28),
      transformation: [7, 7, 7, 7, 7, 7],
    },
    plainWithoutColour: false,
    inkWithoutColour: false,
  },
]

const fixtureFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'readout',
)

/** A Readout fixture's bytes, as UTF-8 text. */
export function readoutFixture(fileName: string): string {
  return readFileSync(path.join(fixtureFolder, fileName), 'utf8')
}
