import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Consultation } from '@hexagram/consultation-journal/consultation'
import { decodeRecord } from '@hexagram/consultation-journal/record-codec'

import type { RenderBody } from '#src/markdown-consultation-store.js'

// Every Query, Id and date below is invented. Each test works in a fresh
// folder under the system's temporary directory, never in a real Journal.

const madeFolders: string[] = []

/** A fresh, empty folder under the system's temporary directory. */
export async function temporaryFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), 'store-markdown-'))
  madeFolders.push(folder)
  return folder
}

/** Removes every folder `temporaryFolder` made; for `afterEach`. */
export async function removeTemporaryFolders(): Promise<void> {
  const folders = madeFolders.splice(0)
  await Promise.all(
    folders.map((folder) => rm(folder, { recursive: true, force: true })),
  )
}

/** The bytes of a fixture under `tests/fixtures/`. */
export function readFixture(name: string): Promise<string> {
  const fixtures = fileURLToPath(new URL('../fixtures/', import.meta.url))
  return readFile(path.join(fixtures, name), 'utf8')
}

/**
 * A body renderer for tests: its output names the Consultation and a
 * revision, so a test can tell which renderer wrote a body.
 */
export function fakeRenderBody(revision = 'first'): RenderBody {
  return (consultation) =>
    Promise.resolve(
      `# Readout of ${consultation.id}\n\nRendered by the ${revision} renderer.\n`,
    )
}

/** Loads a version-2 record literal as a Consultation, or fails the test. */
export function consultationOf(record: Record<string, unknown>): Consultation {
  const result = decodeRecord(record)
  if (result.outcome !== 'decoded') {
    throw new Error(`the record is unreadable: ${JSON.stringify(result)}`)
  }
  return result.consultation
}

// Line by Line, the Picks of an Old Yin 6, a Young Yang 7, a Young Yin 8, an
// Old Yang 9, a Young Yang 7 and an Old Yin 6, so the Transformation is
// `678976`.
const mixedPicks: readonly (readonly number[])[] = [
  [4, 3, 4],
  [4, 3, 1],
  [22, 1, 3],
  [47, 42, 37],
  [4, 3, 1],
  [4, 3, 4],
]

/** The record of `cast-moment.frontmatter.md`: a Cast Consultation. */
export function castRecord(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    id: '01M8AJDS3VQ4X7M2N5P9T0W1YC',
    divinedAt: '2026-11-26T08:00:00.123+08:00',
    query: 'Should the Greyfen granary open early?',
    transformation: '678976',
    casting: mixedPicks.map((line) => [...line]),
    divisionMethod: 'virtual',
  }
}

/** The record of `recorded-moment.frontmatter.md`. */
export function recordedMomentRecord(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    id: '01JE0A1B2C3D4E5F6G7H8J9K0M',
    divinedAt: '2026-10-28T19:45:30.000+08:00',
    query: 'Will the ferry at Ashmere run before the thaw?',
    transformation: '787878',
  }
}

/** The record of `recorded-day.frontmatter.md`. */
export function recordedDayRecord(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    id: '01JE0B7Q2W5X8Z3N6R9T1V4Y7C',
    divinedAt: '2026-10-28',
    query: "Will Steward Aelric's embassy to Westmill succeed?",
    transformation: '788888',
  }
}

/**
 * A Markdown file's text as a person might write it: frontmatter between
 * `---` lines, a blank line, then a body.
 */
export function fileText(frontmatter: string, body = 'A body.\n'): string {
  return `---\n${frontmatter}---\n\n${body}`
}

/** The YAML frontmatter of `castRecord`, written by hand. */
export function castFrontmatter(
  overrides: Readonly<Record<string, string>> = {},
): string {
  const lines: Record<string, string> = {
    schemaVersion: '2',
    id: '01M8AJDS3VQ4X7M2N5P9T0W1YC',
    divinedAt: "'2026-11-26T08:00:00.123+08:00'",
    query: 'Should the Greyfen granary open early?',
    transformation: "'678976'",
    casting:
      '[[4, 3, 4], [4, 3, 1], [22, 1, 3], [47, 42, 37], [4, 3, 1], [4, 3, 4]]',
    divisionMethod: 'virtual',
    ...overrides,
  }
  return Object.entries(lines)
    .filter(([, value]) => value !== '')
    .map(([key, value]) => `${key}: ${value}\n`)
    .join('')
}

/** Writes `text` to `name` in `folder`, creating nothing else. */
export async function plant(
  folder: string,
  name: string,
  text: string,
): Promise<void> {
  await writeFile(path.join(folder, name), text, 'utf8')
}

/** The names of the regular files directly in `folder`, in code-point order. */
export async function regularFiles(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .toSorted()
}

/** The names of the `.md` files directly in `folder`, in code-point order. */
export async function markdownFiles(folder: string): Promise<string[]> {
  const names = await regularFiles(folder)
  return names.filter((name) => name.endsWith('.md'))
}

/** Every regular file directly in `folder`, by name, with its bytes. */
export async function snapshot(
  folder: string,
): Promise<Record<string, string>> {
  const files: Record<string, string> = {}
  for (const name of await regularFiles(folder)) {
    files[name] = await readFile(path.join(folder, name), 'utf8')
  }
  return files
}

/** Consultations in Id order, for comparing lists whose order is not fixed. */
export function byId(
  consultations: readonly Consultation[],
): readonly Consultation[] {
  return consultations.toSorted((a, b) => (a.id < b.id ? -1 : 1))
}
