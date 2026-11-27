import { Buffer } from 'node:buffer'
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
import process from 'node:process'

import type { Clock } from '@hexagram/application/clock'
import type { RandomSource } from '@hexagram/application/random-source'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import type { Consultation } from '@hexagram/consultation-journal/consultation'
import type { DeletionRecord } from '@hexagram/consultation-journal/deletion-record'
import { encodeJournalBundle } from '@hexagram/consultation-journal/journal-bundle'
import {
  decodeDeletionRecord,
  decodeRecord,
  encodeDeletionRecord,
  encodeRecord,
} from '@hexagram/consultation-journal/record-codec'
import { markdownConsultationStore } from '@hexagram/store-markdown/markdown-consultation-store'
import { afterEach, describe, expect, it } from 'vitest'

import type {
  CommandIo,
  CommandOutput,
  CommandPorts,
} from '#src/commands/entry-point.js'
import { run } from '#src/commands/hexagram-history.js'

// `hexagram-history --export-journal` and `--merge-journal`, driven in
// process over real Journal folders in a temporary folder, never the
// repository's own Journal. Bodies come from a stub renderer and no
// assertion reads them: two folders are compared with each other, never
// with a body's bytes. Every Id, Query and date below is invented.

const folders: string[] = []

afterEach(async () => {
  await Promise.all(
    folders
      .splice(0)
      .map((folder) => rm(folder, { recursive: true, force: true })),
  )
})

async function temporaryFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), 'merge-journal-'))
  folders.push(folder)
  return folder
}

function consultationOf(id: string, divinedAt: string): Consultation {
  const decoded = decodeRecord({
    schemaVersion: 2,
    id,
    divinedAt,
    query: `Will the mill at Westmill grind again, by record ${id.slice(-4)}?`,
    transformation: '787878',
  })
  if (decoded.outcome !== 'decoded') throw new Error('the record is unreadable')
  return decoded.consultation
}

function deletionRecordOf(
  consultationId: string,
  deletedAt: string,
): DeletionRecord {
  const decoded = decodeDeletionRecord({ consultationId, deletedAt })
  if (decoded.outcome !== 'decoded') throw new Error('no Deletion Record')
  return decoded.deletionRecord
}

// Line by Line, the Picks of an Old Yin 6, a Young Yang 7, a Young Yin 8, an
// Old Yang 9, a Young Yang 7 and an Old Yin 6 (ADR-0023's tables).
const castDecoded = decodeRecord({
  schemaVersion: 2,
  id: '01JC0000000000000000000001',
  divinedAt: '2026-09-01T21:14:05.250+08:00',
  query: '格林芬堡的糧倉應在入冬前重建嗎？',
  transformation: '678976',
  casting: [
    [4, 3, 4],
    [4, 3, 1],
    [22, 1, 3],
    [47, 42, 37],
    [4, 3, 1],
    [4, 3, 4],
  ],
  divisionMethod: 'physical',
})
if (castDecoded.outcome !== 'decoded') throw new Error('the cast is unreadable')

/** Held by both Journals before any merge. */
const shared = castDecoded.consultation
/** Held only by the first Journal. */
const ownFirst = consultationOf(
  '01JC0000000000000000000002',
  '2026-09-02T08:00:00.000-05:00',
)
const ownSecond = consultationOf('01JC0000000000000000000003', '2026-09-03')
/** Held only by the second Journal. */
const otherFirst = consultationOf(
  '01JC0000000000000000000004',
  '2026-09-04T23:30:00.000+08:00',
)
const otherSecond = consultationOf('01JC0000000000000000000005', '2026-09-05')
/** Held by the first Journal, deleted in the second. */
const goneFromOther = [
  consultationOf('01JC0000000000000000000006', '2026-09-06'),
  consultationOf('01JC0000000000000000000007', '2026-09-07'),
] as const
/** Held by the second Journal, deleted in the first. */
const goneFromOwn = [
  consultationOf('01JC0000000000000000000008', '2026-09-08'),
  consultationOf('01JC0000000000000000000009', '2026-09-09'),
] as const

const deletedInOther = [
  deletionRecordOf(goneFromOther[0].id, '2026-11-20T08:30:00.000-05:00'),
  deletionRecordOf(goneFromOther[1].id, '2026-11-20T08:30:00.000-05:00'),
] as const
const deletedInOwn = [
  deletionRecordOf(goneFromOwn[0].id, '2026-11-27T09:15:00.000+08:00'),
  deletionRecordOf(goneFromOwn[1].id, '2026-11-27T09:15:00.000+08:00'),
] as const

