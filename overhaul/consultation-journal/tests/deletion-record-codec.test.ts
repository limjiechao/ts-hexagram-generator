import { describe, expect, it } from 'vitest'

import { isConsultationId, type ConsultationId } from '#src/consultation-id.js'
import type { DeletionRecord } from '#src/deletion-record.js'
import { isUtcOffset, type Moment } from '#src/divined-at.js'
import {
  decodeDeletionRecord,
  encodeDeletionRecord,
} from '#src/record-codec.js'

// Every Id and date below is invented.

function consultationId(text: string): ConsultationId {
  if (!isConsultationId(text)) throw new Error(`${text} is not a ULID`)
  return text
}

function moment(epochMilliseconds: number, offset: string): Moment {
  if (!isUtcOffset(offset)) throw new Error(`the offset ${offset} is malformed`)
  return { precision: 'moment', epochMilliseconds, offset }
}

const id = consultationId('01M6E6AHA84T7V2M5N6P0R1S2K')

/** 2026-11-27T01:15:00.000Z. */
const instant = 1_795_742_100_000
/** 2026-11-28T03:40:12.345Z. */
const withMilliseconds = 1_795_837_212_345

const record: DeletionRecord = {
  consultationId: id,
  deletedAt: moment(instant, '+08:00'),
}

const validData = {
  consultationId: id,
  deletedAt: '2026-11-27T09:15:00.000+08:00',
}

describe('encodeDeletionRecord', () => {
  it("writes the Id and deletedAt in the Moment's own offset, keys in order", () => {
    const data = encodeDeletionRecord(record)

    expect(data).toEqual(validData)
    expect(Object.keys(data)).toEqual(['consultationId', 'deletedAt'])
  })

  it.each([
    ['-05:00', '2026-11-26T20:15:00.000-05:00'],
    ['+05:45', '2026-11-27T07:00:00.000+05:45'],
    ['+00:00', '2026-11-27T01:15:00.000+00:00'],
  ])('writes the offset %s as itself', (offset, text) => {
    expect(
      encodeDeletionRecord({
        consultationId: id,
        deletedAt: moment(instant, offset),
      }).deletedAt,
    ).toBe(text)
  })
})

describe('the round trip', () => {
  it.each([
    [instant, '+08:00'],
    [instant, '-05:00'],
    [withMilliseconds, '+14:00'],
    [withMilliseconds, '-12:00'],
    [withMilliseconds, '+05:45'],
    [withMilliseconds, '+00:00'],
  ])('gives back an equal record for %d at %s', (epoch, offset) => {
    const original: DeletionRecord = {
      consultationId: id,
      deletedAt: moment(epoch, offset),
    }

    expect(decodeDeletionRecord(encodeDeletionRecord(original))).toEqual({
      outcome: 'decoded',
      deletionRecord: original,
    })
  })

  it('survives JSON text in between', () => {
    const text = JSON.stringify(encodeDeletionRecord(record), null, 2)

    expect(decodeDeletionRecord(JSON.parse(text))).toEqual({
      outcome: 'decoded',
      deletionRecord: record,
    })
  })
})

describe('decodeDeletionRecord', () => {
  it('accepts deletedAt with no fraction digits', () => {
    expect(
      decodeDeletionRecord({
        consultationId: id,
        deletedAt: '2026-11-27T09:15:00+08:00',
      }),
    ).toEqual({ outcome: 'decoded', deletionRecord: record })
  })

  it('ignores keys it does not name', () => {
    expect(
      decodeDeletionRecord({ ...validData, note: 'kept by hand', extra: [1] }),
    ).toEqual({ outcome: 'decoded', deletionRecord: record })
  })

  it.each([
    ['null', null],
    ['an array', [validData]],
    ['a string', JSON.stringify(validData)],
    ['a number', 7],
    ['a boolean', true],
    ['undefined', undefined],
  ])('refuses %s', (_kind, data) => {
    expect(decodeDeletionRecord(data)).toEqual({ outcome: 'unreadable' })
  })

  it.each([
    ['missing', { deletedAt: validData.deletedAt }],
    ['null', { ...validData, consultationId: null }],
    ['a number', { ...validData, consultationId: 7 }],
    ['lower case', { ...validData, consultationId: id.toLowerCase() }],
    ['25 characters', { ...validData, consultationId: id.slice(1) }],
    [
      'a letter outside the alphabet',
      { ...validData, consultationId: `${id.slice(0, 25)}U` },
    ],
    ['past 128 bits', { ...validData, consultationId: `8${id.slice(1)}` }],
  ])('refuses a consultationId that is %s', (_kind, data) => {
    expect(decodeDeletionRecord(data)).toEqual({ outcome: 'unreadable' })
  })

  it.each([
    ['missing', { consultationId: id }],
    ['a date alone', { ...validData, deletedAt: '2026-11-27' }],
    ['in UTC as Z', { ...validData, deletedAt: '2026-11-27T01:15:00.000Z' }],
    [
      'without an offset',
      { ...validData, deletedAt: '2026-11-27T09:15:00.000' },
    ],
    [
      'on a day that does not exist',
      { ...validData, deletedAt: '2026-02-30T09:15:00.000+08:00' },
    ],
    [
      'on 29 February of a common year',
      { ...validData, deletedAt: '2027-02-29T09:15:00.000+08:00' },
    ],
    [
      'at hour 24',
      { ...validData, deletedAt: '2026-11-27T24:00:00.000+08:00' },
    ],
    [
      'with an offset no time zone uses',
      { ...validData, deletedAt: '2026-11-27T09:15:00.000+15:00' },
    ],
    [
      'with the unknown offset -00:00',
      { ...validData, deletedAt: '2026-11-27T09:15:00.000-00:00' },
    ],
    [
      'with one fraction digit',
      { ...validData, deletedAt: '2026-11-27T09:15:00.1+08:00' },
    ],
    ['a number', { ...validData, deletedAt: instant }],
    ['null', { ...validData, deletedAt: null }],
  ])('refuses a deletedAt that is %s', (_kind, data) => {
    expect(decodeDeletionRecord(data)).toEqual({ outcome: 'unreadable' })
  })

  it('never throws on arbitrary JSON', () => {
    const values: unknown[] = [
      {},
      [],
      '',
      0,
      -0,
      Number.MAX_SAFE_INTEGER,
      { consultationId: {}, deletedAt: [] },
      { consultationId: [id], deletedAt: [validData.deletedAt] },
      { consultationId: '', deletedAt: '' },
      { deletedAt: { precision: 'moment', epochMilliseconds: instant } },
      JSON.parse('{"__proto__": {"consultationId": "x"}}'),
      [[[[[]]]]],
      { a: { b: { c: null } } },
    ]
    // A small deterministic generator, so a failure always reproduces.
    let seed = 0x2f6e2b1
    const next = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648
      return seed
    }
    const leaves = [null, true, false, 0, 1.5, '', 'x', id, validData.deletedAt]
    const keys = ['consultationId', 'deletedAt', 'note']
    function generate(depth: number): unknown {
      const choice = next() % (depth > 3 ? 1 : 3)
      if (choice === 0) return leaves[next() % leaves.length]
      if (choice === 1)
        return Array.from({ length: next() % 3 }, () => generate(depth + 1))
      return Object.fromEntries(
        keys
          .filter(() => next() % 2 === 0)
          .map((key) => [key, generate(depth + 1)]),
      )
    }
    for (let at = 0; at < 500; at += 1) values.push(generate(0))

    for (const value of values) {
      expect(() => decodeDeletionRecord(value)).not.toThrow()
    }
  })
})
