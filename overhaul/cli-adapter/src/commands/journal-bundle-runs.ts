import { randomUUID } from 'node:crypto'
import { link, open, readFile, rm } from 'node:fs/promises'
import path from 'node:path'

import {
  decodeJournalBundle,
  encodeJournalBundle,
} from '@hexagram/consultation-journal/journal-bundle'

import type {
  CommandIo,
  CommandPorts,
  ExitCode,
} from '#src/commands/entry-point.js'
import { endWith } from '#src/commands/frame.js'
import {
  bundleRefusedLine,
  bundleUnreadableLine,
  exportedLine,
  exportTargetExistsLine,
  leftOutLine,
  mergedLine,
  targetUnwritableLine,
} from '#src/commands/maintenance-reports.js'
import {
  reportingJournalFailure,
  strictUtf8,
  useCases,
} from '#src/commands/maintenance-runs.js'

/*
 * `hexagram-history --export-journal <file>` and `--merge-journal <file>`
 * (use case 10): the Journal written as a bundle, and a bundle merged in.
 * The file is the user's own path, resolved against the working folder and
 * reported as given.
 */

/** Writes the Journal as a bundle at `file`, never over a file there. */
export function exportJournalRun(
  file: string,
  io: CommandIo,
  ports: CommandPorts,
): Promise<ExitCode> {
  return reportingJournalFailure(io, async () => {
    const journal = await useCases(ports).exportJournal()
    const written = await createExclusively(file, encodeJournalBundle(journal))
    if (written === 'exists') return endWith(io, exportTargetExistsLine(file))
    if (written === 'unwritable') {
      return endWith(io, targetUnwritableLine(file))
    }
    io.stdout.write(
      `${exportedLine(file, {
        consultations: journal.consultations.length,
        // The bundle holds one Deletion Record per Consultation Id.
        deletionRecords: new Set(
          journal.deletionRecords.map((record) => record.consultationId),
        ).size,
      })}\n`,
    )
    return 0
  })
}

/** Merges the bundle at `file` into the Journal, reporting what it changed. */
export async function mergeJournalRun(
  file: string,
  io: CommandIo,
  ports: CommandPorts,
): Promise<ExitCode> {
  let bytes: Uint8Array
  try {
    bytes = await readFile(file)
  } catch {
    return endWith(io, bundleUnreadableLine(file))
  }
  const text = strictUtf8(bytes)
  if (text === undefined) {
    return endWith(io, bundleRefusedLine(file, { kind: 'not-json' }))
  }
  const decoded = decodeJournalBundle(text)
  if (decoded.outcome === 'unreadable') {
    return endWith(io, bundleRefusedLine(file, decoded.reason))
  }
  return reportingJournalFailure(io, async () => {
    const counts = await useCases(ports).mergeJournal(decoded.journal)
    for (const { index, reason } of decoded.leftOut) {
      io.stdout.write(`${leftOutLine(index, reason)}\n`)
    }
    io.stdout.write(
      `${mergedLine(file, { ...counts, leftOut: decoded.leftOut.length })}\n`,
    )
    return 0
  })
}

/**
 * Writes `text` at `file` only if no file holds that path: `exists` when
 * one does, `unwritable` on any other failure. The text is written whole
 * beside it first and then linked in, since a hard link, unlike a rename,
 * refuses to replace a file, so a reader never sees part of a bundle. A
 * known limit: a filesystem without hard links cannot be exported to.
 */
async function createExclusively(
  file: string,
  text: string,
): Promise<'created' | 'exists' | 'unwritable'> {
  const temporary = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${randomUUID()}.tmp`,
  )
  try {
    const handle = await open(temporary, 'wx')
    try {
      await handle.writeFile(text, 'utf8')
      await handle.sync()
    } finally {
      await handle.close()
    }
    await link(temporary, file)
    return 'created'
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      return 'exists'
    }
    return 'unwritable'
  } finally {
    // What is reported is the bundle, or the failure that stopped it; a
    // leftover dotfile `.tmp` is harmless, so a failed removal is ignored.
    await rm(temporary, { force: true, maxRetries: 3 }).catch(() => {})
  }
}
