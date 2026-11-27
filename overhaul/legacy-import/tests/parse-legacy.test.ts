import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  isUtcOffset,
  type Moment,
} from '@hexagram/consultation-journal/divined-at'
import { isQuery, type Query } from '@hexagram/consultation-journal/query'
import type { CompleteCasting, PartialCasting } from '@hexagram/oracle/casting'
import { divide, emptyCasting } from '@hexagram/oracle/division'
import type { Transformation } from '@hexagram/oracle/transformation'
import { describe, expect, it } from 'vitest'

import { parseLegacyFile, type LegacyParseResult } from '#src/parse-legacy.js'

// The legacy `.txt` fixtures come from the fictional legacy corpus (Greyfen
// Hold, Steward Aelric, Westmill), copied or invented in its style; the
// version-1 files are written below by hand. Every Query and date is
// invented.

const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
)

function fixture(name: string): string {
  return readFileSync(path.join(fixtures, name), 'utf8')
}

/** The name a legacy file of this moment had: its Divined At, in its own offset. */
function legacyName(stamp: string): string {
  return `consultation-${stamp}.txt`
}

/** A legacy `.txt` file as its adapter would pass it. */
function legacyFile(fixtureName: string, stamp = '2026-05-19T11-08-42+0800') {
  return { name: legacyName(stamp), text: fixture(fixtureName) }
}

function query(text: string): Query {
  if (!isQuery(text))
    throw new Error(`the Query ${JSON.stringify(text)} is blank`)
  return text
}

/** A Moment from ISO 8601 text with a `±HH:MM` offset. */
function moment(text: string): Moment {
  const offset = text.slice(-6)
  if (!isUtcOffset(offset)) throw new Error(`the offset ${offset} is malformed`)
  return { precision: 'moment', epochMilliseconds: Date.parse(text), offset }
}

/** Divides by each Pick in turn, bottom-up, from the Empty Casting to a complete one. */
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

function transformation(...values: Transformation): Transformation {
  return values
}

// The Picks of `legacy-real-heap-casting.txt`, Line 1 first: its Left Heap
// column, which replays to 8, 8, 7, 8, 6, 7.
const heapPicks = [
  25, 20, 9, 25, 16, 14, 20, 20, 17, 23, 19, 17, 16, 19, 19, 22, 24, 19,
]
// The Picks of `legacy-real-split-casting.txt`, Line 1 first: its Split
// column, which replays to 7, 8, 8, 7, 8, 8.
const splitPicks = [
  5, 35, 4, 40, 30, 9, 45, 42, 27, 17, 20, 20, 38, 4, 34, 37, 3, 17,
]

const heapCasting = castByPicks(heapPicks)
const splitCasting = castByPicks(splitPicks)

/** The Moment `2026-05-19T11-08-42+0800` in a legacy file's name holds. */
const legacyMoment = moment('2026-05-19T11:08:42+08:00')

/**
 * One Line's three Rounds in a version-1 file, as `{ pick, recordedMax }`
 * pairs: `recordedMax` is the stalks of the Round less the Hung Stalk.
 */
type Version1Line = readonly (readonly [pick: number, recordedMax: number])[]

/** The heap fixture's Casting as a version-1 file wrote it, Line 1 first. */
const heapVersion1Casting: readonly Version1Line[] = [
  [
    [25, 48],
    [20, 43],
    [9, 35],
  ],
  [
    [25, 48],
    [16, 43],
    [14, 35],
  ],
  [
    [20, 48],
    [20, 39],
    [17, 31],
  ],
  [
    [23, 48],
    [19, 43],
    [17, 35],
  ],
  [
    [16, 48],
    [19, 39],
    [19, 31],
  ],
  [
    [22, 48],
    [24, 43],
    [19, 35],
  ],
]

/**
 * A version-1 file's text, its keys in its writer's order and its `L6..L1`
 * mappings top first. A field given as `undefined` is left out; `extra` is
 * YAML put after the record's keys.
 */
