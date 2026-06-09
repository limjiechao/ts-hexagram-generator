import {
  isHexagram,
  type CastingRecord,
  type Hexagram,
  type LineCasting,
} from '@hexagram/core/types'

import { castingReplaysTo } from './casting-replay.js'
import {
  CURRENT_SCHEMA_VERSION,
  type CastingPresence,
  type ConsultationEnvelope,
} from './frontmatter.js'

// Strip ANSI SGR sequences. The new-format fixtures contain them; older
// real-world files don't.
// oxlint-disable-next-line no-control-regex
const ANSI = /\[[0-9;]*m/g

export type LegacyConvertResult =
  | { ok: true; envelope: ConsultationEnvelope }
  | { ok: false; reason: 'no-hexagram-line' | 'invalid-hexagram' }

interface ConvertInput {
  text: string
  /** Filename portion like `2026-03-16T13-28-33+0800`. */
  filenameTimestamp: string
}

export function convertLegacyTxt(input: ConvertInput): LegacyConvertResult {
  const text = input.text.replaceAll(ANSI, '')
  const query = extractQuery(text)
  const hexagram = extractHexagram(text)
  if (hexagram === null) return { ok: false, reason: 'no-hexagram-line' }
  if (!isHexagram(hexagram)) return { ok: false, reason: 'invalid-hexagram' }

  // A legacy `.txt` may carry its casting table in one of two vintages
  // (HEAP or SPLIT). `extractCasting` returns the parsed `CastingRecord`
  // only when the 18 splits replay through `makeLineGenerator` back to the
  // file's own hexagram. The two null cases now carry distinct reasons
  // (ADR-0008): no table at all → 'legacy-no-table'; a table that does not
  // reconstruct → 'legacy-unreplayable'. The fact OF unreplayability is
  // recorded even though the casting data itself is not recovered.
  const extracted = extractCasting(text, hexagram)
  // Narrow `extracted` into one correlated `CastingPresence` member before
  // building the envelope: spreading the two fields independently would
  // decorrelate them against the union (finding S3).
  const presence: CastingPresence =
    extracted.casting === null
      ? { casting: null, castingAbsence: extracted.absence }
      : { casting: extracted.casting, castingAbsence: null }
  return {
    ok: true,
    envelope: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: filenameTimestampToIso(input.filenameTimestamp),
      query,
      hexagram,
      ...presence,
    },
  }
}

function filenameTimestampToIso(filenameTimestamp: string): string {
  // 2026-03-16T13-28-33+0800 → 2026-03-16T13:28:33+0800
  return filenameTimestamp.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3')
}

const QUERY_NOT_PROVIDED = '(Query not provided)'

function extractQuery(text: string): string {
  const match = /QUERY:\n\n {2}([\s\S]*?)\n\n/.exec(text)
  const raw = (match?.[1] ?? '').trim()
  if (raw === QUERY_NOT_PROVIDED) return ''
  return raw
}

function extractHexagram(text: string): Hexagram | null {
  const match =
    /\(First is line at bottom\)\n\n {2}(\d),\s*(\d),\s*(\d),\s*(\d),\s*(\d),\s*(\d)/.exec(
      text,
    )
  if (match === null) return null
  return match.slice(1, 7).map((n) => Number.parseInt(n, 10)) as Hexagram
}

/**
 * Per-line, bottom-first casting splits: each row is the three `(recordedMax, pick)`
 * pairs for casts 1–3. `null` means no parseable table was found.
 */
type RawSplits = [[number, number], [number, number], [number, number]]

/**
 * The outcome of recovering a legacy casting table, carrying the reason for a
 * null alongside the null itself so the two absent-casting origins stay
 * distinguishable (ADR-0008).
 */
type ExtractedCasting =
  | { casting: CastingRecord; absence: null }
  | { casting: null; absence: 'legacy-no-table' | 'legacy-unreplayable' }

