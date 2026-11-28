import type { ConsultationStore } from '@hexagram/application/consultation-store'
import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
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

/** Stands in for the Consultation Store until its adapter lands. */
const consultationStore: ConsultationStore = {
  keep: notBuilt('Consultation Store'),
  list: notBuilt('Consultation Store'),
  get: notBuilt('Consultation Store'),
  remove: notBuilt('Consultation Store'),
  deletionRecords: notBuilt('Consultation Store'),
}

/**
 * The real adapters a bin passes: the system Clock, the Random Source on
 * `node:crypto`, the bundled Scripture Catalogue, a throwing stub for the
 * Consultation Store until its adapter lands, and the Journal's folder
 * (ADR-0020).
 * `moveToLegacy` and `rerenderBodies` are throwing stubs until the bin
 * builds the Markdown Store.
 *
 * Drafted for ratification, not yet built: the bin builds the Markdown
 * Consultation Store over the Journal's folder with
 * `markdownBodyRenderer({ scriptureCatalogue: bundledScriptureCatalogue })`
 * as its body renderer, and passes its `consultationStore`, its
 * `moveToLegacy`, and its `rerenderBodies` for `--rerender-bodies`, both
 * stubs going. From then on every command writes to and reads the real
 * Journal, and only a test's own ports keep it untouched.
 */
// The Journal's folder is found from the module, never from the process's
// working folder (ADR-0020), so the process goes unread for now.
// eslint-disable-next-line unused-imports/no-unused-vars
export function processPorts(process: NodeJS.Process): CommandPorts {
  return {
    clock: systemClock,
    randomSource: cryptoRandomSource,
    scriptureCatalogue: bundledScriptureCatalogue,
    consultationStore,
    journalFolder: journalFolder(),
    moveToLegacy: notBuilt('Markdown Consultation Store'),
    rerenderBodies: notBuilt('Markdown Consultation Store'),
  }
}
