import type { ConsultationStore } from '@hexagram/application/consultation-store'

import type {
  CommandIo,
  CommandPorts,
  ExitCode,
} from '#src/commands/entry-point.js'
import { endWith } from '#src/commands/frame.js'
import { journalFailureLine } from '#src/commands/maintenance-reports.js'
import { composeCli } from '#src/composition-root.js'

/*
 * What `hexagram-history`'s maintenance runs share: the use cases over the
 * ports with each Store failure named by whether the Journal was being read
 * or written, the one stderr line such a failure ends with, and the strict
 * UTF-8 reading of a file the user gave.
 */

/** The use cases over the ports, their Store's failures told apart. */
export function useCases(ports: CommandPorts): ReturnType<typeof composeCli> {
  return composeCli({
    ...ports,
    consultationStore: tellingFailures(ports.consultationStore),
  })
}

/** A Store failure, named by whether the Journal was being read or written. */
export class JournalFailureError extends Error {
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
export async function reportingJournalFailure(
  io: CommandIo,
  body: () => Promise<ExitCode>,
): Promise<ExitCode> {
  try {
    return await body()
  } catch (error) {
    if (error instanceof JournalFailureError) {
      return endWith(io, journalFailureLine('hexagram-history', error.failure))
    }
    throw error
  }
}

// `ignoreBOM` keeps a byte order mark in the text, so the reader of the
// text sees it and refuses it, rather than the decoding dropping it.
const strictUtf8Decoder = new TextDecoder('utf-8', {
  fatal: true,
  ignoreBOM: true,
})

/** The bytes as UTF-8, or undefined when they are not UTF-8. */
export function strictUtf8(bytes: Uint8Array): string | undefined {
  try {
    return strictUtf8Decoder.decode(bytes)
  } catch {
    return undefined
  }
}
