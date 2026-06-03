import path from 'node:path'
import process from 'node:process'

import { getEmergingHexagram, getHexagramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/core/types'
import { truncateEnd } from '@hexagram/viewer-core'

import { rowPath, type ListRow } from './history-list-state.js'
import type { HistoryEntry } from './history-scan.js'

/**
 * Width of the fixed `[YYYY-MM-DD HH:mm] ` prefix on a row's first line —
 * `[` + 16 chars + `]` + one space. Line 2 is indented by this much so its
 * content aligns under the query text.
 */
export const TIMESTAMP_PREFIX_WIDTH = 19

function shortenTimestamp(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`
}

/**
 * Structured parts of the hexagram summary line for palette-colored rendering.
 * `movingSegment` is non-null only when there are moving lines.
 */
export interface HexSummaryParts {
  standingText: string
  movingSegment: string | null
}

export function summarizeHexParts(hexagram: Hexagram): HexSummaryParts {
  const standing = getHexagramRecord(hexagram)
  const hasMoving = hexagram.some((line) => line === 6 || line === 9)
  const standingText = `#${standing.Metadata.Order.WenWang} ${standing.Name.Chinese.Traditional} ${standing.Name.English.WilhelmBaynes.split(' / ')[0] ?? standing.Name.English.WilhelmBaynes}`
  if (!hasMoving) return { standingText, movingSegment: null }
  const emerging = getHexagramRecord(getEmergingHexagram(hexagram))
  const emergingText = `#${emerging.Metadata.Order.WenWang} ${emerging.Name.Chinese.Traditional} ${emerging.Name.English.WilhelmBaynes.split(' / ')[0] ?? emerging.Name.English.WilhelmBaynes}`
  return { standingText, movingSegment: ` ──▶ ${emergingText}` }
}

/**
 * Structured parts of the first row line for palette-colored rendering.
 */
export interface HeadLineParts {
  prefix: string
  query: string
}

/** First line parts of a row: `[timestamp]` prefix and truncated query. */
export function entryHeadLineParts(
  entry: HistoryEntry,
  innerWidth: number,
): HeadLineParts {
  const query =
    entry.envelope.query.length > 0 ? entry.envelope.query : '(no query)'
  const prefix = `[${shortenTimestamp(entry.envelope.timestamp)}] `
  return {
    prefix,
    query: truncateEnd(query, innerWidth - TIMESTAMP_PREFIX_WIDTH),
  }
}

/**
 * Build the human-readable identity line shown in the delete confirm modal —
 * `[YYYY-MM-DD HH:mm] <query>` (truncated) for a readable entry, or
 * `[unreadable — <reason>]` for an unreadable row. Falls back to the path
 * when the row can no longer be found in the list.
 */
export function deleteIdentity(
  listRows: ListRow[],
  targetPath: string,
  innerCols: number,
): string {
  const row = listRows.find((r) => rowPath(r) === targetPath)
  if (row == null) return path.relative(process.cwd(), targetPath)
  if (row.kind === 'unreadable') return `[unreadable — ${row.item.reason}]`
  const head = entryHeadLineParts(row.entry, innerCols)
  return `${head.prefix}${head.query}`
}

/**
 * Build the shell title string.
 * `Past Consultations · consultations/ · N consultations [· M unreadable]`
 * The `· M unreadable` clause appears only when M > 0.
 */
export function buildTitle(
  consultationCount: number,
  unreadableCount: number,
): string {
  const countClause = `${consultationCount} ${consultationCount === 1 ? 'consultation' : 'consultations'}`
  const unreadableClause =
    unreadableCount > 0 ? ` · ${unreadableCount} unreadable` : ''
  return `Past Consultations · consultations/ · ${countClause}${unreadableClause}`
}