function markdownStore(journalFolder: string) {
  return markdownConsultationStore({
    journalFolder,
    renderBody: (consultation) =>
      Promise.resolve(`A stub body for ${consultation.id}.\n`),
  })
}

/** Keeps each Consultation, then removes by each record, through the real Store. */
async function seed(
  journalFolder: string,
  consultations: readonly Consultation[],
  deletionRecords: readonly DeletionRecord[],
): Promise<void> {
  const { consultationStore } = markdownStore(journalFolder)
  for (const consultation of consultations) {
    await consultationStore.keep(consultation)
  }
  for (const record of deletionRecords) await consultationStore.remove(record)
}

/** The two Journals before any merge. */
async function seedBoth(): Promise<{ own: string; other: string }> {
  const root = await temporaryFolder()
  const own = path.join(root, 'own')
  const other = path.join(root, 'other')
  await seed(own, [shared, ownFirst, ownSecond, ...goneFromOther], deletedInOwn)
  await seed(
    other,
    [shared, otherFirst, otherSecond, ...goneFromOwn],
    deletedInOther,
  )
  return { own, other }
}

/** Every file under a folder, by its path from the folder, with its bytes. */
async function snapshot(folder: string): Promise<Record<string, string>> {
  const entries = await readdir(folder, {
    recursive: true,
    withFileTypes: true,
  })
  const files: Record<string, string> = {}
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const file = path.join(entry.parentPath, entry.name)
    files[path.relative(folder, file).split(path.sep).join('/')] =
      await readFile(file, 'latin1')
  }
  return files
}

function fileName(consultation: Consultation, date: string): string {
  return `${date}--${consultation.id}.md`
}

function recordName(record: DeletionRecord): string {
  return `deleted/${record.consultationId}.json`
}

/** A snapshot's Consultation files, without its Deletion Records. */
function consultationFiles(
  files: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(files).filter(([name]) => !name.startsWith('deleted/')),
  )
}

const unused = (): never => {
  throw new Error('a Journal bundle run used a port it needs not')
}

