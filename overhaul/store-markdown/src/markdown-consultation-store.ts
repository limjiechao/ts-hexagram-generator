import { Buffer } from 'node:buffer'
import { mkdir, readdir, readFile, unlink } from 'node:fs/promises'
import path from 'node:path'

import type { ConsultationStore } from '@hexagram/application/consultation-store'
import type { Consultation } from '@hexagram/consultation-journal/consultation'
import type { ConsultationId } from '@hexagram/consultation-journal/consultation-id'
import type { DeletionRecord } from '@hexagram/consultation-journal/deletion-record'
import {
  decodeDeletionRecord,
  decodeRecord,
  encodeDeletionRecord,
  encodeRecord,
} from '@hexagram/consultation-journal/record-codec'
import type { UnreadableFile } from '@hexagram/consultation-journal/unreadable-file'

import {
  createExclusively,
  hasCode,
  moveExclusively,
  replaceAtomically,
} from '#src/atomic-files.js'
import {
  composeFile,
  readFrontmatter,
  writeFrontmatter,
} from '#src/markdown-file.js'

/**
 * Renders the body of a Consultation's file: a Readout in Markdown, in the
 * default Reading Preference, so every file and every re-render has one
 * answer. The Store never reads a body back (ADR-0046).
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
   * is atomic and never overwrites a file; reading never writes (ADR-0046).
   * Only `.md` files directly in the folder are read, in the code-point
   * order of their file names: of two files holding one Consultation Id,
   * the later is the Unreadable `duplicate-id` and `get` returns the
   * earlier's Consultation. An Unreadable file's location is its file name.
   * Frontmatter is parsed with js-yaml's JSON or Core schema, never its
   * default schema. A missing folder reads as an empty Journal, and `keep`
   * creates it.
   *
   * Each Deletion Record is one file in the folder's `deleted/` folder,
   * named `<Consultation Id>.json`, holding the record's data as
   * `encodeDeletionRecord` gives it, written as JSON indented by two spaces
   * with a final newline: the form a Journal bundle holds it in. Its
   * contents, never its name, say which Consultation it names (ADR-0046).
   *
   * `remove` writes the Deletion Record's file first, atomically, then
   * deletes every `.md` file directly in the folder whose frontmatter
   * decodes to a Consultation with that Id, a `duplicate-id` file among
   * them. A Deletion Record's file is never overwritten. When the name
   * already holds a file that decodes to a Deletion Record for the same Id,
   * the earlier deletion stands and `remove` goes on to delete the files,
   * so a `remove` cut short is finished by running it again. When the name
   * holds a file that does not decode, or that names another Id, `remove`
   * rejects as a Store failure and touches nothing. It creates `deleted/`
   * when missing.
   *
   * `deletionRecords` reads every `.json` file directly in `deleted/`, in
   * the code-point order of their names; a missing `deleted/` holds none.
   * A file that does not decode as a Deletion Record rejects the Promise,
   * as the Journal that cannot be read, since leaving it out could let
   * Merging Journals bring a deleted Consultation back. `list` and `get` do
   * not read `deleted/`.
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
   * `legacy/` folder under its own name. It never overwrites a file there:
   * when the name is taken, it moves the file under the first free name
   * that adds a suffix and keeps the original name and extension. `file` is
   * any path the importer was given, inside the Journal's folder or not.
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
  const { journalFolder, renderBody } = options
  const deletedFolder = path.join(journalFolder, 'deleted')

  async function holdsAt(name: string, id: ConsultationId): Promise<boolean> {
    const bytes = await readFile(path.join(journalFolder, name))
    return loadFile(bytes).consultation?.id === id
  }

  const consultationStore: ConsultationStore = {
    keep: async (consultation) => {
      const journal = await readJournal(journalFolder)
      if (
        journal.loaded.some((file) => file.consultation.id === consultation.id)
      ) {
        return
      }
      const record = encodeRecord(consultation)
      const text = composeFile(
        writeFrontmatter(record),
        await renderBody(consultation),
      )
      const name = `${record.divinedAt.slice(0, 10)}--${record.id}.md`
      await mkdir(journalFolder, { recursive: true })
      // Losing a race to a keep of the same Consultation is keeping an Id
      // the Journal already holds, so it does nothing.
      if (
        !(await createExclusively(journalFolder, name, text)) &&
        !(await holdsAt(name, consultation.id))
      ) {
        throw new Error(
          `${name} is taken by a file that does not hold Consultation ${consultation.id}`,
        )
      }
    },
    list: async () => {
      const journal = await readJournal(journalFolder)
      return {
        consultations: journal.loaded.map((file) => file.consultation),
        unreadable: journal.unreadable,
      }
    },
    get: async (id) => {
      const journal = await readJournal(journalFolder)
      return journal.loaded.find((file) => file.consultation.id === id)
        ?.consultation
    },
    // A re-render that read the folder before a `remove` can put the
    // deleted file back by its rename; both run only by the owner's hand, so
    // it stays a known gap.
    remove: async (record) => {
      // The record comes first: a `remove` cut short then leaves files a
      // rerun deletes, never a deletion that Merging Journals could undo.
      await keepDeletionRecord(deletedFolder, record)
      for (const name of await namesHolding(
        journalFolder,
        record.consultationId,
      )) {
        await deleteListedFile(path.join(journalFolder, name))
      }
    },
    deletionRecords: async () => {
      const records: DeletionRecord[] = []
      for (const name of await fileNames(deletedFolder, '.json')) {
        const bytes = await readListedFile(path.join(deletedFolder, name))
        if (bytes === undefined) {
          continue
        }
        const deletionRecord = loadDeletionRecord(bytes)
        if (deletionRecord === undefined) {
          throw new Error(`deleted/${name} is not a Deletion Record`)
        }
        records.push(deletionRecord)
      }
      return records
    },
  }

  return {
    consultationStore,
    rerenderBodies: async () => {
      const journal = await readJournal(journalFolder)
      let rewritten = 0
      for (const file of journal.loaded) {
        const replaced = await replaceAtomically(
          journalFolder,
          file.name,
          async () =>
            composeFile(file.frontmatter, await renderBody(file.consultation)),
        )
        if (replaced) {
          rewritten += 1
        }
      }
      return { rewritten }
    },
    moveToLegacy: async (file) => {
      const legacyFolder = path.join(journalFolder, 'legacy')
      await mkdir(legacyFolder, { recursive: true })
      const { name, ext } = path.parse(file)
      await moveExclusively(file, legacyFolder, (attempt) =>
        attempt === 1 ? `${name}${ext}` : `${name}-${attempt}${ext}`,
      )
    },
  }
}

/** A file that loaded as a Consultation, with the frontmatter it was read from. */
interface LoadedFile {
  readonly name: string
  readonly frontmatter: string
  readonly consultation: Consultation
}