function version1Text(fields: {
  readonly schemaVersion?: string
  readonly timestamp?: string
  readonly query?: string
  readonly hexagram?: readonly number[]
  readonly casting?: readonly Version1Line[]
  readonly extra?: string
}): string {
  const lines = [`schemaVersion: ${fields.schemaVersion ?? '1'}`]
  if (fields.timestamp !== undefined)
    lines.push(`timestamp: '${fields.timestamp}'`)
  if (fields.query !== undefined) lines.push(`query: ${fields.query}`)
  if (fields.hexagram !== undefined) {
    lines.push('hexagram:')
    for (const position of [6, 5, 4, 3, 2, 1]) {
      lines.push(
        `  L${String(position)}: ${String(fields.hexagram[position - 1])}`,
      )
    }
  }
  if (fields.casting !== undefined) {
    lines.push('casting:')
    for (const position of [6, 5, 4, 3, 2, 1]) {
      lines.push(`  L${String(position)}:`)
      for (const [pick, recordedMax] of fields.casting[position - 1] ?? []) {
        lines.push(
          `    - pick: ${String(pick)}`,
          `      recordedMax: ${String(recordedMax)}`,
        )
      }
    }
  }
  if (fields.extra !== undefined) lines.push(fields.extra)
  return `---\n${lines.join('\n')}\n---\n\nAn old rendered body, never read.\n`
}

const castVersion1 = {
  timestamp: '2026-05-19T14:23:11+0800',
  query:
    'Will I find a worthy post once my studies at Greyfen Hold are complete?',
  hexagram: [8, 8, 7, 8, 6, 7],
  casting: heapVersion1Casting,
} as const

/** The Moment of `castVersion1`'s `timestamp`. */
const version1Moment = moment('2026-05-19T14:23:11+08:00')

function version1File(
  text: string,
  name = 'consultation-2026-05-19T14-23-11+0800.md',
) {
  return { name, text }
}

function unreadable(
  reason: Extract<LegacyParseResult, { outcome: 'unreadable' }>['reason'],
): LegacyParseResult {
  return { outcome: 'unreadable', reason }
}

describe('parseLegacyFile: a legacy .txt file with a Casting table', () => {
  it('reads a HEAP table that replays as a Cast Consultation’s record', () => {
    expect(parseLegacyFile(legacyFile('legacy-real-heap-casting.txt'))).toEqual(
      {
        outcome: 'parsed',
        record: {
          query: query(
            'Will I find a worthy post once my studies at Greyfen Hold are complete?',
          ),
          divinedAt: legacyMoment,
          casting: heapCasting,
        },
        casting: 'replays',
      },
    )
  })

  it('reads a SPLIT table that replays as a Cast Consultation’s record', () => {
    expect(
      parseLegacyFile(legacyFile('legacy-real-split-casting.txt')),
    ).toEqual({
      outcome: 'parsed',
      record: {
        query: query(
          "Is the Greyfen Primer truly beneficial for young Wren's lessons?",
        ),
        divinedAt: legacyMoment,
        casting: splitCasting,
      },
      casting: 'replays',
    })
  })

  it('keeps the replayed Casting’s Transformation, the file’s own', () => {
    const result = parseLegacyFile(legacyFile('legacy-real-heap-casting.txt'))

    expect(
      result.outcome === 'parsed' && result.record.casting?.transformation,
    ).toEqual(transformation(8, 8, 7, 8, 6, 7))
  })

  it('reads a table that replays to another Transformation as a Recorded Consultation’s, from the file’s Transformation', () => {
    expect(
      parseLegacyFile(legacyFile('legacy-heap-other-transformation.txt')),
    ).toEqual({
      outcome: 'parsed',
      record: {
        query: query(
          'Will the ferry at Westmill run through the spring floods?',
        ),
        divinedAt: legacyMoment,
        casting: undefined,
        transformation: transformation(8, 8, 7, 8, 8, 7),
      },
      casting: 'does-not-replay',
    })
  })

  it('reads a table with a Pick no Round admits as a Recorded Consultation’s', () => {
    expect(parseLegacyFile(legacyFile('legacy-heap-multi-moving.txt'))).toEqual(
      {
        outcome: 'parsed',
        record: {
          query: query('How should I navigate the year of many changes ahead?'),
          divinedAt: legacyMoment,
          casting: undefined,
          transformation: transformation(6, 9, 9, 9, 9, 8),
        },
        casting: 'does-not-replay',
      },
    )
  })

  it('reads a table whose stored stalk count disagrees with the replay as a Recorded Consultation’s', () => {
    expect(
      parseLegacyFile(legacyFile('legacy-split-stalks-disagree.txt')),
    ).toEqual({
      outcome: 'parsed',
      record: {
        query: query(
          'Should the Greyfen Primer be copied for the younger pupils?',
        ),
        divinedAt: legacyMoment,
        casting: undefined,
        transformation: transformation(7, 8, 8, 7, 8, 8),
      },
      casting: 'does-not-replay',
    })
  })
})

