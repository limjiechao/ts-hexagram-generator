import type { ConsultationStore } from '@hexagram/application/consultation-store'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import { cryptoRandomSource } from '@hexagram/node-effects/crypto-random-source'
import { systemClock } from '@hexagram/node-effects/system-clock'

import type { CommandIo, CommandPorts } from '#src/commands/entry-point.js'
import { journalFolder } from '#src/journal-folder.js'

/**
 * The process's own terminal, as a command takes it: stdout decides the mode
 * (ADR-0010, amended by ADR-0044), and the environment is read for `NO_COLOR`
 * and `CI` only.
 */
export function processIo(process: NodeJS.Process): CommandIo {
  // A piped stdout has no `isTTY` at all, whatever Node's types say.
  const isTTY = process.stdout.isTTY === true
  return {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
    isTTY,
    rows: isTTY ? process.stdout.rows : undefined,
    columns: isTTY ? process.stdout.columns : undefined,
    env: { NO_COLOR: process.env.NO_COLOR, CI: process.env.CI },
  }
}

const notBuilt = (adapter: string) => (): Promise<never> =>
  Promise.reject(new Error(`the ${adapter} adapter is not built yet`))

/** Stands in for the Scripture Catalogue until its adapter lands. */
const scriptureCatalogue: ScriptureCatalogue = {
  passageTexts: notBuilt('Scripture Catalogue'),
  hexagramNames: notBuilt('Scripture Catalogue'),
  receivedSequenceNumber: notBuilt('Scripture Catalogue'),
  trigramNames: notBuilt('Scripture Catalogue'),
  editions: notBuilt('Scripture Catalogue'),
}

/** Stands in for the Consultation Store until its adapter lands. */
const consultationStore: ConsultationStore = {
  keep: notBuilt('Consultation Store'),
  list: notBuilt('Consultation Store'),
  get: notBuilt('Consultation Store'),
  remove: notBuilt('Consultation Store'),
  deletionRecords: notBuilt('Consultation Store'),
}

/**
 * The real adapters a bin passes: the system Clock and the Random Source on
 * `node:crypto`, throwing stubs for the Scripture Catalogue and the Consultation
 * Store until their adapters land, and the Journal's folder (ADR-0020).
 * `moveToLegacy` is a throwing stub until the bin builds the Markdown Store.
 */
// The Journal's folder is found from the module, never from the process's
// working folder (ADR-0020), so the process goes unread for now.
// eslint-disable-next-line unused-imports/no-unused-vars
export function processPorts(process: NodeJS.Process): CommandPorts {
  return {
    clock: systemClock,
    randomSource: cryptoRandomSource,
    scriptureCatalogue,
    consultationStore,
    journalFolder: journalFolder(),
    moveToLegacy: notBuilt('Markdown Consultation Store'),
  }
}
