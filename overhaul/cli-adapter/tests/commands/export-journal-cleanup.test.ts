import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { Clock } from '@hexagram/application/clock'
import type { RandomSource } from '@hexagram/application/random-source'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import { encodeJournalBundle } from '@hexagram/consultation-journal/journal-bundle'
import { decodeRecord } from '@hexagram/consultation-journal/record-codec'
import { markdownConsultationStore } from '@hexagram/store-markdown/markdown-consultation-store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  CommandIo,
  CommandOutput,
  CommandPorts,
} from '#src/commands/entry-point.js'
import { run } from '#src/commands/hexagram-history.js'

// `--export-journal` when the bundle's temporary file cannot be removed after
// it is linked into place. That cannot be arranged on a real file system, so
// while `cleanup.failing` is set, removing any `.tmp` file is made to fail;
// the mock is kept to this file so the other bundle tests run unmocked.
// Every Id, Query and date below is invented.

const cleanup = vi.hoisted(() => ({ failing: false, refused: 0 }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  const refuses = (target: unknown): boolean =>
    cleanup.failing && String(target).endsWith('.tmp')
  const denied = (): Promise<never> => {
    cleanup.refused += 1
    return Promise.reject(
      Object.assign(new Error('EPERM: operation not permitted'), {
        code: 'EPERM',
      }),
    )
  }
  const rmMocked: typeof actual.rm = (target, options) =>
    refuses(target) ? denied() : actual.rm(target, options)
  const unlink: typeof actual.unlink = (target) =>
    refuses(target) ? denied() : actual.unlink(target)
  return {
    ...actual,
    default: { ...actual, rm: rmMocked, unlink },
    rm: rmMocked,
    unlink,
  }
})

const folders: string[] = []

afterEach(async () => {
  cleanup.failing = false
  cleanup.refused = 0
  await Promise.all(
    folders
      .splice(0)
      .map((folder) => rm(folder, { recursive: true, force: true })),
  )
})

async function temporaryFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), 'export-cleanup-'))
  folders.push(folder)
  return folder
}

const decoded = decodeRecord({
  schemaVersion: 2,
  id: '01JC0000000000000000000002',
  divinedAt: '2026-09-02T08:00:00.000-05:00',
  query: 'Will the mill at Westmill grind again?',
  transformation: '787878',
})
if (decoded.outcome !== 'decoded') throw new Error('the record is unreadable')
const consultation = decoded.consultation

const unused = (): never => {
  throw new Error('a Journal bundle run used a port it needs not')
}

function fakeOutput(chunks: string[]): CommandOutput {
  return {
    isTTY: false,
    write: (chunk) => {
      chunks.push(chunk)
      return true
    },
    on: () => {},
    off: () => {},
  }
}

describe('hexagram-history --export-journal when its temporary file cannot be removed', () => {
  it('still reports the bundle written, which is in place byte for byte', async () => {
    const journalFolder = path.join(await temporaryFolder(), 'journal')
    const { consultationStore } = markdownConsultationStore({
      journalFolder,
      renderBody: (kept) => Promise.resolve(`A stub body for ${kept.id}.\n`),
    })
    await consultationStore.keep(consultation)
    const bundles = await temporaryFolder()
    const file = path.join(bundles, 'journal.json')
    const scriptureCatalogue: ScriptureCatalogue = {
      passageTexts: unused,
      hexagramNames: unused,
      receivedSequenceNumber: unused,
      trigramNames: unused,
      editions: unused,
    }
    const randomSource: RandomSource = { integerBelow: unused }
    const clock: Clock = { now: unused }
    const ports: CommandPorts = {
      scriptureCatalogue,
      randomSource,
      clock,
      consultationStore,
      journalFolder,
      moveToLegacy: unused,
    }
    const stdout: string[] = []
    const stderr: string[] = []
    const io: CommandIo = {
      stdin: { isTTY: false, on: () => {}, off: () => {} },
      stdout: fakeOutput(stdout),
      stderr: fakeOutput(stderr),
      isTTY: false,
      rows: undefined,
      columns: undefined,
      env: {},
    }
    cleanup.failing = true

    const exitCode = await run(['--export-journal', file], io, ports)

    cleanup.failing = false
    expect(cleanup.refused).toBeGreaterThan(0)
    expect({
      exitCode,
      stdout: stdout.join(''),
      stderr: stderr.join(''),
    }).toEqual({
      exitCode: 0,
      stdout: `Exported 1 consultation and 0 deletion records to ${file}.\n`,
      stderr: '',
    })
    expect(await readFile(file, 'utf8')).toBe(
      encodeJournalBundle({
        consultations: [consultation],
        deletionRecords: [],
      }),
    )
    const written = await readdir(bundles)
    expect(written.filter((name) => !name.endsWith('.tmp'))).toEqual([
      'journal.json',
    ])
  })
})