describe('parseLegacyFile: a legacy .txt file with no Casting table', () => {
  it('reads the oldest layout as a Recorded Consultation’s record', () => {
    expect(
      parseLegacyFile(legacyFile('legacy-real-oldest-no-casting.txt')),
    ).toEqual({
      outcome: 'parsed',
      record: {
        query: query(
          'I will accept the post at Westmill Atelier under Steward Aelric. How will this unfold?',
        ),
        divinedAt: legacyMoment,
        casting: undefined,
        transformation: transformation(8, 7, 8, 8, 9, 7),
      },
      casting: 'none',
    })
  })

  it('reads a file with no table as a Recorded Consultation’s record', () => {
    expect(parseLegacyFile(legacyFile('legacy-shape-b.txt'))).toEqual({
      outcome: 'parsed',
      record: {
        query: query('What will it be like?'),
        divinedAt: legacyMoment,
        casting: undefined,
        transformation: transformation(8, 7, 8, 9, 9, 9),
      },
      casting: 'none',
    })
  })

  it('keeps a Query in Traditional Chinese exactly as the file holds it', () => {
    const result = parseLegacyFile(legacyFile('legacy-chinese-query.txt'))

    expect(result).toEqual({
      outcome: 'parsed',
      record: {
        query: query('艾爾里克管家出使西磨坊會成功嗎？'),
        divinedAt: legacyMoment,
        casting: undefined,
        transformation: transformation(8, 8, 8, 8, 8, 8),
      },
      casting: 'none',
    })
  })
})

describe('parseLegacyFile: a legacy file’s Divined At is the Moment its name holds', () => {
  it.each([
    {
      stamp: '2026-03-16T13-28-33+0800',
      divinedAt: moment('2026-03-16T13:28:33+08:00'),
    },
    {
      stamp: '2025-12-31T23-59-59-0500',
      divinedAt: moment('2025-12-31T23:59:59-05:00'),
    },
    {
      stamp: '2026-01-01T00-00-00+0000',
      divinedAt: moment('2026-01-01T00:00:00+00:00'),
    },
    {
      stamp: '2026-07-04T06-15-00+0530',
      divinedAt: moment('2026-07-04T06:15:00+05:30'),
    },
  ])('reads $stamp', ({ stamp, divinedAt }) => {
    const result = parseLegacyFile(legacyFile('legacy-shape-b.txt', stamp))

    expect(result.outcome === 'parsed' && result.record.divinedAt).toEqual(
      divinedAt,
    )
  })

  it.each([
    'legacy-shape-b.txt',
    'notes.txt',
    'consultation-.txt',
    'consultation-2026-05-19T11-08-42.txt',
  ])(
    'skips %s, whose name holds no Divined At, as invalid-field divinedAt',
    (name) => {
      expect(
        parseLegacyFile({ name, text: fixture('legacy-shape-b.txt') }),
      ).toEqual(unreadable({ kind: 'invalid-field', field: 'divinedAt' }))
    },
  )

  it.each([
    '2026-02-30T10-00-00+0800',
    '2026-13-01T10-00-00+0800',
    '2026-05-19T24-00-00+0800',
    '2026-05-19T11-60-00+0800',
    '2026-05-19T11-08-60+0800',
  ])(
    'skips a name holding the impossible %s, never normalised, as invalid-field divinedAt',
    (stamp) => {
      expect(parseLegacyFile(legacyFile('legacy-shape-b.txt', stamp))).toEqual(
        unreadable({ kind: 'invalid-field', field: 'divinedAt' }),
      )
    },
  )
})

