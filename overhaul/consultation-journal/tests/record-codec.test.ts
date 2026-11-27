import type { CompleteCasting, PartialCasting } from '@hexagram/oracle/casting'
import { divide, emptyCasting } from '@hexagram/oracle/division'
import { describe, expect, it } from 'vitest'

import type { CastConsultation } from '#src/cast-consultation.js'
import { isConsultationId, type ConsultationId } from '#src/consultation-id.js'
import { isDay, isUtcOffset, type Day, type Moment } from '#src/divined-at.js'
import type { DivisionMethod } from '#src/division-method.js'
import { isQuery, type Query } from '#src/query.js'
import { decodeRecord, encodeRecord } from '#src/record-codec.js'
import type { RecordedConsultation } from '#src/recorded-consultation.js'
import type { RecordField } from '#src/unreadable-file.js'

// Every Query, Id and date below is invented.

function consultationId(text: string): ConsultationId {
  if (!isConsultationId(text)) throw new Error(`${text} is not a ULID`)
  return text
}

function query(text: string): Query {
  if (!isQuery(text))
    throw new Error(`the Query ${JSON.stringify(text)} is blank`)
  return text
}

function moment(epochMilliseconds: number, offset: string): Moment {
  if (!isUtcOffset(offset)) throw new Error(`the offset ${offset} is malformed`)
  return { precision: 'moment', epochMilliseconds, offset }
}

function day(year: number, month: number, dayOfMonth: number): Day {
  const value = { precision: 'day', year, month, day: dayOfMonth } as const
  if (!isDay(value)) throw new Error('no such day')
  return value
}

/** Divides by each Pick in turn, from the Empty Casting to a complete one. */
function castByPicks(picks: readonly number[]): CompleteCasting {
  let casting: PartialCasting = emptyCasting
  for (const pick of picks) {
    const result = divide(casting, pick)
    if (result.outcome !== 'divided') {
      throw new Error(`refused: ${JSON.stringify(result.refusal)}`)
    }
    if (result.casting.state === 'complete') return result.casting
    casting = result.casting
  }
  throw new Error('the Picks did not complete the Casting')
}

// Line by Line, the Picks of an Old Yin 6, a Young Yang 7, a Young Yin 8, an
// Old Yang 9, a Young Yang 7 and an Old Yin 6 (ADR-0023's tables).
const mixedPicks = [
  [4, 3, 4],
  [4, 3, 1],
  [22, 1, 3],
  [47, 42, 37],
  [4, 3, 1],
  [4, 3, 4],
] as const
const mixedCasting = castByPicks(mixedPicks.flat())

// Pick 1 in every Round: Old Yang 9 in all six Lines.
const oldYangPicks = [
  [1, 1, 1],
  [1, 1, 1],
  [1, 1, 1],
  [1, 1, 1],
  [1, 1, 1],
  [1, 1, 1],
] as const
const oldYangCasting = castByPicks(oldYangPicks.flat())

const firstId = consultationId('01JDZ8Q6R4X3V7M2N5P9T0W1YC')
const secondId = consultationId('01JE0A1B2C3D4E5F6G7H8J9K0M')

/** 2026-11-26T00:00:00.123Z. */
const instant = 1_795_651_200_123

function cast(
  casting: CompleteCasting,
  divisionMethod: DivisionMethod,
  divinedAt: Moment = moment(instant, '+08:00'),
): CastConsultation {
  return {
    origin: 'cast',
    id: firstId,
    query: query('Should the Greyfen granary open early?'),
    divinedAt,
    transformation: casting.transformation,
    casting,
    divisionMethod,
  }
}

function recorded(
  divinedAt: Moment | Day,
  text = 'Will the ferry at Ashmere run before the thaw?',
): RecordedConsultation {
  return {
    origin: 'recorded',
    id: secondId,
    query: query(text),
    divinedAt,
    transformation: [7, 8, 7, 8, 7, 8],
  }
}

