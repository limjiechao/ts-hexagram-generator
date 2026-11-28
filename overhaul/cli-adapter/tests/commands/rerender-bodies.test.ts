import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Clock } from '@hexagram/application/clock'
import type { ConsultationStore } from '@hexagram/application/consultation-store'
import type { RandomSource } from '@hexagram/application/random-source'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import { markdownConsultationStore } from '@hexagram/store-markdown/markdown-consultation-store'
import { afterEach, describe, expect, it } from 'vitest'

import type {
  CommandIo,
  CommandOutput,
  CommandPorts,
} from '#src/commands/entry-point.js'
import { run } from '#src/commands/hexagram-history.js'
import {
  journalFailureLine,
  rerenderedLine,
} from '#src/commands/maintenance-reports.js'
import { markdownBodyRenderer } from '#src/readout/markdown-body.js'

import { readoutCases } from '../support/readout-cases.js'

// `hexagram-history --rerender-bodies`, driven in process over a Journal in
// a fresh folder under the system's temporary directory, never the
// repository's own Journal: no spawned bin may reach a maintenance run.
// The Consultations are the Readout fixtures' invented cases, so a
// re-rendered file can be compared with the whole-file fixtures. Every
// Query, Id and date is invented.

const fixtureFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'markdown',
)

function markdownFixture(fileName: string): Promise<string> {
  return readFile(path.join(fixtureFolder, fileName), 'utf8')
}

function readoutCase(name: string) {
  const found = readoutCases.find((c) => c.name === name)
  if (found === undefined) throw new Error(`no Readout case ${name}`)
  return found.consultation
}

// Two Consultations with distinct Ids, and their files' names.
const several = readoutCase('cast-several-moving')
const severalFile = '2026-11-12--01M6E6AHA84T7V2M5N6P0R1S2K.md'
const day = readoutCase('recorded-day')
const dayFile = '2026-10-28--01M6E6AHA84T7V2M5N6P0R1S2N.md'

const folders: string[] = []

afterEach(async () => {
  await Promise.all(
    folders
      .splice(0)
      .map((folder) => rm(folder, { recursive: true, force: true })),
  )
})

async function temporaryFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), 'rerender-bodies-'))
  folders.push(folder)
  return folder
}

/** A stale body, as an older renderer might have written it. */
const staleBody = (id: string): string => `# An old body for ${id}\n`

/** A Journal whose files hold these Consultations under stale bodies. */
async function staleJournal(
  consultations: readonly (typeof several)[],
): Promise<string> {
  const journalFolder = path.join(await temporaryFolder(), 'journal')
  const stale = markdownConsultationStore({
    journalFolder,
    renderBody: (kept) => Promise.resolve(staleBody(kept.id)),
  })
  for (const consultation of consultations) {
    await stale.consultationStore.keep(consultation)
  }
  return journalFolder
}

async function snapshot(folder: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {}
  const names = await readdir(folder)
  for (const name of names.toSorted()) {
    files[name] = await readFile(path.join(folder, name), 'utf8')
  }
  return files
}

const unused = (): never => {
  throw new Error('--rerender-bodies used a port it needs not')
}

/**
 * The ports with the Markdown Store's `rerenderBodies` over the Journal
 * folder, its bodies rendered by the real renderer through `catalogue`;
 * every other port throws if used.
 */
function portsOver(
  journalFolder: string,
  catalogue: ScriptureCatalogue = bundledScriptureCatalogue,
): CommandPorts {
  const store = markdownConsultationStore({
    journalFolder,
    renderBody: markdownBodyRenderer({ scriptureCatalogue: catalogue }),
  })
  const scriptureCatalogue: ScriptureCatalogue = {
    passageTexts: unused,
    hexagramNames: unused,
    receivedSequenceNumber: unused,
    trigramNames: unused,
    editions: unused,
  }
  const consultationStore: ConsultationStore = {
    keep: unused,
    list: unused,
    get: unused,
    remove: unused,
    deletionRecords: unused,
  }
  const randomSource: RandomSource = { integerBelow: unused }
  const clock: Clock = { now: unused }
  return {
    scriptureCatalogue,
    randomSource,
    clock,
    consultationStore,
    journalFolder,
    moveToLegacy: unused,
    rerenderBodies: store.rerenderBodies,
  }
}

function fakeOutput(chunks: string[], isTTY: boolean): CommandOutput {
  return {
    isTTY,
    write: (chunk) => {
      chunks.push(chunk)
      return true
    },
    on: () => {},
    off: () => {},
  }
}

/** Runs `hexagram-history --rerender-bodies`, stdout a TTY or not. */
async function rerender(ports: CommandPorts, isTTY = false) {
  const stdout: string[] = []
  const stderr: string[] = []
  const io: CommandIo = {
    stdin: { isTTY, on: () => {}, off: () => {} },
    stdout: fakeOutput(stdout, isTTY),
    stderr: fakeOutput(stderr, isTTY),
    isTTY,
    rows: isTTY ? 40 : undefined,
    columns: isTTY ? 120 : undefined,
    env: {},
  }
  const exitCode = await run(['--rerender-bodies'], io, ports)
  return { exitCode, stdout: stdout.join(''), stderr: stderr.join('') }
}

