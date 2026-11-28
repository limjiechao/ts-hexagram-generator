import path from 'node:path'

import type { ExportedConsultations } from '@hexagram/application/export-consultations'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

import {
  CatalogueFailureError,
  namingCatalogueFailure,
} from '#src/commands/catalogue-failure.js'
import { createExclusively } from '#src/commands/create-exclusively.js'
import type {
  CommandIo,
  CommandPorts,
  ExitCode,
} from '#src/commands/entry-point.js'
import { endWith } from '#src/commands/frame.js'
import {
  exportedConsultationsLine,
  exportFontsLine,
  exportTargetExistsLine,
  nothingToExportLine,
  targetUnwritableLine,
  typstRefusedLine,
} from '#src/commands/maintenance-reports.js'
import {
  reportingJournalFailure,
  useCases,
} from '#src/commands/maintenance-runs.js'
import {
  portFailureLine,
  stdoutUnwritableLine,
} from '#src/commands/plain-casting-wording.js'
import {
  ExportFontsError,
  TypstCompileError,
  type CompilePdf,
} from '#src/typst-pdf.js'

/*
 * `hexagram-history --export <path> [--filter <text>]` (use case 9; manual
 * 6.8): a Readout of each matching Consultation, in the browse list's order
 * and the Reading Preference given, written as Typst source or as a PDF.
 * The path is the user's own, resolved against the working folder and
 * reported as given. An export holds private Consultations (ADR-0015).
 */

/**
 * What the path's extension asks for: `.typ` Typst source, `.pdf` a PDF,
 * matched exactly and in lower case, on the last extension only; any other
 * path, one with no extension included, asks for neither and is refused
 * with the usage line while the options are parsed, before any port is
 * touched.
 */
export function exportFormatOf(target: string): 'typst' | 'pdf' | undefined {
  // A path ending in a separator names a folder, though `extname` reads
  // past the separator.
  if (target.endsWith('/') || target.endsWith(path.sep)) return undefined
  const extension = path.extname(target)
  if (extension === '.typ') return 'typst'
  if (extension === '.pdf') return 'pdf'
  return undefined
}

/**
 * Runs the export, once the options are parsed, the format known and the
 * Reading Preference checked against the Catalogue's Editions. In order:
 *
 * 1. Use case 9 over the ports, the filter as given or empty. A Store
 *    failure ends with `journalFailureLine('hexagram-history', 'read')` and
 *    a Catalogue failure with the Catalogue line, each exit 1.
 * 2. When nothing matches, `nothingToExportLine` on stderr, exit 1, and no
 *    file is written.
 * 3. For a `.pdf`, `compilePdf` compiles the source. A font that cannot be
 *    loaded ends with `exportFontsLine`, and Typst refusing the source with
 *    `typstRefusedLine`, each exit 1, no file written.
 * 4. The bytes are written at the path only if no file holds it, whole or
 *    not at all, as `--export-journal` writes a bundle:
 *    `exportTargetExistsLine` when a file does, and
 *    `targetUnwritableLine` on any other failure, each exit 1.
 * 5. `exportedConsultationsLine` on stdout, exit 0. A stdout failure after
 *    the file is written ends with the stdout line, exit 1, the file kept.
 *
 * The Journal is read before any file is created, so a run that cannot
 * read it never writes beside it. It never writes to the Store.
 */
export async function exportRun(
  target: string,
  format: 'typst' | 'pdf',
  filter: string,
  preference: ReadingPreference,
  io: CommandIo,
  ports: CommandPorts,
  compilePdf: CompilePdf,
): Promise<ExitCode> {
  const streams = watchingStreams(io)
  try {
    return await reportingJournalFailure(io, async () => {
      const exported = await exportedSource(filter, preference, ports)
      if (exported === 'catalogue-failed') {
        return endWith(
          io,
          portFailureLine(
            'hexagram-history',
            'the Scripture Catalogue cannot be read',
          ),
        )
      }
      if (exported.outcome === 'none-matching') {
        return endWith(io, nothingToExportLine())
      }
      const contents = await contentsOf(exported.typst, format, compilePdf)
      if (typeof contents === 'object' && 'line' in contents) {
        return endWith(io, contents.line)
      }
      const written = await createExclusively(target, contents)
      if (written === 'exists')
        return endWith(io, exportTargetExistsLine(target))
      if (written === 'unwritable') {
        return endWith(io, targetUnwritableLine(target))
      }
      await streams.written(
        `${exportedConsultationsLine(target, exported.consultations)}\n`,
      )
      if (streams.stdoutFailed()) {
        return endWith(io, stdoutUnwritableLine('hexagram-history'))
      }
      return 0
    })
  } finally {
    streams.release()
  }
}

/** Use case 9's result, or that the Scripture Catalogue failed. */
async function exportedSource(
  filter: string,
  preference: ReadingPreference,
  ports: CommandPorts,
): Promise<ExportedConsultations | 'catalogue-failed'> {
  try {
    return await useCases({
      ...ports,
      scriptureCatalogue: namingCatalogueFailure(ports.scriptureCatalogue),
    }).exportConsultations(filter, preference)
  } catch (error) {
    if (error instanceof CatalogueFailureError) return 'catalogue-failed'
    throw error
  }
}

/**
 * What is written: the source itself for `.typ`, or the PDF it compiles
 * to, or the line that ends the run when it cannot be compiled.
 */
async function contentsOf(
  typst: string,
  format: 'typst' | 'pdf',
  compilePdf: CompilePdf,
): Promise<string | Uint8Array | { readonly line: string }> {
  if (format === 'typst') return typst
  try {
    return await compilePdf(typst)
  } catch (error) {
    if (error instanceof ExportFontsError) {
      return { line: exportFontsLine(error.file) }
    }
    if (error instanceof TypstCompileError) return { line: typstRefusedLine() }
    throw error
  }
}

/**
 * What the run hears from its streams, from start to end: a stdout error,
 * by its event or a write's callback, is remembered, so the file already
 * written is kept and the stdout line follows; a stderr error is heard and
 * ignored, since there is nowhere left to say so. Unheard, a stream's
 * error would end the process.
 */
function watchingStreams(io: CommandIo): {
  /** Writes to stdout, settling once stdout has handled the chunk. */
  readonly written: (chunk: string) => Promise<void>
  readonly stdoutFailed: () => boolean
  readonly release: () => void
} {
  let stdoutFailed = false
  const onStdoutError = (): void => {
    stdoutFailed = true
  }
  io.stdout.on('error', onStdoutError)
  io.stderr.on('error', ignored)
  return {
    written: (chunk) =>
      new Promise((resolve) => {
        io.stdout.write(chunk, (error) => {
          if (error !== undefined && error !== null) onStdoutError()
          resolve()
        })
      }),
    stdoutFailed: () => stdoutFailed,
    release: () => {
      io.stdout.off('error', onStdoutError)
      io.stderr.off('error', ignored)
    },
  }
}

/** A stderr error's listener: heard, so it never ends the process, and ignored. */
const ignored = (): void => {}