describe('parseLegacyFile: a legacy file with no valid Query or Transformation', () => {
  it.each([
    'legacy-placeholder-query.txt',
    'legacy-blank-query.txt',
    'legacy-no-query-section.txt',
  ])('skips %s as invalid-field query', (name) => {
    expect(parseLegacyFile(legacyFile(name))).toEqual(
      unreadable({ kind: 'invalid-field', field: 'query' }),
    )
  })

  it.each(['legacy-bad-line-values.txt', 'legacy-no-line-values.txt'])(
    'skips %s as invalid-field transformation',
    (name) => {
      expect(parseLegacyFile(legacyFile(name))).toEqual(
        unreadable({ kind: 'invalid-field', field: 'transformation' }),
      )
    },
  )

  it.each(['', 'Not a reading at all.\n', '\u0000\u0001\u0002'])(
    'never throws, and calls %j unreadable',
    (text) => {
      expect(
        parseLegacyFile({ name: legacyName('2026-05-19T11-08-42+0800'), text })
          .outcome,
      ).toBe('unreadable')
    },
  )
})

describe('parseLegacyFile: a version-1 .md file', () => {
  it('reads a Casting that replays as a Cast Consultation’s record, its timestamp the Divined At', () => {
    expect(parseLegacyFile(version1File(version1Text(castVersion1)))).toEqual({
      outcome: 'parsed',
      record: {
        query: query(castVersion1.query),
        divinedAt: version1Moment,
        casting: heapCasting,
      },
      casting: 'replays',
    })
  })

  it('reads a file with no casting key, its writer having written castingAbsence, as a Recorded Consultation’s', () => {
    const text = version1Text({
      timestamp: '2026-06-01T09:30:00+0800',
      query: 'Will the bridge at Greyfen Hold stand through the thaw?',
      hexagram: [8, 7, 8, 9, 9, 9],
      extra: 'castingAbsence: legacy-no-table',
    })

    expect(parseLegacyFile(version1File(text))).toEqual({
      outcome: 'parsed',
      record: {
        query: query('Will the bridge at Greyfen Hold stand through the thaw?'),
        divinedAt: moment('2026-06-01T09:30:00+08:00'),
        casting: undefined,
        transformation: transformation(8, 7, 8, 9, 9, 9),
      },
      casting: 'none',
    })
  })

  it.each(['legacy-unreplayable', 'playground'])(
    'reads a file with no casting key and castingAbsence %s as holding no Casting',
    (absence) => {
      const text = version1Text({
        ...castVersion1,
        casting: undefined,
        extra: `castingAbsence: ${absence}`,
      })
      const result = parseLegacyFile(version1File(text))

      expect(result.outcome === 'parsed' && result.casting).toBe('none')
    },
  )

  it('reads a Casting whose stored stalk count disagrees with the replay as a Recorded Consultation’s', () => {
    // Line 6's second Round stored 39 for the stalks less the Hung Stalk; it had 43.
    const casting: readonly Version1Line[] = [
      ...heapVersion1Casting.slice(0, 5),
      [
        [22, 48],
        [24, 39],
        [19, 35],
      ],
    ]
    const text = version1Text({ ...castVersion1, casting })

    expect(parseLegacyFile(version1File(text))).toEqual({
      outcome: 'parsed',
      record: {
        query: query(castVersion1.query),
        divinedAt: version1Moment,
        casting: undefined,
        transformation: transformation(8, 8, 7, 8, 6, 7),
      },
      casting: 'does-not-replay',
    })
  })

  it('reads a Casting that replays to another Transformation as a Recorded Consultation’s, from its hexagram', () => {
    const text = version1Text({ ...castVersion1, hexagram: [8, 8, 7, 8, 8, 7] })

    expect(parseLegacyFile(version1File(text))).toEqual({
      outcome: 'parsed',
      record: {
        query: query(castVersion1.query),
        divinedAt: version1Moment,
        casting: undefined,
        transformation: transformation(8, 8, 7, 8, 8, 7),
      },
      casting: 'does-not-replay',
    })
  })

  it('reads a casting that cannot be read as a Recorded Consultation’s', () => {
    const casting = heapVersion1Casting.map((line, index) =>
      index === 2 ? [] : line,
    )
    const text = version1Text({ ...castVersion1, casting })
    const result = parseLegacyFile(version1File(text))

    expect(result.outcome === 'parsed' && result.casting).toBe(
      'does-not-replay',
    )
    expect(result.outcome === 'parsed' && result.record.casting).toBe(undefined)
  })

  it('reads its hexagram mapping top first, L1 being Line Position 1', () => {
    const text = version1Text({
      ...castVersion1,
      casting: undefined,
      hexagram: [9, 8, 8, 7, 7, 6],
      extra: 'castingAbsence: legacy-no-table',
    })
    const result = parseLegacyFile(version1File(text))

    expect(
      result.outcome === 'parsed' &&
        result.record.casting === undefined &&
        result.record.transformation,
    ).toEqual(transformation(9, 8, 8, 7, 7, 6))
  })

  it('keeps a Query of several lines exactly as written', () => {
    const text = version1Text({
      ...castVersion1,
      query:
        '|-\n  Will the mill at Westmill grind again?\n  And if so, by which season?',
    })
    const result = parseLegacyFile(version1File(text))

    expect(result.outcome === 'parsed' && result.record.query).toBe(
      'Will the mill at Westmill grind again?\nAnd if so, by which season?',
    )
  })

  it('takes its Divined At from its timestamp, whatever its name', () => {
    const result = parseLegacyFile(
      version1File(version1Text(castVersion1), 'notes.md'),
    )

    expect(result.outcome === 'parsed' && result.record.divinedAt).toEqual(
      version1Moment,
    )
  })

  it.each([
    { label: 'an empty Query', query: "''" },
    { label: 'a blank Query', query: "'   '" },
    { label: 'no query key', query: undefined },
  ])('skips $label as invalid-field query', ({ query: given }) => {
    const text = version1Text({ ...castVersion1, query: given })

    expect(parseLegacyFile(version1File(text))).toEqual(
      unreadable({ kind: 'invalid-field', field: 'query' }),
    )
  })

  it.each([
    { label: 'no timestamp key', timestamp: undefined },
    { label: 'a timestamp that is no date', timestamp: 'yesterday evening' },
  ])('skips $label as invalid-field divinedAt', ({ timestamp }) => {
    const text = version1Text({ ...castVersion1, timestamp })

    expect(parseLegacyFile(version1File(text))).toEqual(
      unreadable({ kind: 'invalid-field', field: 'divinedAt' }),
    )
  })

  it.each([
    { label: 'a Line Value of 5', hexagram: [8, 8, 7, 5, 6, 7] },
    { label: 'no hexagram key', hexagram: undefined },
  ])('skips $label as invalid-field transformation', ({ hexagram }) => {
    const text = version1Text({ ...castVersion1, casting: undefined, hexagram })

    expect(parseLegacyFile(version1File(text))).toEqual(
      unreadable({ kind: 'invalid-field', field: 'transformation' }),
    )
  })
})

