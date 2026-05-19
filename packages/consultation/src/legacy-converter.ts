import {
  isHexagram,
  type CastingRecord,
  type Hexagram,
  type LineCasting,
} from '@hexagram/types'

import type { ConsultationEnvelope } from './frontmatter.js'

// Strip ANSI SGR sequences. The new-format fixtures contain them; older
// real-world files don't.
// oxlint-disable-next-line no-control-regex
const ANSI = /\u001B\[[0-9;]*m/g

export type LegacyEnvelope = ConsultationEnvelope & {
  castingRecovered: boolean
}

export type LegacyConvertResult =
  | { ok: true; envelope: LegacyEnvelope }
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

  const casting = extractCasting(text)
  return {
    ok: true,
    envelope: {
      schemaVersion: 1,
      timestamp: filenameTimestampToIso(input.filenameTimestamp),
      query,
      hexagram,
      casting: casting ?? sentinelCasting(),
      castingRecovered: casting !== null,
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

function extractCasting(text: string): CastingRecord | null {
  // The new-format CASTING table uses lines like:
  //   │    6 │     48 │    21 │    27 │     39 │     6 │    33 │     31 │    30 │     1 │
  // 6 rows total, line numbers 6..1 (top-down). Each row has Stalks/Left/Right × 3.
  const rowRegex =
    /^│\s+(\d)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│/gm
  const rows: Record<
    number,
    [number, number, number, number, number, number, number, number, number]
  > = {}
  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(text)) !== null) {
    const [, lineStr, m1, p1l, p1r, m2, p2l, p2r, m3, p3l, p3r] = match
    const line = Number.parseInt(lineStr!, 10)
    rows[line] = [
      Number.parseInt(m1!, 10),
      Number.parseInt(p1l!, 10),
      Number.parseInt(p1r!, 10),
      Number.parseInt(m2!, 10),
      Number.parseInt(p2l!, 10),
      Number.parseInt(p2r!, 10),
      Number.parseInt(m3!, 10),
      Number.parseInt(p3l!, 10),
      Number.parseInt(p3r!, 10),
    ]
  }
  if ([1, 2, 3, 4, 5, 6].some((line) => rows[line] === undefined)) return null
  const lineCasting = (line: number): LineCasting => {
    const r = rows[line]!
    return [
      { pick: r[1], max: r[0] },
      { pick: r[4], max: r[3] },
      { pick: r[7], max: r[6] },
    ]
  }
  return [
    lineCasting(1),
    lineCasting(2),
    lineCasting(3),
    lineCasting(4),
    lineCasting(5),
    lineCasting(6),
  ]
}

function sentinelCasting(): CastingRecord {
  const empty: LineCasting = [
    { pick: 0, max: 0 },
    { pick: 0, max: 0 },
    { pick: 0, max: 0 },
  ]
  return [empty, empty, empty, empty, empty, empty]
}
