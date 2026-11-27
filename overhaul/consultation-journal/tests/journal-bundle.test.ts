import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import type { Consultation } from '#src/consultation.js'
import type { DeletionRecord } from '#src/deletion-record.js'
import {
  decodeJournalBundle,
  encodeJournalBundle,
  journalBundleFormat,
  journalBundleVersion,
  type JournalBundleDecodeResult,
} from '#src/journal-bundle.js'
import type { Journal } from '#src/journal.js'
import {
  decodeDeletionRecord,
  decodeRecord,
  encodeDeletionRecord,
  encodeRecord,
} from '#src/record-codec.js'

// Every Query, Id and date below is invented. The fixtures were written by
// `JSON.stringify(bundle, null, 2)` and a newline, the layout the bundle's
// doc comment fixes; they bind the PWA too, so they change only on purpose.
// No fixture holds a body: a bundle carries records, never rendered text.

function readFixture(name: string): Promise<string> {
  return readFile(new URL(`fixtures/${name}`, import.meta.url), 'utf8')
}

function consultationOf(record: Record<string, unknown>): Consultation {
  const decoded = decodeRecord(record)
  if (decoded.outcome !== 'decoded') {
    throw new Error(`the record is unreadable: ${JSON.stringify(decoded)}`)
  }
  return decoded.consultation
}

function deletionRecordOf(data: Record<string, unknown>): DeletionRecord {
  const decoded = decodeDeletionRecord(data)
  if (decoded.outcome !== 'decoded') {
    throw new Error(`no Deletion Record: ${JSON.stringify(data)}`)
  }
  return decoded.deletionRecord
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
]

const castRecord = {
  schemaVersion: 2,
  id: '01JDZ8Q6R4X3V7M2N5P9T0W1YC',
  divinedAt: '2026-11-02T21:14:05.250+08:00',
  query: '格林芬堡的糧倉應在入冬前重建嗎？',
  transformation: '678976',
  casting: mixedPicks,
  divisionMethod: 'physical',
}
const recordedMomentRecord = {
  schemaVersion: 2,
  id: '01JE0A1B2C3D4E5F6G7H8J9K0M',
  divinedAt: '2026-10-28T19:45:30.000-05:00',
  query: 'Will the "Grey Lantern" inn at Westmill reopen?',
  transformation: '787878',
}
const recordedDayRecord = {
  schemaVersion: 2,
  id: '01HZX4P0S2T6V8W0Y2Z4A6B8C0',
  divinedAt: '2026-03-16',
  query: 'Should the ferry at Ashmere run this spring?\nOr wait for the thaw?',
  transformation: '999666',
}

const cast = consultationOf(castRecord)
const recordedMoment = consultationOf(recordedMomentRecord)
const recordedDay = consultationOf(recordedDayRecord)

const laterDeletion = deletionRecordOf({
  consultationId: '01JB7C9D1E3F5G7H9J1K3M5N7P',
  deletedAt: '2026-11-20T08:30:00.000-05:00',
})
const earlierIdDeletion = deletionRecordOf({
  consultationId: '01J9QRSTVWXYZ0123456789ABC',
  deletedAt: '2026-11-27T09:15:00.000+08:00',
})

/** The fixture's Journal, given in no sorted order. */
const journal: Journal = {
  consultations: [recordedMoment, cast, recordedDay],
  deletionRecords: [laterDeletion, earlierIdDeletion],
}

const emptyJournal: Journal = { consultations: [], deletionRecords: [] }

/** The bundle's object, before it is written as text. */
function bundleOf(fields: {
  readonly consultations: readonly unknown[]
  readonly deletionRecords: readonly unknown[]
}): Record<string, unknown> {
  return {
    format: journalBundleFormat,
    version: journalBundleVersion,
    consultations: fields.consultations,
    deletionRecords: fields.deletionRecords,
  }
}

function textOf(bundle: unknown): string {
  return `${JSON.stringify(bundle, null, 2)}\n`
}

/** The decoded Journal, compared without regard to order. */
function expectDecodedJournal(
  result: JournalBundleDecodeResult,
  expected: Journal,
): void {
  if (result.outcome !== 'decoded') {
    throw new Error(`the bundle was refused: ${JSON.stringify(result)}`)
  }
  expect(result.journal.consultations).toHaveLength(
    expected.consultations.length,
  )
  expect(result.journal.consultations).toEqual(
    expect.arrayContaining([...expected.consultations]),
  )
  expect(result.journal.deletionRecords).toHaveLength(
    expected.deletionRecords.length,
  )
  expect(result.journal.deletionRecords).toEqual(
    expect.arrayContaining([...expected.deletionRecords]),
  )
}

describe('the bundle format', () => {
  it('is named hexagram-journal, version 1', () => {
    expect(journalBundleFormat).toBe('hexagram-journal')
    expect(journalBundleVersion).toBe(1)
  })
})

