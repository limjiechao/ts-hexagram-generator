import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

import type {
  CommandIo,
  CommandPorts,
  ExitCode,
} from '#src/commands/entry-point.js'
import type { CompilePdf } from '#src/typst-pdf.js'

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
  throw new Error('not built', { cause: { target } })
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
 *    `bundleUnwritableLine`'s wording on any other failure, each exit 1.
 * 5. `exportedConsultationsLine` on stdout, exit 0. A stdout failure after
 *    the file is written ends with the stdout line, exit 1, the file kept.
 *
 * The Journal is read before any file is created, so a run that cannot
 * read it never writes beside it. It never writes to the Store.
 */
export function exportRun(
  target: string,
  format: 'typst' | 'pdf',
  filter: string,
  preference: ReadingPreference,
  io: CommandIo,
  ports: CommandPorts,
  compilePdf: CompilePdf,
): Promise<ExitCode> {
  throw new Error('not built', {
    cause: { target, format, filter, preference, io, ports, compilePdf },
  })
}