/** A well-formed version-2 record of a Cast Consultation, as parsed plain data. */
function castRecord(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    id: firstId,
    divinedAt: '2026-11-26T08:00:00.123+08:00',
    query: 'Should the Greyfen granary open early?',
    transformation: '678976',
    casting: mixedPicks.map((line) => [...line]),
    divisionMethod: 'virtual',
  }
}

/** A well-formed version-2 record of a Recorded Consultation, as parsed plain data. */
function recordedRecord(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    id: secondId,
    divinedAt: '2019-03-07',
    query: 'Will the ferry at Ashmere run before the thaw?',
    transformation: '787878',
  }
}

function unreadable(reason: unknown): unknown {
  return { outcome: 'unreadable', reason }
}

function invalidField(field: RecordField): unknown {
  return unreadable({ kind: 'invalid-field', field })
}

describe('the fixtures', () => {
  it('cast the Transformations their comments name', () => {
    expect(mixedCasting.transformation).toEqual([6, 7, 8, 9, 7, 6])
    expect(oldYangCasting.transformation).toEqual([9, 9, 9, 9, 9, 9])
  })
})

describe('encodeRecord', () => {
  it('writes a Cast Consultation as its version-2 record', () => {
    expect(encodeRecord(cast(mixedCasting, 'virtual'))).toEqual(castRecord())
  })

  it('writes a Recorded Consultation without casting or divisionMethod', () => {
    const record = encodeRecord(recorded(day(2019, 3, 7)))
    expect(record).toEqual(recordedRecord())
    expect('casting' in record).toBe(false)
    expect('divisionMethod' in record).toBe(false)
  })

  it("puts a Cast Consultation's keys in ADR-0030's table order", () => {
    expect(
      Object.keys(encodeRecord(cast(oldYangCasting, 'automatic'))),
    ).toEqual([
      'schemaVersion',
      'id',
      'divinedAt',
      'query',
      'transformation',
      'casting',
      'divisionMethod',
    ])
  })

  it("puts a Recorded Consultation's keys in ADR-0030's table order", () => {
    expect(Object.keys(encodeRecord(recorded(day(2019, 3, 7))))).toEqual([
      'schemaVersion',
      'id',
      'divinedAt',
      'query',
      'transformation',
    ])
  })

  it('writes the Transformation as a string, Line Position 1 first', () => {
    expect(encodeRecord(cast(mixedCasting, 'physical')).transformation).toBe(
      '678976',
    )
  })

  it('writes the Casting as six lists of three Picks, bottom-up, Picks only', () => {
    const record = encodeRecord(cast(mixedCasting, 'physical'))
    expect('casting' in record && record.casting).toEqual(
      mixedPicks.map((line) => [...line]),
    )
  })

  it.each([
    ['+08:00', '2026-11-26T08:00:00.123+08:00'],
    ['+00:00', '2026-11-26T00:00:00.123+00:00'],
    ['-05:00', '2026-11-25T19:00:00.123-05:00'],
    ['+05:45', '2026-11-26T05:45:00.123+05:45'],
    ['-09:30', '2026-11-25T14:30:00.123-09:30'],
    ['+14:00', '2026-11-26T14:00:00.123+14:00'],
  ])('writes a Moment in its own offset %s', (offset, text) => {
    expect(encodeRecord(recorded(moment(instant, offset))).divinedAt).toBe(text)
  })

  it('writes exactly three fraction digits when the milliseconds are zero', () => {
    expect(
      encodeRecord(recorded(moment(1_795_651_200_000, '+08:00'))).divinedAt,
    ).toBe('2026-11-26T08:00:00.000+08:00')
  })

  it('writes a Day as a date only', () => {
    expect(encodeRecord(recorded(day(2019, 3, 7))).divinedAt).toBe('2019-03-07')
  })

  it('pads a Day of an early year to four digits', () => {
    expect(encodeRecord(recorded(day(987, 1, 2))).divinedAt).toBe('0987-01-02')
  })

  it('writes the Query verbatim, trailing newlines and all', () => {
    const text = '  What of the mill?\nAnd the weir?\n\n'
    expect(encodeRecord(recorded(day(2019, 3, 7), text)).query).toBe(text)
  })
})