/**
 * Writes the Deletion Record's file unless its name holds one: an earlier
 * record for the same Id stands, and any other file there is a failure.
 */
async function keepDeletionRecord(
  deletedFolder: string,
  record: DeletionRecord,
): Promise<void> {
  const name = `${record.consultationId}.json`
  const text = `${JSON.stringify(encodeDeletionRecord(record), undefined, 2)}\n`
  await mkdir(deletedFolder, { recursive: true })
  if (await createExclusively(deletedFolder, name, text)) {
    return
  }
  const earlier = loadDeletionRecord(
    await readFile(path.join(deletedFolder, name)),
  )
  if (earlier?.consultationId !== record.consultationId) {
    throw new Error(
      `deleted/${name} is taken by a file that is not a Deletion Record for ${record.consultationId}`,
    )
  }
}

const strictUtf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })

/**
 * The Deletion Record a file's bytes hold, or undefined when they hold
 * none. The bytes are read as strict UTF-8, as the Store writes them: a
 * byte that is not UTF-8 anywhere in the file, or a byte order mark, makes
 * it no Deletion Record, rather than a record repaired on reading.
 */
function loadDeletionRecord(bytes: Buffer): DeletionRecord | undefined {
  let data: unknown
  try {
    // `ignoreBOM` keeps a byte order mark in the text, where JSON refuses it.
    data = JSON.parse(strictUtf8.decode(bytes))
  } catch {
    return undefined
  }
  const decoded = decodeDeletionRecord(data)
  return decoded.outcome === 'decoded' ? decoded.deletionRecord : undefined
}