describe('parseLegacyFile: a .md file that is not version 1', () => {
  it('calls a version-2 file not-legacy, so the Journal’s own files are never imported', () => {
    const text = [
      '---',
      'schemaVersion: 2',
      'id: 01JC0000000000000000000001',
      "divinedAt: '2026-09-01T21:14:05.250+08:00'",
      'query: Will the mill at Westmill grind again?',
      "transformation: '787878'",
      '---',
      '',
      'A stub body.',
      '',
    ].join('\n')

    expect(
      parseLegacyFile({
        name: '2026-09-01--01JC0000000000000000000001.md',
        text,
      }),
    ).toEqual({ outcome: 'not-legacy' })
  })

  it.each([
    {
      label: 'schemaVersion 3',
      text: version1Text({ ...castVersion1, schemaVersion: '3' }),
    },
    {
      label: 'schemaVersion 0',
      text: version1Text({ ...castVersion1, schemaVersion: '0' }),
    },
    {
      label: 'no schemaVersion',
      text: "---\ntimestamp: '2026-05-19T14:23:11+0800'\nquery: Will it rain?\n---\n\nA body.\n",
    },
    { label: 'a list', text: '---\n- 1\n- 2\n---\n\nA body.\n' },
    { label: 'a scalar', text: '---\njust words\n---\n\nA body.\n' },
  ])('skips a record that is $label as not-version-1', ({ text }) => {
    expect(parseLegacyFile(version1File(text))).toEqual(
      unreadable({ kind: 'not-version-1' }),
    )
  })

  it('skips a file with no frontmatter as no-frontmatter', () => {
    expect(
      parseLegacyFile(
        version1File('# Notes on the Greyfen harvest\n\nNothing to import.\n'),
      ),
    ).toEqual(unreadable({ kind: 'no-frontmatter' }))
  })

  it('skips frontmatter that is not YAML as not-yaml', () => {
    expect(
      parseLegacyFile(
        version1File(
          '---\nschemaVersion: 1\nquery: [unclosed\n---\n\nA body.\n',
        ),
      ),
    ).toEqual(unreadable({ kind: 'not-yaml' }))
  })
})

