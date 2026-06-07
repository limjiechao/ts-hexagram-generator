import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { makeLineGenerator, stalksBeforeParting } from '@hexagram/core'
import type { CastingRecord, Hexagram } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import {
  CURRENT_SCHEMA_VERSION,
  serializeFrontmatter,
} from '../src/frontmatter.js'
import { convertLegacyTxt } from '../src/legacy-converter.js'
import { markdownConsultationBody } from '../src/markdown.js'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')
const read = (name: string): string =>
  readFileSync(path.join(dir, name), 'utf8')

/** Replay a recovered casting back through the algorithm, bottom-first. */
function replayHexagram(casting: CastingRecord): Hexagram {
  const lines = casting.map((lineCasting) => {
    const [c1, c2, c3] = lineCasting
    const generator = makeLineGenerator({
      unpartedStalks: stalksBeforeParting,
      suspendedFromNextRound: [],
      partStalksAtIndex: c1.pick,
    })
    generator.next()
    generator.next(c2.pick)
    generator.next(c3.pick)
    return generator.next().value
  })
  return lines as Hexagram
}

describe('convertLegacyTxt — HEAP casting table', () => {
  it('recovers and replay-validates a real HEAP-format corpus file', () => {
    const result = convertLegacyTxt({
      text: read('legacy-real-heap-casting.txt'),
      filenameTimestamp: '2026-05-19T11-08-42+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.casting).not.toBeNull()
    expect(replayHexagram(result.envelope.casting!)).toEqual(
      result.envelope.hexagram,
    )
  })
})

describe('convertLegacyTxt — schemaVersion', () => {
  it('converted legacy files carry CURRENT_SCHEMA_VERSION, not a frozen literal', () => {
    const result = convertLegacyTxt({
      text: read('legacy-real-heap-casting.txt'),
      filenameTimestamp: '2026-05-19T11-08-42+0800',
    })
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.envelope.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })
})

describe('convertLegacyTxt — SPLIT casting table', () => {
  it('recovers and replay-validates a real SPLIT-format corpus file', () => {
    const result = convertLegacyTxt({
      text: read('legacy-real-split-casting.txt'),
      filenameTimestamp: '2026-05-15T12-07-00+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.hexagram).toEqual([7, 8, 8, 7, 8, 8])
    expect(result.envelope.casting).not.toBeNull()
    expect(replayHexagram(result.envelope.casting!)).toEqual(
      result.envelope.hexagram,
    )
    // SPLIT format: "Split" column is the left heap = pick; "Stalks" = recordedMax.
    // Line 1 / cast 1 of the real file: Stalks 48, Split 5.
    expect(result.envelope.casting?.[0][0]).toEqual({ pick: 5, recordedMax: 48 })
  })
})

describe('convertLegacyTxt — multiple moving lines', () => {
  it('does NOT recover a HEAP fixture with an empty-right-heap split', () => {
    // This fixture records two degenerate splits (Line 2 / 1st Cast and Line 3 /
    // 2nd Cast both have Left Heap == Stalks, Right Heap == 0 → pick === max).
    // That violates the never-zero-remainder invariant (ADR-0006): the right
    // heap keeps only the suspended stalk, so its remainder would be 0. The
    // now-strict `performCast` throws on replay, so the casting is not recovered
    // and resolves to null — we drop degenerate-legacy recovery rather than
    // resurrect invariant-violating casting. The hexagram still parses.
    const result = convertLegacyTxt({
      text: read('legacy-heap-multi-moving.txt'),
      filenameTimestamp: '2026-02-20T09-30-00+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.hexagram).toEqual([6, 9, 9, 9, 9, 8])
    expect(result.envelope.casting).toBeNull()
  })
})

describe('convertLegacyTxt — synthetic table that does not replay', () => {
  it('discards a hand-authored casting table whose splits never reconstruct', () => {
    // The pre-Markdown-era fixtures carry decorative casting tables that were
    // never produced by a real cast; replay-validation must discard them.
    const result = convertLegacyTxt({
      text: read('legacy-txt-fixture-multi-moving.txt'),
      filenameTimestamp: '2026-02-20T09-30-00+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.hexagram).toEqual([6, 9, 7, 8, 7, 8])
    expect(result.envelope.casting).toBeNull()
  })
})

describe('convertLegacyTxt — no casting table (oldest vintage)', () => {
  it('leaves casting null for a real oldest-vintage corpus file', () => {
    const result = convertLegacyTxt({
      text: read('legacy-real-oldest-no-casting.txt'),
      filenameTimestamp: '2025-06-10T04-09-02+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.casting).toBeNull()
  })

  it('leaves casting null for the Shape B fixture', () => {
    const result = convertLegacyTxt({
      text: read('legacy-shape-b.txt'),
      filenameTimestamp: '2026-03-16T13-28-33+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.query).toBe('What will it be like?')
    expect(result.envelope.hexagram).toEqual([8, 7, 8, 9, 9, 9])
    expect(result.envelope.casting).toBeNull()
  })
})

describe('convertLegacyTxt — empty / absent query', () => {
  it('maps an empty query block to an empty string', () => {
    const result = convertLegacyTxt({
      text: read('legacy-txt-fixture-empty-query.txt'),
      filenameTimestamp: '2025-08-12T07-05-56+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.query).toBe('')
    expect(result.envelope.hexagram).toEqual([7, 7, 7, 7, 7, 7])
  })
})

describe('convertLegacyTxt — replay-validation discards bad castings', () => {
  it('returns casting null when the table does not reconstruct the hexagram', () => {
    // Take a real HEAP file but keep the hexagram while swapping the casting
    // for a different real file's table — the splits no longer replay to it.
    const donor = read('legacy-heap-multi-moving.txt')
    const donorTable = /CASTING:[\s\S]*?┘/.exec(donor)![0]
    const text = read('legacy-real-heap-casting.txt').replace(
      /CASTING:[\s\S]*?┘/,
      donorTable,
    )
    const result = convertLegacyTxt({
      text,
      filenameTimestamp: '2026-05-19T11-08-42+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // The real file's hexagram is [8,8,7,8,6,7]; the donor casting contains
    // empty-right-heap splits that throw during replay (never-zero-remainder
    // invariant), so the casting is discarded either way.
    expect(result.envelope.hexagram).toEqual([8, 8, 7, 8, 6, 7])
    expect(result.envelope.casting).toBeNull()
  })
})

describe('convertLegacyTxt — filename → ISO timestamp', () => {
  it('rewrites the time-portion dashes to colons', () => {
    const result = convertLegacyTxt({
      text: read('legacy-shape-b.txt'),
      filenameTimestamp: '2026-03-16T13-28-33+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.timestamp).toBe('2026-03-16T13:28:33+0800')
  })
})

describe('converted → md round-trips through serialize', () => {
  it('produces a parseable .md with a CASTING section for a recovered casting', () => {
    const result = convertLegacyTxt({
      text: read('legacy-real-split-casting.txt'),
      filenameTimestamp: '2026-05-15T12-07-00+0800',
    })
    if (!result.ok) throw new Error(result.reason)
    const { envelope } = result
    expect(envelope.casting).not.toBeNull()
    const body = markdownConsultationBody(
      envelope.query,
      envelope.hexagram,
      envelope.casting,
    )
    const md = serializeFrontmatter(envelope, body)
    expect(md.startsWith('---\n')).toBe(true)
    expect(md).toContain('## CASTING')
  })

  it('omits the casting key and shows the null caption for a no-casting file', () => {
    const result = convertLegacyTxt({
      text: read('legacy-real-oldest-no-casting.txt'),
      filenameTimestamp: '2025-06-10T04-09-02+0800',
    })
    if (!result.ok) throw new Error(result.reason)
    const { envelope } = result
    expect(envelope.casting).toBeNull()
    const body = markdownConsultationBody(
      envelope.query,
      envelope.hexagram,
      envelope.casting,
    )
    const md = serializeFrontmatter(envelope, body)
    expect(md.startsWith('---\n')).toBe(true)
    expect(md).not.toMatch(/^casting:/m)
    expect(body).toContain('_Casting not recorded._')
  })
})

describe('convertLegacyTxt — castingAbsence reason', () => {
  it('marks a no-table (Shape B) file legacy-no-table', () => {
    const res = convertLegacyTxt({
      text: read('legacy-shape-b.txt'),
      filenameTimestamp: '2026-03-16T13-28-33+0800',
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.envelope.casting).toBeNull()
      expect(res.envelope.castingAbsence).toBe('legacy-no-table')
    }
  })

  it('marks a real oldest-vintage no-casting file legacy-no-table', () => {
    const res = convertLegacyTxt({
      text: read('legacy-real-oldest-no-casting.txt'),
      filenameTimestamp: '2025-06-10T04-09-02+0800',
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.envelope.casting).toBeNull()
      expect(res.envelope.castingAbsence).toBe('legacy-no-table')
    }
  })

  it('marks a present-but-unreplayable table legacy-unreplayable', () => {
    // legacy-heap-multi-moving.txt HAS a CASTING table whose splits include
    // empty-right-heap rows that throw on replay — the table is present but
    // does not reconstruct the hexagram.
    const res = convertLegacyTxt({
      text: read('legacy-heap-multi-moving.txt'),
      filenameTimestamp: '2026-02-20T09-30-00+0800',
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.envelope.casting).toBeNull()
      expect(res.envelope.castingAbsence).toBe('legacy-unreplayable')
    }
  })

  it('marks a synthetic non-reconstructing table legacy-unreplayable', () => {
    const res = convertLegacyTxt({
      text: read('legacy-txt-fixture-multi-moving.txt'),
      filenameTimestamp: '2026-02-20T09-30-00+0800',
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.envelope.casting).toBeNull()
      expect(res.envelope.castingAbsence).toBe('legacy-unreplayable')
    }
  })

  it('a recovered table has a null castingAbsence', () => {
    const res = convertLegacyTxt({
      text: read('legacy-real-heap-casting.txt'),
      filenameTimestamp: '2026-05-19T11-08-42+0800',
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.envelope.casting).not.toBeNull()
      expect(res.envelope.castingAbsence).toBeNull()
    }
  })
})

// Byte-locked envelope fixtures — the committed regression net. Each `.json`
// is the converted `ConsultationEnvelope` for a distinct legacy shape.
describe('convertLegacyTxt — byte-locked envelope fixtures', () => {
  const cases: { txt: string; json: string; filenameTimestamp: string }[] = [
    {
      txt: 'legacy-real-oldest-no-casting.txt',
      json: 'legacy-envelope-oldest-no-casting.json',
      filenameTimestamp: '2025-06-10T04-09-02+0800',
    },
    {
      txt: 'legacy-real-heap-casting.txt',
      json: 'legacy-envelope-heap-casting.json',
      filenameTimestamp: '2026-05-19T11-08-42+0800',
    },
    {
      txt: 'legacy-real-split-casting.txt',
      json: 'legacy-envelope-split-casting.json',
      filenameTimestamp: '2026-05-15T12-07-00+0800',
    },
    {
      txt: 'legacy-heap-multi-moving.txt',
      json: 'legacy-envelope-multi-moving.json',
      filenameTimestamp: '2026-02-20T09-30-00+0800',
    },
    {
      txt: 'legacy-txt-fixture-empty-query.txt',
      json: 'legacy-envelope-empty-query.json',
      filenameTimestamp: '2025-08-12T07-05-56+0800',
    },
  ]

  for (const { txt, json, filenameTimestamp } of cases) {
    it(`${json} matches the committed envelope fixture`, () => {
      const result = convertLegacyTxt({ text: read(txt), filenameTimestamp })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      // The committed `.json` is the locked regression fixture. Any change to
      // the converted envelope must be reflected by regenerating the fixture.
      expect(result.envelope).toEqual(JSON.parse(read(json)))
    })
  }
})

// Property sweep over the real, gitignored corpus. Skips cleanly in CI where
// `consultations/legacy/` does not exist; runs fully on a local checkout.
const corpusDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../consultations/legacy',
)
const corpusFiles = existsSync(corpusDir)
  ? readdirSync(corpusDir).filter((name) => name.endsWith('.txt'))
  : []

describe.skipIf(corpusFiles.length === 0)(
  'convertLegacyTxt — real legacy corpus sweep',
  () => {
    const FILENAME_RE = /^consultation-(.+)\.txt$/

    it('converts every corpus file without a parse failure', () => {
      for (const name of corpusFiles) {
        const filenameTimestamp = FILENAME_RE.exec(name)?.[1]
        expect(filenameTimestamp, name).toBeDefined()
        const result = convertLegacyTxt({
          text: readFileSync(path.join(corpusDir, name), 'utf8'),
          filenameTimestamp: filenameTimestamp!,
        })
        expect(result.ok, name).toBe(true)
      }
    })

    it('recovers exactly the casting-bearing files; the rest are null', () => {
      let nonNull = 0
      let nullCount = 0
      for (const name of corpusFiles) {
        const filenameTimestamp = FILENAME_RE.exec(name)![1]!
        const result = convertLegacyTxt({
          text: readFileSync(path.join(corpusDir, name), 'utf8'),
          filenameTimestamp,
        })
        if (!result.ok) throw new Error(`${name}: ${result.reason}`)
        if (result.envelope.casting === null) {
          nullCount += 1
        } else {
          nonNull += 1
          // Every recovered casting must replay to its own hexagram.
          expect(
            replayHexagram(result.envelope.casting),
            `${name} casting must replay to its hexagram`,
          ).toEqual(result.envelope.hexagram)
        }
      }
      expect(nonNull + nullCount).toBe(corpusFiles.length)
      expect(nonNull).toBe(7)
      expect(nullCount).toBe(corpusFiles.length - 7)
    })
  },
)