/**
 * The names of every `.md` file directly in the folder that loads as the
 * Consultation with this Id: the first, and each `duplicate-id` file that
 * names it as its first location.
 */
async function namesHolding(
  folder: string,
  id: ConsultationId,
): Promise<string[]> {
  const journal = await readJournal(folder)
  const first = journal.loaded.find((file) => file.consultation.id === id)
  if (first === undefined) {
    return []
  }
  return [
    first.name,
    ...journal.unreadable
      .filter(
        ({ reason }) =>
          reason.kind === 'duplicate-id' && reason.firstLocation === first.name,
      )
      .map((file) => file.location),
  ]
}

/** Deletes a listed file; one already gone has left the Journal. */
async function deleteListedFile(file: string): Promise<void> {
  try {
    await unlink(file)
  } catch (error) {
    if (!hasCode(error, 'ENOENT')) {
      throw error
    }
  }
}

/** Reads every `.md` file directly in the folder, in file-name order. */
async function readJournal(folder: string): Promise<{
  readonly loaded: readonly LoadedFile[]
  readonly unreadable: readonly UnreadableFile[]
}> {
  const loaded: LoadedFile[] = []
  const unreadable: UnreadableFile[] = []
  const firstLocations = new Map<ConsultationId, string>()
  // One file at a time, so a large Journal never exhausts file handles.
  for (const name of await fileNames(folder, '.md')) {
    const bytes = await readListedFile(path.join(folder, name))
    if (bytes === undefined) {
      continue
    }
    const file = loadFile(bytes)
    if (file.consultation === undefined) {
      unreadable.push({ location: name, reason: file.reason })
      continue
    }
    const firstLocation = firstLocations.get(file.consultation.id)
    if (firstLocation !== undefined) {
      unreadable.push({
        location: name,
        reason: { kind: 'duplicate-id', firstLocation },
      })
      continue
    }
    firstLocations.set(file.consultation.id, name)
    loaded.push({ name, ...file })
  }
  return { loaded, unreadable }
}

/**
 * A listed file's bytes, or undefined when it was deleted after the folder
 * was read: it has left the Journal, so it is no Unreadable file either.
 *
 * A known gap, untested: on Windows a file another process holds open when
 * it is deleted may read as EPERM rather than ENOENT until it is released,
 * so `list` rejects meanwhile. Removing a temporary file is retried for a
 * like Windows reason; reading is not.
 */
async function readListedFile(file: string): Promise<Buffer | undefined> {
  try {
    return await readFile(file)
  } catch (error) {
    if (hasCode(error, 'ENOENT')) {
      return undefined
    }
    throw error
  }
}

function loadFile(bytes: Buffer):
  | { readonly consultation: Consultation; readonly frontmatter: string }
  | {
      readonly consultation?: undefined
      readonly reason: UnreadableFile['reason']
    } {
  const read = readFrontmatter(bytes)
  if (read.outcome === 'unreadable') {
    return { reason: read.reason }
  }
  const decoded = decodeRecord(read.record)
  if (decoded.outcome === 'unreadable') {
    return { reason: decoded.reason }
  }
  return { consultation: decoded.consultation, frontmatter: read.frontmatter }
}

/**
 * The names of the regular files directly in the folder that end in
 * `extension`, in code-point order; none when the folder is missing.
 */
async function fileNames(folder: string, extension: string): Promise<string[]> {
  try {
    const entries = await readdir(folder, { withFileTypes: true })
    return (
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
        .map((entry) => entry.name)
        // UTF-8 bytes sort in code-point order; UTF-16 code units do not.
        .toSorted((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)))
    )
  } catch (error) {
    if (hasCode(error, 'ENOENT')) {
      return []
    }
    throw error
  }
}