/** The ports over a real Markdown Store; nothing else may be used. */
function portsOver(journalFolder: string): CommandPorts {
  const scriptureCatalogue: ScriptureCatalogue = {
    passageTexts: unused,
    hexagramNames: unused,
    editions: unused,
  }
  const randomSource: RandomSource = { integerBelow: unused }
  const clock: Clock = { now: unused }
  return {
    scriptureCatalogue,
    randomSource,
    clock,
    consultationStore: markdownStore(journalFolder).consultationStore,
    journalFolder,
    moveToLegacy: unused,
  }
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

/** Runs `hexagram-history` with stdout not a TTY, as a script would. */
async function history(argv: readonly string[], journalFolder: string) {
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
  const exitCode = await run(argv, io, portsOver(journalFolder))
  return { exitCode, stdout: stdout.join(''), stderr: stderr.join('') }
}

/** A bundle's text, written as the bundle codec writes it. */
function bundleText(fields: {
  readonly consultations: readonly unknown[]
  readonly deletionRecords: readonly unknown[]
}): string {
  return `${JSON.stringify(
    {
      format: 'hexagram-journal',
      version: 1,
      consultations: fields.consultations,
      deletionRecords: fields.deletionRecords,
    },
    null,
    2,
  )}\n`
}

describe('hexagram-history --export-journal', () => {
  it('writes the Journal as a bundle and reports its counts', async () => {
    const { own } = await seedBoth()
    const file = path.join(await temporaryFolder(), 'journal.json')

    const result = await history(['--export-journal', file], own)

    expect(result).toEqual({
      exitCode: 0,
      stdout: `Exported 5 consultations and 2 deletion records to ${file}.\n`,
      stderr: '',
    })
    expect(await readFile(file, 'utf8')).toBe(
      encodeJournalBundle({
        consultations: [shared, ownFirst, ownSecond, ...goneFromOther],
        deletionRecords: deletedInOwn,
      }),
    )
  })

  it('takes the singular for a count of one', async () => {
    const journalFolder = path.join(await temporaryFolder(), 'journal')
    await seed(journalFolder, [ownFirst], [deletedInOwn[0]])
    const file = path.join(await temporaryFolder(), 'journal.json')

    const result = await history(['--export-journal', file], journalFolder)

    expect(result.stdout).toBe(
      `Exported 1 consultation and 1 deletion record to ${file}.\n`,
    )
  })

  it('exports a Journal folder that does not exist as an empty bundle, creating nothing in it', async () => {
    const journalFolder = path.join(await temporaryFolder(), 'journal')
    const file = path.join(await temporaryFolder(), 'journal.json')

    const result = await history(['--export-journal', file], journalFolder)

    expect(result).toEqual({
      exitCode: 0,
      stdout: `Exported 0 consultations and 0 deletion records to ${file}.\n`,
      stderr: '',
    })
    expect(await readFile(file, 'utf8')).toBe(
      encodeJournalBundle({ consultations: [], deletionRecords: [] }),
    )
    await expect(readdir(journalFolder)).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('leaves an Unreadable file out of the bundle', async () => {
    const journalFolder = path.join(await temporaryFolder(), 'journal')
    await seed(journalFolder, [ownFirst], [])
    await writeFile(
      path.join(journalFolder, '2026-09-10--01JC000000000000000000000A.md'),
      '---\nschemaVersion: 1\n---\n\nAn old body.\n',
    )
    const file = path.join(await temporaryFolder(), 'journal.json')

    const result = await history(['--export-journal', file], journalFolder)

    expect(result.stdout).toBe(
      `Exported 1 consultation and 0 deletion records to ${file}.\n`,
    )
    expect(await readFile(file, 'utf8')).toBe(
      encodeJournalBundle({ consultations: [ownFirst], deletionRecords: [] }),
    )
  })

  it('stops with exit 1 when the bundle cannot be written, writing nothing', async () => {
    const { own } = await seedBoth()
    const before = await snapshot(own)
    const parent = path.join(await temporaryFolder(), 'missing')
    const file = path.join(parent, 'journal.json')

    const result = await history(['--export-journal', file], own)

    expect(result).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: `hexagram-history: ${file} cannot be written\n`,
    })
    await expect(readdir(parent)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await snapshot(own)).toEqual(before)
  })

  it('refuses a path a file already holds, and leaves the file as it was', async () => {
    const { own } = await seedBoth()
    const file = path.join(await temporaryFolder(), 'journal.json')
    await writeFile(file, 'not to be written over\n')

    const result = await history(['--export-journal', file], own)

    expect(result).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: `hexagram-history: ${file} already exists\n`,
    })
    expect(await readFile(file, 'utf8')).toBe('not to be written over\n')
  })

  it('writes one Deletion Record, the earliest, for an Id the Journal holds two of', async () => {
    const journalFolder = path.join(await temporaryFolder(), 'journal')
    await seed(journalFolder, [ownFirst], [])
    const id = goneFromOwn[0].id
    const later = deletionRecordOf(id, '2026-11-27T09:15:00.000+08:00')
    const earlier = deletionRecordOf(id, '2026-11-20T08:30:00.000-05:00')
    const recordText = (record: DeletionRecord) =>
      `${JSON.stringify(encodeDeletionRecord(record), null, 2)}\n`
    await mkdir(path.join(journalFolder, 'deleted'))
    await writeFile(
      path.join(journalFolder, 'deleted', `${id}.json`),
      recordText(later),
    )
    await writeFile(
      path.join(journalFolder, 'deleted', 'copy.json'),
      recordText(earlier),
    )
    const file = path.join(await temporaryFolder(), 'journal.json')

    const result = await history(['--export-journal', file], journalFolder)

    expect(result).toEqual({
      exitCode: 0,
      stdout: `Exported 1 consultation and 1 deletion record to ${file}.\n`,
      stderr: '',
    })
    expect(await readFile(file, 'utf8')).toBe(
      encodeJournalBundle({
        consultations: [ownFirst],
        deletionRecords: [earlier],
      }),
    )
  })

  it('writes a relative path in the working folder and reports it as given', async () => {
    const { own } = await seedBoth()
    const working = await temporaryFolder()
    const before = process.cwd()
    process.chdir(working)
    try {
      const result = await history(['--export-journal', 'journal.json'], own)

      expect(result).toEqual({
        exitCode: 0,
        stdout:
          'Exported 5 consultations and 2 deletion records to journal.json.\n',
        stderr: '',
      })
    } finally {
      process.chdir(before)
    }
    expect(await readFile(path.join(working, 'journal.json'), 'utf8')).toBe(
      encodeJournalBundle({
        consultations: [shared, ownFirst, ownSecond, ...goneFromOther],
        deletionRecords: deletedInOwn,
      }),
    )
  })

  it('stops with exit 1 when the Journal cannot be read', async () => {
    const { own } = await seedBoth()
    await writeFile(path.join(own, 'deleted', 'stray.json'), 'not a record\n')
    const file = path.join(await temporaryFolder(), 'journal.json')

    const result = await history(['--export-journal', file], own)

    expect(result).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: 'hexagram-history: the Journal cannot be read\n',
    })
  })
})

