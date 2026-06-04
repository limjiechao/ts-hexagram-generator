import { makeLineGenerator, stalksBeforeParting } from '@hexagram/core'
import {
  assertIsLine,
  isHexagram,
  type CastingRecord,
  type Hexagram,
  type Line,
  type LineCasting,
} from '@hexagram/core/types'

import type { ConsultationEnvelope } from './frontmatter.js'

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
  // file's own hexagram; otherwise (no table, or a table that does not
  // reconstruct) it returns `null`. "No casting" is `null` — no sentinel.
  const casting = extractCasting(text, hexagram)
  return {
    ok: true,
    envelope: {
      schemaVersion: 1,
      timestamp: filenameTimestampToIso(input.filenameTimestamp),
      query,
      hexagram,
      casting,
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
 * Per-line, bottom-first casting splits: each row is the three `(max, pick)`
 * pairs for casts 1–3. `null` means no parseable table was found.
 */
type RawSplits = [[number, number], [number, number], [number, number]]

/**
 * Recover the casting from whichever table vintage the file carries, then
 * replay-validate it. Returns `null` when no table is present or the parsed
 * splits do not reconstruct `expected`.
 */
function extractCasting(
  text: string,
  expected: Hexagram,
): CastingRecord | null {
  const rows = parseHeapTable(text) ?? parseSplitTable(text)
  if (rows === null) return null

  const casting: CastingRecord = [
    splitsToLineCasting(rows[1]!),
    splitsToLineCasting(rows[2]!),
    splitsToLineCasting(rows[3]!),
    splitsToLineCasting(rows[4]!),
    splitsToLineCasting(rows[5]!),
    splitsToLineCasting(rows[6]!),
  ]

  return castingReplaysTo(casting, expected) ? casting : null
}

function splitsToLineCasting(row: RawSplits): LineCasting {
  return [
    { pick: row[0][1], max: row[0][0] },
    { pick: row[1][1], max: row[1][0] },
    { pick: row[2][1], max: row[2][0] },
  ]
}

/**
 * HEAP vintage — `Stalks | Left Heap | Right Heap` columns, bare numeric row
 * labels (`6`..`1`). Data rows look like:
 *   │    6 │     48 │    22 │    26 │     43 │    24 │    19 │     35 │    19 │    16 │
 * The `Stalks` column is the round's `max`; `Left Heap` is the `pick`.
 */
function parseHeapTable(text: string): Record<number, RawSplits> | null {
  // Right Heap columns are non-capturing — they are `max − pick` and carry no
  // information the parser needs beyond `Stalks` (`max`) and `Left Heap`
  // (`pick`).
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
 * The `Stalks` column is the round's `max`; `Split` is the left heap = `pick`.
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

/**
 * Replay the 18 recorded splits through `makeLineGenerator` and check the
 * resulting 6-line tuple equals `expected`. Any throw during replay (e.g. a
 * `pick` outside the round's stalk range) counts as a mismatch.
 */
function castingReplaysTo(casting: CastingRecord, expected: Hexagram): boolean {
  try {
    const replayed = casting.map((lineCasting) => replayLine(lineCasting))
    return replayed.every((line, index) => line === expected[index])
  } catch {
    return false
  }
}

/** Drive `makeLineGenerator` for one line with its three `(pick)` splits. */
function replayLine(lineCasting: LineCasting): Line {
  const [cast1, cast2, cast3] = lineCasting
  // Each recorded pick is validated by `performCast` inside `makeLineGenerator`
  // (the single runtime enforcer): a degenerate pick that empties the right heap
  // after suspension throws `RangeError`, which `castingReplaysTo` catches as a
  // mismatch → `castingRecovered: false`. So a legacy file that recorded an
  // empty right heap is not recovered, by design (see ADR-0006).
  const generator = makeLineGenerator({
    unpartedStalks: stalksBeforeParting,
    suspendedFromNextRound: [],
    partStalksAtIndex: cast1.pick,
  })
  const roundOne = generator.next()
  if (roundOne.done) throw new Error('replay: generator ended early')
  const roundTwo = generator.next(cast2.pick)
  if (roundTwo.done) throw new Error('replay: generator ended early')
  generator.next(cast3.pick)
  const line = generator.next().value
  assertIsLine(line)
  return line
}