const line = (text: string): string => `${text}\n`

describe('rerenderedLine', () => {
  it.each([
    [0, 'Re-rendered 0 bodies.'],
    [1, 'Re-rendered 1 body.'],
    [2, 'Re-rendered 2 bodies.'],
    [40, 'Re-rendered 40 bodies.'],
  ])('words %i as %s', (count, expected) => {
    expect(rerenderedLine(count)).toBe(expected)
  })
})

describe('hexagram-history --rerender-bodies over a temporary Journal', () => {
  it('rewrites every body with the real renderer and reports the count', async () => {
    const journalFolder = await staleJournal([several, day])
    const ended = await rerender(portsOver(journalFolder))
    expect(ended).toEqual({
      exitCode: 0,
      stdout: line('Re-rendered 2 bodies.'),
      stderr: '',
    })
    expect(await snapshot(journalFolder)).toEqual({
      [dayFile]: await markdownFixture('recorded-day.file.md'),
      [severalFile]: await markdownFixture('cast-several-moving.file.md'),
    })
  })

  it('takes the singular for one body, with stdout a TTY too', async () => {
    const journalFolder = await staleJournal([day])
    const ended = await rerender(portsOver(journalFolder), true)
    expect(ended).toEqual({
      exitCode: 0,
      stdout: line('Re-rendered 1 body.'),
      stderr: '',
    })
    expect(await snapshot(journalFolder)).toEqual({
      [dayFile]: await markdownFixture('recorded-day.file.md'),
    })
  })

  it('leaves the frontmatter bytes as they were, in whatever YAML form', async () => {
    const journalFolder = path.join(await temporaryFolder(), 'journal')
    await mkdir(journalFolder)
    // The record of recorded-day, in YAML the Store would not write: double
    // quotes and a comment. It loads all the same.
    const frontmatter = [
      '---',
      'schemaVersion: 2',
      'id: "01M6E6AHA84T7V2M5N6P0R1S2N"',
      'divinedAt: "2026-10-28"   # the day only',
      'query: "Will Steward Aelric’s embassy to Westmill succeed?"',
      'transformation: "777777"',
      '---',
      '',
    ].join('\n')
    await writeFile(
      path.join(journalFolder, dayFile),
      `${frontmatter}\n${staleBody(day.id)}`,
      'utf8',
    )
    const ended = await rerender(portsOver(journalFolder))
    expect(ended.stdout).toBe(line('Re-rendered 1 body.'))
    expect(ended.exitCode).toBe(0)
    expect(await snapshot(journalFolder)).toEqual({
      [dayFile]: `${frontmatter}\n${await markdownFixture('recorded-day.body.md')}`,
    })
  })

  it('skips an Unreadable file, leaves it whole and does not count it, exit 0', async () => {
    const journalFolder = await staleJournal([several])
    const unreadable = '---\nschemaVersion: 1\n---\n\nAn old body.\n'
    await writeFile(
      path.join(journalFolder, '2026-01-01--unreadable.md'),
      unreadable,
      'utf8',
    )
    const ended = await rerender(portsOver(journalFolder))
    expect(ended).toEqual({
      exitCode: 0,
      stdout: line('Re-rendered 1 body.'),
      stderr: '',
    })
    expect(await snapshot(journalFolder)).toEqual({
      '2026-01-01--unreadable.md': unreadable,
      [severalFile]: await markdownFixture('cast-several-moving.file.md'),
    })
  })

  it('reports none over a missing Journal folder and creates nothing', async () => {
    const root = await temporaryFolder()
    const journalFolder = path.join(root, 'journal')
    const ended = await rerender(portsOver(journalFolder))
    expect(ended).toEqual({
      exitCode: 0,
      stdout: line('Re-rendered 0 bodies.'),
      stderr: '',
    })
    expect(await readdir(root)).toEqual([])
  })

  it('a Store failure prints the Journal that cannot be written, exit 1', async () => {
    const journalFolder = await staleJournal([day])
    const ports: CommandPorts = {
      ...portsOver(journalFolder),
      rerenderBodies: () => Promise.reject(new Error('EACCES')),
    }
    const ended = await rerender(ports)
    expect(ended).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: line(journalFailureLine('written')),
    })
    expect(journalFailureLine('written')).toBe(
      'hexagram-history: the Journal cannot be written',
    )
  })

  it('a Catalogue failure in the renderer reads as a write failure, every file left whole', async () => {
    const journalFolder = await staleJournal([several, day])
    const before = await snapshot(journalFolder)
    const failing: ScriptureCatalogue = {
      ...bundledScriptureCatalogue,
      passageTexts: () => Promise.reject(new Error('the Catalogue failed')),
    }
    const ended = await rerender(portsOver(journalFolder, failing))
    expect(ended).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: line(journalFailureLine('written')),
    })
    expect(await snapshot(journalFolder)).toEqual(before)
  })
})