/**
 * Recover the casting from whichever table vintage the file carries, then
 * replay-validate it. Returns a `legacy-no-table` null when no table is
 * present, a `legacy-unreplayable` null when the parsed splits do not
 * reconstruct `expected`, and the recovered casting (absence `null`) otherwise.
 */
function extractCasting(text: string, expected: Hexagram): ExtractedCasting {
  const rows = parseHeapTable(text) ?? parseSplitTable(text)
  if (rows === null) return { casting: null, absence: 'legacy-no-table' }

  const casting: CastingRecord = [
    splitsToLineCasting(rows[1]!),
    splitsToLineCasting(rows[2]!),
    splitsToLineCasting(rows[3]!),
    splitsToLineCasting(rows[4]!),
    splitsToLineCasting(rows[5]!),
    splitsToLineCasting(rows[6]!),
  ]

  return castingReplaysTo(casting, expected)
    ? { casting, absence: null }
    : { casting: null, absence: 'legacy-unreplayable' }
}

function splitsToLineCasting(row: RawSplits): LineCasting {
  return [
    { pick: row[0][1], recordedMax: row[0][0] },
    { pick: row[1][1], recordedMax: row[1][0] },
    { pick: row[2][1], recordedMax: row[2][0] },
  ]
}

/**
 * HEAP vintage — `Stalks | Left Heap | Right Heap` columns, bare numeric row
 * labels (`6`..`1`). Data rows look like:
 *   │    6 │     48 │    22 │    26 │     43 │    24 │    19 │     35 │    19 │    16 │
 * The `Stalks` column is the round's `recordedMax`; `Left Heap` is the `pick`.
 */
function parseHeapTable(text: string): Record<number, RawSplits> | null {
  // Right Heap columns are non-capturing — they are `recordedMax − pick` and
  // carry no information the parser needs beyond `Stalks` (`recordedMax`) and
  // `Left Heap` (`pick`).
  const rowRegex =
    /^│\s+(\d)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+\d+\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+\d+\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+\d+\s+│/gm
  const rows: Record<number, RawSplits> = {}
  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(text)) !== null) {
    const [, lineStr, m1, p1l, m2, p2l, m3, p3l] = match
    const line = Number.parseInt(lineStr!, 10)
    rows[line] = [
      [Number.parseInt(m1!, 10), Number.parseInt(p1l!, 10)],
      [Number.parseInt(m2!, 10), Number.parseInt(p2l!, 10)],
      [Number.parseInt(m3!, 10), Number.parseInt(p3l!, 10)],
    ]
  }
  if ([1, 2, 3, 4, 5, 6].some((line) => rows[line] === undefined)) return null
  return rows
}

/**
 * SPLIT vintage — `Stalks | Split` columns. The row label appears in two
 * sub-vintages: spelled-out (`Line 6`) and bare numeric (`6`). Data rows look
 * like:
 *   │ Line 6 │   48   │  37   │   43   │   3   │   35   │  17   │
 *   │    6 │     48 │    19 │     43 │    40 │     35 │    16 │
 * The seven-numeric-field shape (one row label + three `Stalks`/`Split`
 * pairs) is what tells a SPLIT row apart from a ten-field HEAP row.
 * The `Stalks` column is the round's `recordedMax`; `Split` is the left heap = `pick`.
 */
function parseSplitTable(text: string): Record<number, RawSplits> | null {
  const rowRegex =
    /^│\s+(?:Line\s+)?(\d)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│$/gm
  const rows: Record<number, RawSplits> = {}
  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(text)) !== null) {
    const [, lineStr, m1, p1, m2, p2, m3, p3] = match
    const line = Number.parseInt(lineStr!, 10)
    rows[line] = [
      [Number.parseInt(m1!, 10), Number.parseInt(p1!, 10)],
      [Number.parseInt(m2!, 10), Number.parseInt(p2!, 10)],
      [Number.parseInt(m3!, 10), Number.parseInt(p3!, 10)],
    ]
  }
  if ([1, 2, 3, 4, 5, 6].some((line) => rows[line] === undefined)) return null
  return rows
}
