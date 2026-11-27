import type { ConsultationStore } from '@hexagram/application/consultation-store'
import type { Consultation } from '@hexagram/consultation-journal/consultation'

/**
 * Renders the body of a Consultation's file: a Readout in Markdown, in the
 * default Reading Preference, so every file and every re-render has one
 * answer. The Store never reads a body back (ADR-0030).
 */
export type RenderBody = (consultation: Consultation) => Promise<string>

/**
 * The Markdown Consultation Store, and the maintenance only it offers,
 * which no other Consultation Store has and so the port leaves out.
 */
export interface MarkdownConsultationStore {
  /**
   * The port. Each Consultation is one file in the Journal's folder, named
   * `<divined date>--<Consultation Id>.md`, its YAML frontmatter the
   * version-2 record and its body rendered when the file is written. A write
   * is atomic and never overwrites a file; reading never writes (ADR-0030).
   * Only `.md` files directly in the folder are read; an Unreadable file's
   * location is its file name.
   */
  readonly consultationStore: ConsultationStore
  /**
   * Rewrites the body of every file that loads, each atomically, leaving
   * its frontmatter's bytes untouched and skipping every Unreadable file.
   * It resolves to how many files it rewrote; a failure rejects the Promise
   * and leaves each file whole.
   */
  readonly rerenderBodies: () => Promise<{ readonly rewritten: number }>
  /**
   * Moves an imported original, legacy or version 1, into the folder's
   * `legacy/` folder under its own name, never overwriting a file there.
   * `file` is a path the importer was given.
   */
  readonly moveToLegacy: (file: string) => Promise<void>
}

/**
 * Builds the Markdown Consultation Store over the Journal's folder, which
 * the caller locates (ADR-0020), with the renderer every body is written
 * by. It touches no file until it is used.
 */
export function markdownConsultationStore(options: {
  readonly journalFolder: string
  readonly renderBody: RenderBody
}): MarkdownConsultationStore {
  throw new Error('not built', { cause: options })
}