describe('hexagram-history --merge-journal', () => {
  /** Exports `from`'s Journal and merges it into `into`, through the command. */
  async function mergeInto(from: string, into: string, file: string) {
    const exported = await history(['--export-journal', file], from)
    expect(exported.exitCode).toBe(0)
    return history(['--merge-journal', file], into)
  }

  it('merges two Journals both ways and twice, and both folders end identical', async () => {
    const { own, other } = await seedBoth()
    const bundles = await temporaryFolder()
    const file = (name: string) => path.join(bundles, name)

    // Round one: each side gains the other's own two and loses the two the
    // other deleted; what either side deleted is never brought back.
    expect(await mergeInto(own, other, file('own-1.json'))).toEqual({
      exitCode: 0,
      stdout: `Merged ${file('own-1.json')}: 2 added, 2 removed by Deletion Records, 0 left out.\n`,
      stderr: '',
    })
    expect(await mergeInto(other, own, file('other-1.json'))).toEqual({
      exitCode: 0,
      stdout: `Merged ${file('other-1.json')}: 2 added, 2 removed by Deletion Records, 0 left out.\n`,
      stderr: '',
    })

    const afterRoundOne = await snapshot(own)
    expect(await snapshot(other)).toEqual(afterRoundOne)
    expect(Object.keys(afterRoundOne).toSorted()).toEqual(
      [
        fileName(shared, '2026-09-01'),
        fileName(ownFirst, '2026-09-02'),
        fileName(ownSecond, '2026-09-03'),
        fileName(otherFirst, '2026-09-04'),
        fileName(otherSecond, '2026-09-05'),
        ...[...deletedInOther, ...deletedInOwn].map(recordName),
      ].toSorted(),
    )

    // Round two changes nothing and counts nothing.
    expect(await mergeInto(own, other, file('own-2.json'))).toEqual({
      exitCode: 0,
      stdout: `Merged ${file('own-2.json')}: 0 added, 0 removed by Deletion Records, 0 left out.\n`,
      stderr: '',
    })
    expect(await mergeInto(other, own, file('other-2.json'))).toEqual({
      exitCode: 0,
      stdout: `Merged ${file('other-2.json')}: 0 added, 0 removed by Deletion Records, 0 left out.\n`,
      stderr: '',
    })
    expect(await snapshot(own)).toEqual(afterRoundOne)
    expect(await snapshot(other)).toEqual(afterRoundOne)
    expect(await readFile(file('own-2.json'), 'latin1')).toBe(
      await readFile(file('other-2.json'), 'latin1'),
    )
  })

  it('ends with the same folders whichever side merges first', async () => {
    const first = await seedBoth()
    const second = await seedBoth()
    const bundles = await temporaryFolder()
    const file = (name: string) => path.join(bundles, name)

    await mergeInto(first.own, first.other, file('a.json'))
    await mergeInto(first.other, first.own, file('b.json'))
    await mergeInto(second.other, second.own, file('c.json'))
    await mergeInto(second.own, second.other, file('d.json'))

    const expected = await snapshot(first.own)
    expect(await snapshot(first.other)).toEqual(expected)
    expect(await snapshot(second.own)).toEqual(expected)
    expect(await snapshot(second.other)).toEqual(expected)
  })

  it('reports each Consultation it leaves out, in the bundle’s order, and merges the rest', async () => {
    const journalFolder = path.join(await temporaryFolder(), 'journal')
    const file = path.join(await temporaryFolder(), 'journal.json')
    await writeFile(
      file,
      bundleText({
        consultations: [
          encodeRecord(otherFirst),
          { ...encodeRecord(shared), transformation: '777777' },
          encodeRecord(otherSecond),
          encodeRecord(otherFirst),
        ],
        deletionRecords: [],
      }),
    )

    const result = await history(['--merge-journal', file], journalFolder)

    expect(result).toEqual({
      exitCode: 0,
      stdout: [
        'Left out consultations[1]: its Casting does not replay to its Transformation\n',
        'Left out consultations[3]: its Consultation Id is already held by consultations[0]\n',
        `Merged ${file}: 2 added, 0 removed by Deletion Records, 2 left out.\n`,
      ].join(''),
      stderr: '',
    })
    expect(Object.keys(await snapshot(journalFolder)).toSorted()).toEqual([
      fileName(otherFirst, '2026-09-04'),
      fileName(otherSecond, '2026-09-05'),
    ])
  })

  describe('refuses a bundle whole, merging nothing', () => {
    it.each([
      ['not JSON', 'a Journal, not JSON\n'],
      [
        'JSON but not a bundle',
        '{"format": "hexagram-history", "version": 1}\n',
      ],
      [
        'a bundle of another version',
        bundleText({ consultations: [], deletionRecords: [] }).replace(
          '"version": 1',
          '"version": 2',
        ),
      ],
    ])('%s', async (_case, text) => {
      const { own } = await seedBoth()
      const before = await snapshot(own)
      const file = path.join(await temporaryFolder(), 'journal.json')
      await writeFile(file, text)

      const result = await history(['--merge-journal', file], own)

      expect(result).toEqual({
        exitCode: 1,
        stdout: '',
        stderr: `hexagram-history: ${file} is not a Journal bundle\n`,
      })
      expect(await snapshot(own)).toEqual(before)
    })

    it('with a Deletion Record that cannot be read, naming it', async () => {
      const { own } = await seedBoth()
      const before = await snapshot(own)
      const file = path.join(await temporaryFolder(), 'journal.json')
      await writeFile(
        file,
        bundleText({
          consultations: [encodeRecord(otherFirst)],
          deletionRecords: [
            encodeDeletionRecord(deletedInOther[0]),
            encodeDeletionRecord(deletedInOther[1]),
            { consultationId: ownFirst.id, deletedAt: '2026-11-20' },
          ],
        }),
      )

      const result = await history(['--merge-journal', file], own)

      expect(result).toEqual({
        exitCode: 1,
        stdout: '',
        stderr: `hexagram-history: ${file} has a Deletion Record that cannot be read, deletionRecords[2]\n`,
      })
      expect(await snapshot(own)).toEqual(before)
    })
  })

  it('stops with exit 1 when the Journal cannot be read, keeping nothing', async () => {
    const journalFolder = path.join(await temporaryFolder(), 'journal')
    await mkdir(path.join(journalFolder, 'deleted'), { recursive: true })
    await writeFile(
      path.join(journalFolder, 'deleted', 'stray.json'),
      'not a record\n',
    )
    const file = path.join(await temporaryFolder(), 'journal.json')
    await writeFile(
      file,
      bundleText({
        consultations: [encodeRecord(otherFirst)],
        deletionRecords: [],
      }),
    )

    const result = await history(['--merge-journal', file], journalFolder)

    expect(result).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: 'hexagram-history: the Journal cannot be read\n',
    })
    expect(Object.keys(await snapshot(journalFolder))).toEqual([
      'deleted/stray.json',
    ])
  })

  it.each([
    ['a file that does not exist', (file: string) => Promise.resolve(file)],
    [
      'a directory',
      async (file: string) => {
        await mkdir(file)
        return file
      },
    ],
  ])(
    'refuses %s as a file that cannot be read, merging nothing',
    async (_case, place) => {
      const { own } = await seedBoth()
      const before = await snapshot(own)
      const file = await place(
        path.join(await temporaryFolder(), 'journal.json'),
      )

      const result = await history(['--merge-journal', file], own)

      expect(result).toEqual({
        exitCode: 1,
        stdout: '',
        stderr: `hexagram-history: ${file} cannot be read\n`,
      })
      expect(await snapshot(own)).toEqual(before)
    },
  )

  describe('refuses as not a Journal bundle, changing nothing', () => {
    const query = 'Will the mill at Westmill grind again?'
    const text = bundleText({
      consultations: [{ ...encodeRecord(otherFirst), query }],
      deletionRecords: [],
    })

    it.each([
      ['one opening with a byte order mark', Buffer.from(`﻿${text}`)],
      [
        'one with a byte that is not UTF-8 inside a Query',
        Buffer.concat(
          text
            .split('Westmill')
            .flatMap((part, at) =>
              at === 0
                ? [Buffer.from(part)]
                : [Buffer.from([0xff]), Buffer.from(part)],
            ),
        ),
      ],
    ])('%s', async (_case, bytes) => {
      const { own } = await seedBoth()
      const before = await snapshot(own)
      const file = path.join(await temporaryFolder(), 'journal.json')
      await writeFile(file, bytes)

      const result = await history(['--merge-journal', file], own)

      expect(result).toEqual({
        exitCode: 1,
        stdout: '',
        stderr: `hexagram-history: ${file} is not a Journal bundle\n`,
      })
      expect(await snapshot(own)).toEqual(before)
    })
  })

  it('after a double deletion, each side keeps its own Deletion Record and the Consultations agree', async () => {
    const root = await temporaryFolder()
    const own = path.join(root, 'own')
    const other = path.join(root, 'other')
    const [both] = goneFromOwn
    await seed(
      own,
      [shared, ownFirst, both],
      [deletionRecordOf(both.id, '2026-11-20T08:30:00.000-05:00')],
    )
    await seed(
      other,
      [shared, otherFirst, both],
      [deletionRecordOf(both.id, '2026-11-27T09:15:00.000+08:00')],
    )
    const ownBefore = await snapshot(own)
    const otherBefore = await snapshot(other)
    const ownRecordBytes = ownBefore[recordName(deletedInOwn[0])]
    const otherRecordBytes = otherBefore[recordName(deletedInOwn[0])]
    expect(ownRecordBytes).not.toBe(otherRecordBytes)
    const bundles = await temporaryFolder()
    const file = (name: string) => path.join(bundles, name)

    expect(await mergeInto(own, other, file('own-1.json'))).toMatchObject({
      stdout: `Merged ${file('own-1.json')}: 1 added, 0 removed by Deletion Records, 0 left out.\n`,
    })
    expect(await mergeInto(other, own, file('other-1.json'))).toMatchObject({
      stdout: `Merged ${file('other-1.json')}: 1 added, 0 removed by Deletion Records, 0 left out.\n`,
    })
    expect(await mergeInto(own, other, file('own-2.json'))).toMatchObject({
      stdout: `Merged ${file('own-2.json')}: 0 added, 0 removed by Deletion Records, 0 left out.\n`,
    })
    expect(await mergeInto(other, own, file('other-2.json'))).toMatchObject({
      stdout: `Merged ${file('other-2.json')}: 0 added, 0 removed by Deletion Records, 0 left out.\n`,
    })

    const ownFiles = await snapshot(own)
    const otherFiles = await snapshot(other)
    expect(consultationFiles(ownFiles)).toEqual(consultationFiles(otherFiles))
    expect(Object.keys(consultationFiles(ownFiles)).toSorted()).toEqual([
      fileName(shared, '2026-09-01'),
      fileName(ownFirst, '2026-09-02'),
      fileName(otherFirst, '2026-09-04'),
    ])
    expect(ownFiles[recordName(deletedInOwn[0])]).toBe(ownRecordBytes)
    expect(otherFiles[recordName(deletedInOwn[0])]).toBe(otherRecordBytes)
  })

  it('reads a bundle in any JSON layout and key order', async () => {
    const journalFolder = path.join(await temporaryFolder(), 'journal')
    const file = path.join(await temporaryFolder(), 'journal.json')
    await writeFile(
      file,
      JSON.stringify({
        deletionRecords: [encodeDeletionRecord(deletedInOwn[0])],
        consultations: [encodeRecord(ownFirst), encodeRecord(ownSecond)],
        version: 1,
        format: 'hexagram-journal',
      }),
    )

    const result = await history(['--merge-journal', file], journalFolder)

    expect(result.stdout).toBe(
      `Merged ${file}: 2 added, 0 removed by Deletion Records, 0 left out.\n`,
    )
    expect(Object.keys(await snapshot(journalFolder)).toSorted()).toEqual([
      fileName(ownFirst, '2026-09-02'),
      fileName(ownSecond, '2026-09-03'),
      recordName(deletedInOwn[0]),
    ])
  })
})
