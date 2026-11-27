import { randomUUID } from 'node:crypto'
import { link, open, readFile, rm } from 'node:fs/promises'
import path from 'node:path'

import type { ConsultationStore } from '@hexagram/application/consultation-store'
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
  bundleUnwritableLine,
  exportedLine,
  exportTargetExistsLine,
  journalFailureLine,
  leftOutLine,
  mergedLine,
} from '#src/commands/maintenance-reports.js'
import { composeCli } from '#src/composition-root.js'

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
      return endWith(io, bundleUnwritableLine(file))
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
    const leftOut = decoded.leftOut.toSorted(
      (left, right) => left.index - right.index,
    )
    for (const { index, reason } of leftOut) {
      io.stdout.write(`${leftOutLine(index, reason)}\n`)
    }
    io.stdout.write(
      `${mergedLine(file, { ...counts, leftOut: leftOut.length })}\n`,
    )
    return 0
  })
}

/** The use cases over the ports, their Store's failures told apart. */
function useCases(ports: CommandPorts): ReturnType<typeof composeCli> {
  return composeCli({
    ...ports,
    consultationStore: tellingFailures(ports.consultationStore),
  })
}

/** A Store failure, named by whether the Journal was being read or written. */
class JournalFailureError extends Error {
  override readonly name = 'JournalFailureError'
  readonly failure: 'read' | 'written'

  constructor(failure: 'read' | 'written', cause: unknown) {
    super(`the Journal cannot be ${failure}`, { cause })
    this.failure = failure
  }
}

/**
 * The Store with each failure wrapped as a `JournalFailureError`, since a use
 * case rejects with the Store's failure unchanged and so cannot say which
 * call failed.
 */
function tellingFailures(store: ConsultationStore): ConsultationStore {
  return {
    keep: (consultation) => named('written', () => store.keep(consultation)),
    list: () => named('read', () => store.list()),
    get: (id) => named('read', () => store.get(id)),
    remove: (record) => named('written', () => store.remove(record)),
    deletionRecords: () => named('read', () => store.deletionRecords()),
  }
}

async function named<Value>(
  failure: 'read' | 'written',
  call: () => Promise<Value>,
): Promise<Value> {
  try {
    return await call()
  } catch (error) {
    throw new JournalFailureError(failure, error)
  }
}

/** Runs `body`, ending a Store failure with its one stderr line. */
async function reportingJournalFailure(
  io: CommandIo,
  body: () => Promise<ExitCode>,
): Promise<ExitCode> {
  try {
    return await body()
  } catch (error) {
    if (error instanceof JournalFailureError) {
      return endWith(io, journalFailureLine(error.failure))
    }
    throw error
  }
}

// `ignoreBOM` keeps a byte order mark in the text, so the bundle refuses it
// rather than the reading dropping it.
const strictUtf8Decoder = new TextDecoder('utf-8', {
  fatal: true,
  ignoreBOM: true,
})

/** The bytes as UTF-8, or undefined when they are not UTF-8. */
function strictUtf8(bytes: Uint8Array): string | undefined {
  try {
    return strictUtf8Decoder.decode(bytes)
  } catch {
    return undefined
  }
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
    await rm(temporary, { force: true, maxRetries: 3 })
  }
}
