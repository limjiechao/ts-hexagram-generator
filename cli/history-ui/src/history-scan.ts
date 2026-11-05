import fs from 'node:fs/promises'
import path from 'node:path'

import { loadConsultationFile } from '@hexagram/consultation-file/file'
import type {
  ConsultationEnvelope,
  ParseFailureReason,
} from '@hexagram/consultation-file/frontmatter'

export interface HistoryEntry {
  path: string
  envelope: ConsultationEnvelope
  body: string
}

export interface UnreadableEntry {
  path: string
  reason: ParseFailureReason | 'io-error'
}

export interface ScanResult {
  entries: HistoryEntry[]
  unreadable: UnreadableEntry[]
}

/**
 * Walk `<dir>/*.md` (NOT `<dir>/legacy/`), parse each frontmatter envelope,
 * sort readable entries newest-first by `envelope.timestamp`.
 */
export async function scanConsultations(dir: string): Promise<ScanResult> {
  let names: string[]
  try {
    names = await fs.readdir(dir)
  } catch {
    return { entries: [], unreadable: [] }
  }
  const mdFiles = names
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join(dir, name))

  const entries: HistoryEntry[] = []
  const unreadable: UnreadableEntry[] = []

  await Promise.all(
    mdFiles.map(async (filePath) => {
      const result = await loadConsultationFile(filePath)
      if (result.ok) {
        entries.push({
          path: result.path,
          envelope: result.envelope,
          body: result.body,
        })
      } else {
        unreadable.push({ path: result.path, reason: result.reason })
      }
    }),
  )

  entries.sort((a, b) => {
    const ta = timestampInstant(a.envelope.timestamp)
    const tb = timestampInstant(b.envelope.timestamp)
    return ta === tb ? 0 : tb - ta
  })
  return { entries, unreadable }
}

/**
 * Epoch ms of a saved timestamp. Timestamps carry the local offset at save
 * time (`+0800`, ADR-0008), so string order is not instant order. `Date.parse`
 * only guarantees the colon form (`+08:00`), hence the normalisation. An
 * unparseable value maps to -Infinity so the comparator stays consistent.
 */
function timestampInstant(timestamp: string): number {
  const ms = Date.parse(timestamp.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'))
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms
}