describe('decodeRecord: round trip', () => {
  it.each<DivisionMethod>(['automatic', 'physical', 'virtual'])(
    'gives back an equal Cast Consultation divided %s',
    (divisionMethod) => {
      const consultation = cast(mixedCasting, divisionMethod)
      expect(decodeRecord(encodeRecord(consultation))).toEqual({
        outcome: 'decoded',
        consultation,
      })
    },
  )

  it('gives back an equal Cast Consultation of six Old Yang Lines', () => {
    const consultation = cast(oldYangCasting, 'automatic')
    expect(decodeRecord(encodeRecord(consultation))).toEqual({
      outcome: 'decoded',
      consultation,
    })
  })

  it.each(['+08:00', '+00:00', '-05:00', '+05:45', '-12:00', '+14:00'])(
    "keeps a Moment's milliseconds and its offset %s",
    (offset) => {
      const consultation = cast(
        mixedCasting,
        'virtual',
        moment(instant + 876, offset),
      )
      expect(decodeRecord(encodeRecord(consultation))).toEqual({
        outcome: 'decoded',
        consultation,
      })
    },
  )

  it('gives back a Recorded Consultation divined at a Moment', () => {
    const consultation = recorded(moment(instant, '-05:00'))
    expect(decodeRecord(encodeRecord(consultation))).toEqual({
      outcome: 'decoded',
      consultation,
    })
  })

  it('gives back a Recorded Consultation divined on a Day', () => {
    const consultation = recorded(day(2019, 3, 7))
    expect(decodeRecord(encodeRecord(consultation))).toEqual({
      outcome: 'decoded',
      consultation,
    })
  })

  it('gives back a Query with trailing newlines verbatim', () => {
    const consultation = recorded(day(2020, 2, 29), 'Is the bridge sound?\n\n')
    expect(decodeRecord(encodeRecord(consultation))).toEqual({
      outcome: 'decoded',
      consultation,
    })
  })

  it('survives a trip through JSON text', () => {
    const consultation = cast(
      mixedCasting,
      'physical',
      moment(instant, '+05:45'),
    )
    const text = JSON.stringify(encodeRecord(consultation))
    const parsed: unknown = JSON.parse(text)
    expect(decodeRecord(parsed)).toEqual({ outcome: 'decoded', consultation })
  })
})

describe('decodeRecord: well-formed records', () => {
  it('loads a Cast Consultation from a hand-written record', () => {
    expect(decodeRecord(castRecord())).toEqual({
      outcome: 'decoded',
      consultation: cast(mixedCasting, 'virtual'),
    })
  })

  it('loads a Recorded Consultation from a hand-written record', () => {
    expect(decodeRecord(recordedRecord())).toEqual({
      outcome: 'decoded',
      consultation: recorded(day(2019, 3, 7)),
    })
  })

  it('accepts a date-time without a fraction as whole seconds', () => {
    expect(
      decodeRecord({ ...castRecord(), divinedAt: '2026-11-26T08:00:00+08:00' }),
    ).toEqual({
      outcome: 'decoded',
      consultation: cast(
        mixedCasting,
        'virtual',
        moment(1_795_651_200_000, '+08:00'),
      ),
    })
  })

  it('reads the instant and the offset from a negative-offset date-time', () => {
    expect(
      decodeRecord({
        ...recordedRecord(),
        divinedAt: '2026-11-25T19:00:00.123-05:00',
      }),
    ).toEqual({
      outcome: 'decoded',
      consultation: recorded(moment(instant, '-05:00')),
    })
  })

  it('ignores fields the record does not name', () => {
    expect(
      decodeRecord({
        ...castRecord(),
        hexagram: { L6: 6 },
        timestamp: '2026-11-26T08:00:00+08:00',
        notes: 'written by hand',
      }),
    ).toEqual({
      outcome: 'decoded',
      consultation: cast(mixedCasting, 'virtual'),
    })
  })
})

