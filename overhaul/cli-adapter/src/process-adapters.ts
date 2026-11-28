import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import { cryptoRandomSource } from '@hexagram/node-effects/crypto-random-source'
import { systemClock } from '@hexagram/node-effects/system-clock'
import { markdownConsultationStore } from '@hexagram/store-markdown/markdown-consultation-store'

import type { CommandIo, CommandPorts } from '#src/commands/entry-point.js'
import { journalFolder } from '#src/journal-folder.js'
import { markdownBodyRenderer } from '#src/readout/markdown-body.js'
import { exportFontFolder, typstPdfCompiler } from '#src/typst-pdf.js'

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
    signals: process,
    stdout: process.stdout,
    stderr: process.stderr,
    isTTY,
    rows: isTTY ? process.stdout.rows : undefined,
    columns: isTTY ? process.stdout.columns : undefined,
    env: { NO_COLOR: process.env.NO_COLOR, CI: process.env.CI },
  }
}

/**
 * The real adapters a bin passes: the system Clock, the Random Source on
 * `node:crypto`, the bundled Scripture Catalogue, and the Markdown
 * Consultation Store over the Journal's folder (ADR-0020), its bodies
 * rendered by `markdownBodyRenderer` from the bundled Catalogue. Besides its
 * `consultationStore`, the bin passes the Store's `moveToLegacy` and its
 * `rerenderBodies` for `--rerender-bodies`, and the PDF compiler for
 * `--export`. Every command run from a bin
 * writes to and reads the real Journal of its checkout; only a test's own
 * ports keep it untouched.
 */
// The Journal's folder is found from the module, never from the process's
// working folder (ADR-0020), so the process goes unread for now.
// eslint-disable-next-line unused-imports/no-unused-vars
export function processPorts(process: NodeJS.Process): CommandPorts {
  const folder = journalFolder()
  const store = markdownConsultationStore({
    journalFolder: folder,
    renderBody: markdownBodyRenderer({
      scriptureCatalogue: bundledScriptureCatalogue,
    }),
  })
  return {
    clock: systemClock,
    randomSource: cryptoRandomSource,
    scriptureCatalogue: bundledScriptureCatalogue,
    consultationStore: store.consultationStore,
    journalFolder: folder,
    moveToLegacy: store.moveToLegacy,
    rerenderBodies: store.rerenderBodies,
    compilePdf: typstPdfCompiler(exportFontFolder()),
  }
}