describe('encodeJournalBundle', () => {
  it('writes the fixture: records sorted by Id, 2-space JSON, a final newline', async () => {
    expect(encodeJournalBundle(journal)).toBe(
      await readFixture('journal-bundle.json'),
    )
  })

  it('writes an empty Journal as the empty fixture', async () => {
    expect(encodeJournalBundle(emptyJournal)).toBe(
      await readFixture('journal-bundle-empty.json'),
    )
  })

  it.each([
    [
      'reversed',
      [recordedDay, cast, recordedMoment],
      [earlierIdDeletion, laterDeletion],
    ],
    [
      'already sorted',
      [recordedDay, cast, recordedMoment],
      [laterDeletion, earlierIdDeletion],
    ],
    [
      'rotated',
      [cast, recordedDay, recordedMoment],
      [earlierIdDeletion, laterDeletion],
    ],
  ])(
    'gives the same bytes whatever order the Journal lists its records in (%s)',
    async (_order, consultations, deletionRecords) => {
      expect(encodeJournalBundle({ consultations, deletionRecords })).toBe(
        await readFixture('journal-bundle.json'),
      )
    },
  )

  it('holds format, version, consultations and deletionRecords, in that order, each record as the record codec gives it', () => {
    const parsed: unknown = JSON.parse(encodeJournalBundle(journal))
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('the bundle is not an object')
    }

    expect(Object.keys(parsed)).toEqual([
      'format',
      'version',
      'consultations',
      'deletionRecords',
    ])
    expect(parsed).toEqual(
      bundleOf({
        consultations: [recordedDay, cast, recordedMoment].map(encodeRecord),
        deletionRecords: [earlierIdDeletion, laterDeletion].map(
          encodeDeletionRecord,
        ),
      }),
    )
  })

  it('writes Chinese as it is, never as escape sequences', () => {
    const text = encodeJournalBundle(journal)

    expect(text).toContain('格林芬堡的糧倉應在入冬前重建嗎？')
    expect(text).not.toMatch(/\\u[0-9a-fA-F]{4}/)
  })

  it('keeps each Deletion Record’s own offset', () => {
    const text = encodeJournalBundle(journal)

    expect(text).toContain('"deletedAt": "2026-11-20T08:30:00.000-05:00"')
    expect(text).toContain('"deletedAt": "2026-11-27T09:15:00.000+08:00"')
  })
})