describe('decodeRecord: not-version-2', () => {
  it.each<[string, unknown]>([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'schemaVersion: 2'],
    ['a number', 2],
    ['a boolean', true],
    ['an array', [castRecord()]],
    ['an empty array', []],
  ])('refuses a root that is not a mapping: %s', (_, record) => {
    expect(decodeRecord(record)).toEqual(unreadable({ kind: 'not-version-2' }))
  })

  it('refuses a record without schemaVersion', () => {
    const { schemaVersion: _, ...record } = castRecord()
    expect(decodeRecord(record)).toEqual(unreadable({ kind: 'not-version-2' }))
  })

  it.each<[string, unknown]>([
    ['1', 1],
    ['3', 3],
    ['"2"', '2'],
    ['null', null],
    ['2.5', 2.5],
  ])('refuses schemaVersion %s', (_, schemaVersion) => {
    expect(decodeRecord({ ...castRecord(), schemaVersion })).toEqual(
      unreadable({ kind: 'not-version-2' }),
    )
  })

  it('refuses a version-1 record', () => {
    expect(
      decodeRecord({
        schemaVersion: 1,
        timestamp: '2026-05-19T09:00:00+08:00',
        query: 'Should the Greyfen granary open early?',
        hexagram: { L6: 7, L5: 8, L4: 7, L3: 8, L2: 7, L1: 8 },
        castingAbsence: 'legacy-no-table',
      }),
    ).toEqual(unreadable({ kind: 'not-version-2' }))
  })

  it('reports schemaVersion before any field', () => {
    expect(
      decodeRecord({ ...castRecord(), schemaVersion: 1, id: 'nope' }),
    ).toEqual(unreadable({ kind: 'not-version-2' }))
  })
})