describe('parseLegacyFile: a name that is neither .txt nor .md', () => {
  it.each([
    'consultation-2026-05-19T11-08-42+0800.TXT',
    'consultation-2026-05-19T14-23-11+0800.MD',
    'journal.json',
    'consultation-2026-05-19T11-08-42+0800.txt.bak',
    'README',
  ])('calls %s not-legacy, whatever it holds', (name) => {
    expect(
      parseLegacyFile({ name, text: fixture('legacy-real-heap-casting.txt') }),
    ).toEqual({ outcome: 'not-legacy' })
  })
})

describe('parseLegacyFile: corners of the legacy and version-1 layouts', () => {
  const heapText = fixture('legacy-real-heap-casting.txt')
  const heapRecord = {
    query: query(
      'Will I find a worthy post once my studies at Greyfen Hold are complete?',
    ),
    divinedAt: legacyMoment,
    casting: heapCasting,
  }

  /** The heap fixture with one exact passage changed, which must be there. */
  function heapWith(from: string, to: string): string {
    if (!heapText.includes(from)) throw new Error(`no ${from} in the fixture`)
    return heapText.replace(from, to)
  }

  function parseHeap(text: string): LegacyParseResult {
    return parseLegacyFile({
      name: legacyName('2026-05-19T11-08-42+0800'),
      text,
    })
  }

  it('reads a copy coloured with ANSI SGR sequences as the plain file', () => {
    const esc = '\u001B'
    const coloured = heapText
      .split('\n')
      .map((line) => {
        if (/^[A-Z ]+:$/u.test(line)) return `${esc}[1;90m${line}${esc}[0m`
        if (line.startsWith('│')) return `${esc}[2m${line}${esc}[0m`
        if (line.startsWith('  Will I find'))
          return `  ${esc}[1;97m${line.slice(2)}${esc}[0m`
        if (line === '(First is line at bottom)') return `${esc}[0m${line}`
        return line
      })
      .join('\n')

    expect(parseHeap(coloured)).toEqual({
      outcome: 'parsed',
      record: heapRecord,
      casting: 'replays',
    })
  })

  it('removes only the exact two-space indent from each line of a Query of several lines', () => {
    const text = [
      'QUERY:',
      '',
      '  Will the granary at Greyfen Hold be full?',
      '    Asked again after the storm.',
      '  And by which moon?',
      '',
      'HEXAGRAM:',
      '',
      '(First is line at bottom)',
      '',
      '  8, 7, 8, 9, 9, 9',
      '',
    ].join('\n')
    const result = parseHeap(text)

    expect(result.outcome === 'parsed' && result.record.query).toBe(
      'Will the granary at Greyfen Hold be full?\n  Asked again after the storm.\nAnd by which moon?',
    )
  })

  it('reads a HEAP table whose Right Heap disagrees with Stalks less Left Heap as not replaying', () => {
    const text = heapWith(
      '│    6 │     48 │        22 │         26 │',
      '│    6 │     48 │        22 │         25 │',
    )

    expect(parseHeap(text)).toEqual({
      outcome: 'parsed',
      record: {
        query: heapRecord.query,
        divinedAt: legacyMoment,
        casting: undefined,
        transformation: transformation(8, 8, 7, 8, 6, 7),
      },
      casting: 'does-not-replay',
    })
  })

  it('reads a table of fewer than six rows as not replaying', () => {
    const row1 = heapText
      .split('\n')
      .find((line) => line.startsWith('│    1 │'))
    if (row1 === undefined) throw new Error('no Line 1 row in the fixture')
    const text = heapWith(`${row1}\n`, '')

    expect(parseHeap(text)).toEqual({
      outcome: 'parsed',
      record: {
        query: heapRecord.query,
        divinedAt: legacyMoment,
        casting: undefined,
        transformation: transformation(8, 8, 7, 8, 6, 7),
      },
      casting: 'does-not-replay',
    })
  })

  it.each([
    {
      timestamp: '2026-05-19T06:23:11Z',
      divinedAt: moment('2026-05-19T06:23:11+00:00'),
    },
    {
      timestamp: '2026-05-19T14:23:11+08:00',
      divinedAt: moment('2026-05-19T14:23:11+08:00'),
    },
    {
      timestamp: '2026-05-19T14:23:11.5+0800',
      divinedAt: moment('2026-05-19T14:23:11.500+08:00'),
    },
    {
      timestamp: '2026-05-19T14:23:11.1234567+0800',
      divinedAt: moment('2026-05-19T14:23:11.123+08:00'),
    },
  ])('reads the version-1 timestamp $timestamp', ({ timestamp, divinedAt }) => {
    const result = parseLegacyFile(
      version1File(version1Text({ ...castVersion1, timestamp })),
    )

    expect(result.outcome === 'parsed' && result.record.divinedAt).toEqual(
      divinedAt,
    )
  })

  it('skips a version-1 timestamp of a date only as invalid-field divinedAt', () => {
    const text = version1Text({ ...castVersion1, timestamp: '2026-05-19' })

    expect(parseLegacyFile(version1File(text))).toEqual(
      unreadable({ kind: 'invalid-field', field: 'divinedAt' }),
    )
  })

  it('skips a version-1 Query of the placeholder as invalid-field query', () => {
    const text = version1Text({
      ...castVersion1,
      query: "'(Query not provided)'",
    })

    expect(parseLegacyFile(version1File(text))).toEqual(
      unreadable({ kind: 'invalid-field', field: 'query' }),
    )
  })

  it('reports the Query before the Transformation in a .txt file with both bad', () => {
    const text = [
      'QUERY:',
      '',
      '  (Query not provided)',
      '',
      'HEXAGRAM:',
      '',
      '(First is line at bottom)',
      '',
      '  8, 7, 8, 5, 9, 9',
      '',
    ].join('\n')

    expect(parseHeap(text)).toEqual(
      unreadable({ kind: 'invalid-field', field: 'query' }),
    )
  })

  it('reports the Divined At before the Query in a version-1 file with both bad', () => {
    const text = version1Text({
      ...castVersion1,
      timestamp: 'yesterday evening',
      query: "''",
    })

    expect(parseLegacyFile(version1File(text))).toEqual(
      unreadable({ kind: 'invalid-field', field: 'divinedAt' }),
    )
  })

  it('skips an empty frontmatter as not-version-1', () => {
    expect(parseLegacyFile(version1File('---\n---\n\nA body.\n'))).toEqual(
      unreadable({ kind: 'not-version-1' }),
    )
  })
})

