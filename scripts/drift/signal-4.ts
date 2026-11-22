// Drift signal 4 (ADR-0042, R-198, R-199): ephemeral process IDs in
// `overhaul/` comments and test names. The contract is
// `ephemeral-finding.ts`'s.
//
// Every code's pattern is matched on its own, so matches of different codes
// may overlap; the longest is kept, a tie going to the lower code (R-226).
// Within one pattern the longer alternatives come first.

import type { EphemeralCode, EphemeralFinding } from './ephemeral-finding.js'
import type { ScanRecord } from './scan-record.js'

// Case-sensitive; `\b` without the `u` flag is an ASCII word boundary.
const patterns: readonly (readonly [EphemeralCode, RegExp])[] = [
  ['E1', /\b(?:Q-M-\d{3}-\d+|Q-PH\d+-\d+|Q-\d+|M\d{3}-\d+|PH\d+-\d+|Q\d+)\b/g],
  ['E2', /\bM-\d{3,}\b/g],
  ['E3', /\bS\d{1,2}\b/g],
  ['E4', /\bB\d{1,2}\b/g],
  // R-227: spaces or tabs only, so a label never spans a line break.
  ['E5', /\b(?:[Ss]lices?|[Ww]aves?)[ \t]+\d+\b/g],
  // R-228: a whole ephemeral path is one ID, up to whitespace or a closing
  // quote, backtick or bracket.
  [
    'E6',
    /\bdocs\/(?:(?:reviews|plans|handoffs|archive)(?:\/[^\s'"`)\]}>]*|\b)|legacy-architecture\.md\b)|\b(?:MATTERS|MINUTES|RULINGS)\b/g,
  ],
  ['E7', /\bR-\d{3,}\b/g],
]

const lineBreak = /\r\n?|[\n\u2028\u2029]/

interface Match {
  readonly start: number
  readonly end: number
  readonly code: EphemeralCode
  readonly id: string
}

function matchesIn(text: string): Match[] {
  const candidates: Match[] = []
  for (const [code, pattern] of patterns)
    for (const found of text.matchAll(pattern))
      candidates.push({
        start: found.index,
        end: found.index + found[0].length,
        code,
        id: found[0],
      })
  const kept: Match[] = []
  const byPrecedence = candidates.toSorted(
    (a, b) =>
      b.end - b.start - (a.end - a.start) ||
      a.code.localeCompare(b.code) ||
      a.start - b.start,
  )
  for (const match of byPrecedence)
    if (
      kept.every(
        (other) => match.end <= other.start || other.end <= match.start,
      )
    )
      kept.push(match)
  return kept.toSorted((a, b) => a.start - b.start)
}

export function findEphemeralIds(
  records: readonly ScanRecord[],
): EphemeralFinding[] {
  // Keyed by line and code (R-230); each entry's IDs stay in source order.
  const found = new Map<
    string,
    { line: number; code: EphemeralCode; ids: string[] }
  >()
  for (const record of records) {
    if (record.kind !== 'comment' && record.kind !== 'test-name') continue
    for (const match of matchesIn(record.text)) {
      // A finding reports its own line: the record's, plus the line breaks
      // before it (R-230). A cooked test name may keep a raw U+2028 or
      // U+2029, so every terminator counts (R-225). Cooked text cannot tell
      // an escaped `\n` from a real break, R-230's stated limit.
      const line =
        record.line +
        record.text.slice(0, match.start).split(lineBreak).length -
        1
      const key = `${line} ${match.code}`
      const entry = found.get(key) ?? { line, code: match.code, ids: [] }
      entry.ids.push(match.id)
      found.set(key, entry)
    }
  }
  return [...found.values()].toSorted(
    (a, b) => a.line - b.line || a.code.localeCompare(b.code),
  )
}