describe('decodeRecord: invalid-field', () => {
  it.each(['id', 'divinedAt', 'query', 'transformation'] as const)(
    'names a missing %s',
    (field) => {
      const record = castRecord()
      delete record[field]
      expect(decodeRecord(record)).toEqual(invalidField(field))
    },
  )

  it('names divisionMethod when a Casting has none', () => {
    const record = castRecord()
    delete record.divisionMethod
    expect(decodeRecord(record)).toEqual(invalidField('divisionMethod'))
  })

  it.each<[RecordField, unknown]>([
    ['id', 'not-a-ulid'],
    ['id', ''],
    ['id', 42],
    ['id', '81JDZ8Q6R4X3V7M2N5P9T0W1YC'],
    ['divinedAt', 'yesterday'],
    ['divinedAt', ''],
    ['divinedAt', 1_795_651_200_123],
    ['query', ''],
    ['query', '  \n\t '],
    ['query', 7],
    ['query', ['Should the Greyfen granary open early?']],
    ['transformation', '67897'],
    ['transformation', '6789766'],
    ['transformation', '678975'],
    ['transformation', '67897x'],
    ['transformation', [6, 7, 8, 9, 7, 6]],
    ['casting', 'six lines'],
    ['casting', mixedPicks.slice(0, 5).map((line) => [...line])],
    ['casting', mixedPicks.map((line) => line.slice(0, 2))],
    ['casting', mixedPicks.map((line) => line.map(String))],
    ['casting', mixedPicks.flat()],
    ['divisionMethod', 'manual'],
    ['divisionMethod', 'Automatic'],
    ['divisionMethod', 1],
  ])('names %s holding %j', (field, value) => {
    expect(decodeRecord({ ...castRecord(), [field]: value })).toEqual(
      invalidField(field),
    )
  })

  it.each(['2019-02-29', '2019-13-01', '2019-04-31', '2019-3-7'])(
    "names a Recorded Consultation's divinedAt written %s",
    (divinedAt) => {
      expect(decodeRecord({ ...recordedRecord(), divinedAt })).toEqual(
        invalidField('divinedAt'),
      )
    },
  )

  it('names transformation when it parsed as a number', () => {
    expect(
      decodeRecord({ ...recordedRecord(), transformation: 787878 }),
    ).toEqual(invalidField('transformation'))
  })

  it('names divinedAt when it is written in UTC with Z', () => {
    expect(
      decodeRecord({ ...castRecord(), divinedAt: '2026-11-26T00:00:00.123Z' }),
    ).toEqual(invalidField('divinedAt'))
  })

  it.each([
    '2026-11-26T08:00:00.123+15:00',
    '2026-11-26T08:00:00.123-00:00',
    '2026-11-26T08:00:00.123+0800',
    '2026-11-26T08:00:00.123',
    '2026-11-26T08:00:00.12+08:00',
    '2026-11-26T08:00:00.123456+08:00',
  ])('names divinedAt written %s', (divinedAt) => {
    expect(decodeRecord({ ...castRecord(), divinedAt })).toEqual(
      invalidField('divinedAt'),
    )
  })

  it("names divinedAt when a Cast Consultation's is a Day", () => {
    expect(decodeRecord({ ...castRecord(), divinedAt: '2026-11-26' })).toEqual(
      invalidField('divinedAt'),
    )
  })

  it('names the first invalid field in table order', () => {
    expect(
      decodeRecord({
        ...castRecord(),
        id: 'nope',
        query: '',
        divisionMethod: 'manual',
      }),
    ).toEqual(invalidField('id'))
    expect(
      decodeRecord({ ...castRecord(), transformation: 'x', casting: 'y' }),
    ).toEqual(invalidField('transformation'))
  })

  it('reports an invalid field before a Casting that does not replay', () => {
    expect(
      decodeRecord({
        ...castRecord(),
        transformation: '999999',
        divisionMethod: 'manual',
      }),
    ).toEqual(invalidField('divisionMethod'))
  })

  it('names divisionMethod when a Recorded record carries one', () => {
    expect(
      decodeRecord({ ...recordedRecord(), divisionMethod: 'automatic' }),
    ).toEqual(invalidField('divisionMethod'))
  })

  it('names casting when it is null', () => {
    expect(decodeRecord({ ...castRecord(), casting: null })).toEqual(
      invalidField('casting'),
    )
  })

  it('names divisionMethod when it is null', () => {
    expect(decodeRecord({ ...castRecord(), divisionMethod: null })).toEqual(
      invalidField('divisionMethod'),
    )
  })

  it.each([
    '2026-02-30T08:00:00.123+08:00',
    '2026-11-26T24:00:00.000+08:00',
    '2026-11-26T08:60:00.000+08:00',
    '2026-11-26T08:00:60.000+08:00',
  ])('names divinedAt with the impossible date-time %s', (divinedAt) => {
    expect(decodeRecord({ ...castRecord(), divinedAt })).toEqual(
      invalidField('divinedAt'),
    )
  })

  it.each(['2026-11-26t08:00:00.123+08:00', '2026-11-26 08:00:00.123+08:00'])(
    'names divinedAt with the separator in %s',
    (divinedAt) => {
      expect(decodeRecord({ ...castRecord(), divinedAt })).toEqual(
        invalidField('divinedAt'),
      )
    },
  )

  it('names id when the ULID is lower case', () => {
    expect(
      decodeRecord({ ...castRecord(), id: firstId.toLowerCase() }),
    ).toEqual(invalidField('id'))
  })

  it('names casting when a Pick is not an integer', () => {
    const casting: number[][] = mixedPicks.map((line) => [...line])
    casting[2] = [22, 2.5, 3]
    expect(decodeRecord({ ...castRecord(), casting })).toEqual(
      invalidField('casting'),
    )
  })

  it("names a Cast record's Day divinedAt before its malformed casting", () => {
    expect(
      decodeRecord({
        ...castRecord(),
        divinedAt: '2026-11-26',
        casting: 'six lines',
      }),
    ).toEqual(invalidField('divinedAt'))
  })
})