describe('parseLegacyFile: a file with Windows line endings', () => {
  /** A text with each `\n` written as `\r\n`, as a Windows editor saves it. */
  function crlf(text: string): string {
    if (text.includes('\r'))
      throw new Error(String.raw`the text already holds a \r`)
    return text.replaceAll('\n', '\r\n')
  }

  it.each([
    'legacy-real-heap-casting.txt',
    'legacy-real-split-casting.txt',
    'legacy-real-oldest-no-casting.txt',
    'legacy-shape-b.txt',
    'legacy-chinese-query.txt',
    'legacy-heap-other-transformation.txt',
    'legacy-heap-multi-moving.txt',
    'legacy-split-stalks-disagree.txt',
  ])('reads a CRLF copy of %s as its LF original', (fixtureName) => {
    const lf = legacyFile(fixtureName)
    const lfResult = parseLegacyFile(lf)
    expect(lfResult.outcome).toBe('parsed')

    expect(parseLegacyFile({ ...lf, text: crlf(lf.text) })).toEqual(lfResult)
  })

  it('calls a CRLF copy of a version-2 file not-legacy, as its LF original', () => {
    const text = [
      '---',
      'schemaVersion: 2',
      'id: 01JC0000000000000000000001',
      "divinedAt: '2026-09-01T21:14:05.250+08:00'",
      'query: Will the mill at Westmill grind again?',
      "transformation: '787878'",
      '---',
      '',
      'A stub body.',
      '',
    ].join('\n')

    expect(
      parseLegacyFile({
        name: '2026-09-01--01JC0000000000000000000001.md',
        text: crlf(text),
      }),
    ).toEqual({ outcome: 'not-legacy' })
  })

  it('reads a CRLF copy of a version-1 file as its LF original', () => {
    const lf = version1Text(castVersion1)
    const lfResult = parseLegacyFile(version1File(lf))
    expect(lfResult.outcome).toBe('parsed')

    expect(parseLegacyFile(version1File(crlf(lf)))).toEqual(lfResult)
  })

  it(
    String.raw`keeps a CRLF .txt Query of several lines as LF text, its line breaks \n`,
    () => {
      const text = [
        'QUERY:',
        '',
        '  Will the granary at Greyfen Hold be full?',
        '    Asked again after the storm.',
        '  And by which moon?',
        '',
        'HEXAGRAM:',
        '',
        '(First is line at bottom)',
        '',
        '  8, 7, 8, 9, 9, 9',
        '',
      ].join('\r\n')
      const result = parseLegacyFile({
        name: legacyName('2026-05-19T11-08-42+0800'),
        text,
      })

      expect(result.outcome === 'parsed' && result.record.query).toBe(
        'Will the granary at Greyfen Hold be full?\n  Asked again after the storm.\nAnd by which moon?',
      )
    },
  )

  it(
    String.raw`keeps a lone \r, one not followed by \n, inside a CRLF .txt Query as it is`,
    () => {
      const heapQuery =
        'Will I find a worthy post once my studies at Greyfen Hold are complete?'
      const lf = fixture('legacy-real-heap-casting.txt')
      if (!lf.includes(`  ${heapQuery}\n`))
        throw new Error('no heap Query in the fixture')
      const text = crlf(lf).replace(
        'Will I find a worthy post once',
        'Will I find a worthy post\ronce',
      )
      const result = parseLegacyFile({
        name: legacyName('2026-05-19T11-08-42+0800'),
        text,
      })

      expect(result.outcome === 'parsed' && result.record.query).toBe(
        'Will I find a worthy post\ronce my studies at Greyfen Hold are complete?',
      )
    },
  )
})