describe('decodeJournalBundle', () => {
  it('reads the fixture back as its Journal, leaving nothing out', async () => {
    const result = decodeJournalBundle(await readFixture('journal-bundle.json'))

    expectDecodedJournal(result, journal)
    expect(result).toMatchObject({ outcome: 'decoded', leftOut: [] })
  })

  it('reads the empty fixture as an empty Journal', async () => {
    const result = decodeJournalBundle(
      await readFixture('journal-bundle-empty.json'),
    )

    expect(result).toEqual({
      outcome: 'decoded',
      journal: emptyJournal,
      leftOut: [],
    })
  })

  it('gives back the Journal it encoded', () => {
    const result = decodeJournalBundle(encodeJournalBundle(journal))

    expectDecodedJournal(result, journal)
    expect(result).toMatchObject({ leftOut: [] })
  })

  it('accepts any JSON layout and any record order', () => {
    const text = JSON.stringify(
      bundleOf({
        consultations: [castRecord, recordedMomentRecord, recordedDayRecord],
        deletionRecords: [laterDeletion, earlierIdDeletion].map(
          encodeDeletionRecord,
        ),
      }),
    )

    expectDecodedJournal(decodeJournalBundle(text), journal)
  })

  it('accepts the keys in any order', () => {
    const text = JSON.stringify({
      deletionRecords: [encodeDeletionRecord(laterDeletion)],
      consultations: [recordedDayRecord],
      version: 1,
      format: 'hexagram-journal',
    })

    expectDecodedJournal(decodeJournalBundle(text), {
      consultations: [recordedDay],
      deletionRecords: [laterDeletion],
    })
  })

  it('ignores fields it does not name, in the bundle and in its records', () => {
    const text = textOf({
      ...bundleOf({
        consultations: [{ ...recordedDayRecord, body: 'not read' }],
        deletionRecords: [
          { ...encodeDeletionRecord(laterDeletion), note: 'not read' },
        ],
      }),
      exportedBy: 'a later app',
    })

    expectDecodedJournal(decodeJournalBundle(text), {
      consultations: [recordedDay],
      deletionRecords: [laterDeletion],
    })
  })

  describe('refuses the whole bundle', () => {
    it.each([
      ['empty text', ''],
      ['plain words', 'a Journal'],
      ['an unclosed object', '{"format": "hexagram-journal"'],
      ['a trailing comma', '{"format": "hexagram-journal",}'],
    ])('as not JSON: %s', (_case, text) => {
      expect(decodeJournalBundle(text)).toEqual({
        outcome: 'unreadable',
        reason: { kind: 'not-json' },
      })
    })

    const valid = bundleOf({ consultations: [], deletionRecords: [] })

    it.each([
      ['an array', []],
      ['null', null],
      ['a number', 1],
      ['a string', 'hexagram-journal'],
      ['no format', { ...valid, format: undefined }],
      ['another format', { ...valid, format: 'hexagram-history' }],
      ['no version', { ...valid, version: undefined }],
      ['version 2', { ...valid, version: 2 }],
      ['version 0', { ...valid, version: 0 }],
      ['the version as a string', { ...valid, version: '1' }],
      ['no consultations', { ...valid, consultations: undefined }],
      ['consultations as an object', { ...valid, consultations: {} }],
      ['consultations as null', { ...valid, consultations: null }],
      ['no deletionRecords', { ...valid, deletionRecords: undefined }],
      ['deletionRecords as an object', { ...valid, deletionRecords: {} }],
      ['deletionRecords as a string', { ...valid, deletionRecords: '' }],
    ])('as not a bundle: %s', (_case, bundle) => {
      expect(decodeJournalBundle(textOf(bundle))).toEqual({
        outcome: 'unreadable',
        reason: { kind: 'not-a-bundle' },
      })
    })

    it.each([
      ['not an object', 'deleted'],
      ['null', null],
      [
        'a malformed Id',
        {
          consultationId: 'not-a-ulid',
          deletedAt: '2026-11-20T08:30:00.000-05:00',
        },
      ],
      ['no Id', { deletedAt: '2026-11-20T08:30:00.000-05:00' }],
      [
        'a date alone',
        {
          consultationId: '01JB7C9D1E3F5G7H9J1K3M5N7P',
          deletedAt: '2026-11-20',
        },
      ],
      ['no deletedAt', { consultationId: '01JB7C9D1E3F5G7H9J1K3M5N7P' }],
    ])(
      'when a Deletion Record cannot be read, naming its index: %s',
      (_case, badRecord) => {
        const text = textOf(
          bundleOf({
            consultations: [castRecord],
            deletionRecords: [encodeDeletionRecord(laterDeletion), badRecord],
          }),
        )

        expect(decodeJournalBundle(text)).toEqual({
          outcome: 'unreadable',
          reason: { kind: 'invalid-deletion-record', index: 1 },
        })
      },
    )
  })

  describe('leaves out a Consultation that does not load, and reads the rest', () => {
    it.each([
      [
        'not a version-2 record',
        { ...recordedMomentRecord, schemaVersion: 1 },
        { kind: 'not-version-2' },
      ],
      [
        'an invalid field',
        { ...recordedMomentRecord, transformation: '787875' },
        { kind: 'invalid-field', field: 'transformation' },
      ],
      [
        'a blank Query',
        { ...recordedMomentRecord, query: '   ' },
        { kind: 'invalid-field', field: 'query' },
      ],
      [
        'a Casting that does not replay',
        {
          ...castRecord,
          id: '01JE0A1B2C3D4E5F6G7H8J9K0M',
          transformation: '777777',
        },
        { kind: 'casting-does-not-replay' },
      ],
    ])('%s', (_case, badRecord, reason) => {
      const text = textOf(
        bundleOf({
          consultations: [castRecord, badRecord, recordedDayRecord],
          deletionRecords: [encodeDeletionRecord(laterDeletion)],
        }),
      )

      const result = decodeJournalBundle(text)

      expectDecodedJournal(result, {
        consultations: [cast, recordedDay],
        deletionRecords: [laterDeletion],
      })
      expect(result).toMatchObject({ leftOut: [{ index: 1, reason }] })
    })

    it('leaves out a later record holding an Id an earlier one held, naming the first', () => {
      const text = textOf(
        bundleOf({
          consultations: [
            recordedDayRecord,
            castRecord,
            { ...recordedMomentRecord, id: castRecord.id },
          ],
          deletionRecords: [],
        }),
      )

      const result = decodeJournalBundle(text)

      expectDecodedJournal(result, {
        consultations: [recordedDay, cast],
        deletionRecords: [],
      })
      expect(result).toMatchObject({
        leftOut: [
          {
            index: 2,
            reason: { kind: 'duplicate-id', firstLocation: 'consultations[1]' },
          },
        ],
      })
    })

    it('reports every record it leaves out', () => {
      const text = textOf(
        bundleOf({
          consultations: [
            { ...recordedDayRecord, schemaVersion: 3 },
            castRecord,
            'not a record',
            castRecord,
          ],
          deletionRecords: [],
        }),
      )

      const result = decodeJournalBundle(text)

      expectDecodedJournal(result, {
        consultations: [cast],
        deletionRecords: [],
      })
      if (result.outcome !== 'decoded') throw new Error('refused')
      expect(result.leftOut).toHaveLength(3)
      expect(result.leftOut).toEqual(
        expect.arrayContaining([
          { index: 0, reason: { kind: 'not-version-2' } },
          { index: 2, reason: { kind: 'not-version-2' } },
          {
            index: 3,
            reason: { kind: 'duplicate-id', firstLocation: 'consultations[1]' },
          },
        ]),
      )
    })
  })
})