describe('decodeRecord: casting-does-not-replay', () => {
  it('refuses a Casting whose Transformation is not the one recorded', () => {
    expect(decodeRecord({ ...castRecord(), transformation: '999999' })).toEqual(
      unreadable({ kind: 'casting-does-not-replay' }),
    )
  })

  it('refuses a Casting one Line Value away from the one recorded', () => {
    expect(decodeRecord({ ...castRecord(), transformation: '678977' })).toEqual(
      unreadable({ kind: 'casting-does-not-replay' }),
    )
  })

  it('refuses a Casting whose Picks the Divisions refuse', () => {
    // After a first Pick of 1 the second Round has 44 stalks, so Pick 47 is
    // beyond its valid Picks (ADR-0023).
    const casting: number[][] = oldYangPicks.map((line) => [...line])
    casting[0] = [1, 47, 1]
    expect(
      decodeRecord({ ...castRecord(), transformation: '999999', casting }),
    ).toEqual(unreadable({ kind: 'casting-does-not-replay' }))
  })

  it('refuses a Pick beyond the first Round of 49 stalks', () => {
    const casting: number[][] = oldYangPicks.map((line) => [...line])
    casting[0] = [48, 1, 1]
    expect(
      decodeRecord({ ...castRecord(), transformation: '999999', casting }),
    ).toEqual(unreadable({ kind: 'casting-does-not-replay' }))
  })

  it.each([0, -1])('refuses the integer Pick %d', (pick) => {
    const casting: number[][] = oldYangPicks.map((line) => [...line])
    casting[1] = [1, pick, 1]
    expect(
      decodeRecord({ ...castRecord(), transformation: '999999', casting }),
    ).toEqual(unreadable({ kind: 'casting-does-not-replay' }))
  })
})

/** A small seeded generator, so a failure reproduces. */
function generator(seed: number): () => number {
  let state = seed % 2 ** 32
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 2 ** 32
    return state / 2 ** 32
  }
}

function jsonValue(next: () => number, depth: number): unknown {
  const strings = ['', '2', '789876', '2026-11-26', 'virtual', firstId]
  const roll = next()
  if (depth <= 0 || roll < 0.5) {
    const leaf = next()
    if (leaf < 0.15) return null
    if (leaf < 0.3) return next() < 0.5
    if (leaf < 0.45) return Math.floor(next() * 100) - 10
    if (leaf < 0.6) return next() * 1e6
    return strings[Math.floor(next() * strings.length)]
  }
  if (roll < 0.75) {
    return Array.from({ length: Math.floor(next() * 4) }, () =>
      jsonValue(next, depth - 1),
    )
  }
  const keys = [...Object.keys(castRecord()), 'extra']
  return Object.fromEntries(
    keys
      .filter(() => next() < 0.6)
      .map((key) => [key, jsonValue(next, depth - 1)]),
  )
}

describe('decodeRecord never throws', () => {
  it('returns a result for 500 arbitrary JSON values', () => {
    const next = generator(20_261_127)
    for (let at = 0; at < 500; at += 1) {
      const value = jsonValue(next, 4)
      const result = decodeRecord(value)
      expect(['decoded', 'unreadable'], JSON.stringify(value)).toContain(
        result.outcome,
      )
    }
  })

  it('returns the ruled reason for every field replaced by junk', () => {
    const junk: readonly unknown[] = [
      undefined,
      null,
      0,
      -1,
      1.5,
      true,
      '',
      ' ',
      [],
      [[]],
      {},
      { nested: [1, 2, 3] },
    ]
    for (const key of Object.keys(castRecord())) {
      for (const value of junk) {
        // An undefined casting counts as missing, which leaves a Recorded
        // record carrying divisionMethod (ADR-0030's table).
        let reason: unknown = { kind: 'invalid-field', field: key }
        if (key === 'schemaVersion') reason = { kind: 'not-version-2' }
        if (key === 'casting' && value === undefined) {
          reason = { kind: 'invalid-field', field: 'divisionMethod' }
        }
        expect(
          decodeRecord({ ...castRecord(), [key]: value }),
          `${key}: ${String(JSON.stringify(value))}`,
        ).toEqual(unreadable(reason))
      }
    }
  })
})
