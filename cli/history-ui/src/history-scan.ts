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

  entries.sort((a, b) => (a.envelope.timestamp < b.envelope.timestamp ? 1 : -1))
  return { entries, unreadable }
}
