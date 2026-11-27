import { randomInt } from 'node:crypto'
import {
  copyFile,
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
import { fileURLToPath } from 'node:url'

import { beginCasting } from '@hexagram/application/begin-casting'
import type { Clock } from '@hexagram/application/clock'
import type { ConsultationStore } from '@hexagram/application/consultation-store'
import { divide } from '@hexagram/application/divide'
import type { RandomSource } from '@hexagram/application/random-source'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import type { Consultation } from '@hexagram/consultation-journal/consultation'
import {
  isUtcOffset,
  type Moment,
} from '@hexagram/consultation-journal/divined-at'
import type { DivisionMethod } from '@hexagram/consultation-journal/division-method'
import { decodeRecord } from '@hexagram/consultation-journal/record-codec'
import type { CompleteCasting } from '@hexagram/oracle/casting'
import type { Transformation } from '@hexagram/oracle/transformation'
import { markdownConsultationStore } from '@hexagram/store-markdown/markdown-consultation-store'
import { afterEach, describe, expect, it } from 'vitest'

import type {
  CommandIo,
  CommandOutput,
  CommandPorts,
} from '#src/commands/entry-point.js'
import { run } from '#src/commands/hexagram-history.js'

// `hexagram-history --import-legacy`, driven in process over real Journal
// folders in a temporary folder, never the repository's own Journal. The
// legacy `.txt` files are the legacy importer's fixtures, from the fictional
// legacy corpus; the version-1 files are written here by hand. Bodies come
// from a stub renderer and no assertion reads them. Every Query and date
// below is invented.

const fixtures = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../legacy-import/tests/fixtures',
)

const folders: string[] = []

afterEach(async () => {
  await Promise.all(
    folders
      .splice(0)
      .map((folder) => rm(folder, { recursive: true, force: true })),
  )
})

async function temporaryFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), 'import-legacy-'))
  folders.push(folder)
  return folder
}

/** A Journal folder and a folder of old files beside it, both empty. */
async function workspace(): Promise<{
  readonly root: string
  readonly journal: string
  readonly old: string
}> {
  const root = await temporaryFolder()
  const journal = path.join(root, 'journal')
  const old = path.join(root, 'old')
  await mkdir(journal)
  await mkdir(old)
  return { root, journal, old }
}

/** Copies a legacy fixture into a folder under a name, and gives its path. */
async function place(
  fixtureName: string,
  folder: string,
  name: string,
): Promise<string> {
  const file = path.join(folder, name)
  await copyFile(path.join(fixtures, fixtureName), file)
  return file
}

function fixtureText(fixtureName: string): Promise<string> {
  return readFile(path.join(fixtures, fixtureName), 'utf8')
}

function moment(text: string): Moment {
  const offset = text.slice(-6)
  if (!isUtcOffset(offset)) throw new Error(`the offset ${offset} is malformed`)
  return { precision: 'moment', epochMilliseconds: Date.parse(text), offset }
}

/** Divides by each Pick in turn, from the Empty Casting to a complete one. */
function castByPicks(picks: readonly number[]): CompleteCasting {
  let casting = beginCasting()
  for (const pick of picks) {
    const result = divide(casting, pick)
    if (result.outcome !== 'divided') {
      throw new Error(`refused: ${JSON.stringify(result.refusal)}`)
    }
    if (result.casting.state === 'complete') return result.casting
    casting = result.casting
  }
  throw new Error('the Picks did not complete the Casting')
}

// The Picks of the HEAP and SPLIT fixtures, Line 1 first.
const heapCasting = castByPicks([
  25, 20, 9, 25, 16, 14, 20, 20, 17, 23, 19, 17, 16, 19, 19, 22, 24, 19,
])
const splitCasting = castByPicks([
  5, 35, 4, 40, 30, 9, 45, 42, 27, 17, 20, 20, 38, 4, 34, 37, 3, 17,
])

const heapQuery =
  'Will I find a worthy post once my studies at Greyfen Hold are complete?'
const splitQuery =
  "Is the Greyfen Primer truly beneficial for young Wren's lessons?"
const oldestQuery =
  'I will accept the post at Westmill Atelier under Steward Aelric. How will this unfold?'
const unreplayableQuery =
  'How should I navigate the year of many changes ahead?'
const shapeBQuery = 'What will it be like?'

/**
 * A version-1 file's text with the heap fixture's Casting, or with
 * `castingAbsence` in its place; `recordedMax` of Line 6's second Round can
 * be changed to disagree with the replay.
 */
function version1Text(fields: {
  readonly schemaVersion?: number
  readonly timestamp: string
  readonly query: string
  readonly withCasting: boolean
  readonly line6SecondRecordedMax?: number
}): string {
  // Line 1 first: `[pick, recordedMax]` for each Round.
  const casting = [
    [
      [25, 48],
      [20, 43],
      [9, 35],
    ],
    [
      [25, 48],
      [16, 43],
      [14, 35],
    ],
    [
      [20, 48],
      [20, 39],
      [17, 31],
    ],
    [
      [23, 48],
      [19, 43],
      [17, 35],
    ],
    [
      [16, 48],
      [19, 39],
      [19, 31],
    ],
    [
      [22, 48],
      [24, fields.line6SecondRecordedMax ?? 43],
      [19, 35],
    ],
  ]
  const hexagram = [8, 8, 7, 8, 6, 7]
  const lines = [
    `schemaVersion: ${String(fields.schemaVersion ?? 1)}`,
    `timestamp: '${fields.timestamp}'`,
    `query: ${fields.query}`,
    'hexagram:',
    ...[6, 5, 4, 3, 2, 1].map(
      (position) => `  L${String(position)}: ${String(hexagram[position - 1])}`,
    ),
  ]
  if (fields.withCasting) {
    lines.push('casting:')
    for (const position of [6, 5, 4, 3, 2, 1]) {
      lines.push(`  L${String(position)}:`)
      for (const [pick, recordedMax] of casting[position - 1] ?? []) {
        lines.push(
          `    - pick: ${String(pick)}`,
          `      recordedMax: ${String(recordedMax)}`,
        )
      }
    }
  } else {
    lines.push('castingAbsence: legacy-no-table')
  }
  return `---\n${lines.join('\n')}\n---\n\nAn old rendered body, never read.\n`
}

function markdownStore(journalFolder: string) {
  return markdownConsultationStore({
    journalFolder,
    renderBody: (consultation) =>
      Promise.resolve(`A stub body for ${consultation.id}.\n`),
  })
}

const unused = (): never => {
  throw new Error('an import used a port it needs not')
}

/** The Clock every import reads: the instant the Ids are built from. */
const importedAt = moment('2026-11-27T10:00:00.000+08:00')

/**
 * The ports over a real Markdown Store, with a fixed Clock and a real
 * Random Source; `keep` can be replaced to make the Store fail.
 */
function portsOver(
  journalFolder: string,
  options: { readonly keep?: ConsultationStore['keep'] } = {},
): CommandPorts {
  const store = markdownStore(journalFolder)
  const scriptureCatalogue: ScriptureCatalogue = {
    passageTexts: unused,
    hexagramNames: unused,
    editions: unused,
  }
  const randomSource: RandomSource = {
    integerBelow: (bound) => randomInt(bound),
  }
  const clock: Clock = { now: () => importedAt }
  return {
    scriptureCatalogue,
    randomSource,
    clock,
    consultationStore: {
      ...store.consultationStore,
      ...(options.keep === undefined ? {} : { keep: options.keep }),
    },
    journalFolder,
    moveToLegacy: store.moveToLegacy,
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
async function history(argv: readonly string[], ports: CommandPorts) {
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
  const exitCode = await run(argv, io, ports)
  return { exitCode, stdout: stdout.join(''), stderr: stderr.join('') }
}

/** The Consultations a Journal folder holds, read back through a fresh Store. */
async function held(journalFolder: string): Promise<readonly Consultation[]> {
  const { consultations } =
    await markdownStore(journalFolder).consultationStore.list()
  return consultations
}

/** The one Consultation of a Query a Journal folder holds. */
async function heldOf(
  journalFolder: string,
  query: string,
): Promise<Consultation> {
  const consultations = await held(journalFolder)
  const matching = consultations.filter(
    (consultation) => consultation.query === query,
  )
  if (matching.length !== 1 || matching[0] === undefined) {
    throw new Error(`the Journal holds ${String(matching.length)} of ${query}`)
  }
  return matching[0]
}

/** A Consultation less its Id, which the import draws at random. */
function withoutId(consultation: Consultation) {
  return { ...consultation, id: undefined }
}

/** The names directly in a folder, files only, sorted. */
async function fileNames(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .toSorted()
}

/** A report's lines, without its last newline. */
function linesOf(stdout: string): string[] {
  expect(stdout.endsWith('\n')).toBe(true)
  return stdout.slice(0, -1).split('\n')
}

const castLine = (file: string, id: string) =>
  `Kept ${file} as a Cast Consultation, ${id}`
const noCastingLine = (file: string, id: string) =>
  `Kept ${file} as a Recorded Consultation, ${id}: the file holds no Casting`
const doesNotReplayLine = (file: string, id: string) =>
  `Kept ${file} as a Recorded Consultation, ${id}: its Casting does not replay to its Transformation`
const skipped = (file: string, reason: string) => `Skipped ${file}: ${reason}`

function summary(counts: {
  readonly files: string
  readonly cast: number
  readonly recorded: number
  readonly skipped: number
}): string {
  return `Imported ${String(counts.cast + counts.recorded)} of ${counts.files} (${String(counts.cast)} cast, ${String(counts.recorded)} recorded); ${String(counts.skipped)} skipped. Originals moved to legacy/ in the Journal folder.`
}

describe('hexagram-history --import-legacy <folder>', () => {
  const names = {
    heap: 'consultation-2026-05-19T11-08-42+0800.txt',
    split: 'consultation-2026-05-20T08-15-00+0800.txt',
    oldest: 'consultation-2026-03-16T13-28-33+0800.txt',
    unreplayable: 'consultation-2026-04-01T21-00-00-0500.txt',
    placeholder: 'consultation-2026-04-02T07-30-00+0800.txt',
    noDivinedAt: 'reading-from-the-old-notebook.txt',
    badLineValues: 'consultation-2026-04-03T10-00-00+0800.txt',
  }

  async function importOldFolder(divisionMethod: DivisionMethod = 'physical') {
    const { journal, old } = await workspace()
    await place('legacy-real-heap-casting.txt', old, names.heap)
    await place('legacy-real-split-casting.txt', old, names.split)
    await place('legacy-real-oldest-no-casting.txt', old, names.oldest)
    await place('legacy-heap-multi-moving.txt', old, names.unreplayable)
    await place('legacy-placeholder-query.txt', old, names.placeholder)
    await place('legacy-shape-b.txt', old, names.noDivinedAt)
    await place('legacy-bad-line-values.txt', old, names.badLineValues)
    const result = await history(
      ['--import-legacy', old, '--division-method', divisionMethod],
      portsOver(journal),
    )
    return { journal, old, result }
  }

  it('prints one line per file, kept or skipped with the reason, then the summary, and exits 0', async () => {
    const { journal, old, result } = await importOldFolder()
    const at = (name: string) => path.join(old, name)
    const idOf = async (query: string) => {
      const consultation = await heldOf(journal, query)
      return consultation.id
    }

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
    const lines = linesOf(result.stdout)
    expect(lines.at(-1)).toBe(
      summary({ files: '7 files', cast: 2, recorded: 2, skipped: 3 }),
    )
    expect(lines.slice(0, -1).toSorted()).toEqual(
      [
        castLine(at(names.heap), await idOf(heapQuery)),
        castLine(at(names.split), await idOf(splitQuery)),
        noCastingLine(at(names.oldest), await idOf(oldestQuery)),
        doesNotReplayLine(
          at(names.unreplayable),
          await idOf(unreplayableQuery),
        ),
        skipped(at(names.placeholder), 'it gives no Query'),
        skipped(at(names.noDivinedAt), 'it gives no valid Divined At'),
        skipped(at(names.badLineValues), 'it gives no valid Transformation'),
      ].toSorted(),
    )
  })

  it('keeps each replaying file as a Cast Consultation with the run’s Division Method, and the others as Recorded Consultations', async () => {
    const { journal } = await importOldFolder('virtual')

    expect(await held(journal)).toHaveLength(4)
    expect(withoutId(await heldOf(journal, heapQuery))).toEqual({
      origin: 'cast',
      query: heapQuery,
      divinedAt: moment('2026-05-19T11:08:42+08:00'),
      transformation: heapCasting.transformation,
      casting: heapCasting,
      divisionMethod: 'virtual',
    })
    expect(withoutId(await heldOf(journal, splitQuery))).toEqual({
      origin: 'cast',
      query: splitQuery,
      divinedAt: moment('2026-05-20T08:15:00+08:00'),
      transformation: splitCasting.transformation,
      casting: splitCasting,
      divisionMethod: 'virtual',
    })
    expect(withoutId(await heldOf(journal, oldestQuery))).toEqual({
      origin: 'recorded',
      query: oldestQuery,
      divinedAt: moment('2026-03-16T13:28:33+08:00'),
      transformation: [8, 7, 8, 8, 9, 7] satisfies Transformation,
    })
    expect(withoutId(await heldOf(journal, unreplayableQuery))).toEqual({
      origin: 'recorded',
      query: unreplayableQuery,
      divinedAt: moment('2026-04-01T21:00:00-05:00'),
      transformation: [6, 9, 9, 9, 9, 8] satisfies Transformation,
    })
  })

  it('moves each kept file’s original, byte for byte, into legacy/ in the Journal folder, and leaves each skipped file where it is', async () => {
    const { journal, old } = await importOldFolder()

    expect(await fileNames(path.join(journal, 'legacy'))).toEqual(
      [names.heap, names.split, names.oldest, names.unreplayable].toSorted(),
    )
    expect(await fileNames(old)).toEqual(
      [names.placeholder, names.noDivinedAt, names.badLineValues].toSorted(),
    )
    expect(
      await readFile(path.join(journal, 'legacy', names.heap), 'utf8'),
    ).toBe(await fixtureText('legacy-real-heap-casting.txt'))
    expect(
      await readFile(path.join(journal, 'legacy', names.unreplayable), 'utf8'),
    ).toBe(await fixtureText('legacy-heap-multi-moving.txt'))
    expect(await readFile(path.join(old, names.placeholder), 'utf8')).toBe(
      await fixtureText('legacy-placeholder-query.txt'),
    )
  })

  it.each(['physical', 'virtual', 'automatic'] as const)(
    'gives an imported Cast Consultation the Division Method %s',
    async (divisionMethod) => {
      const { journal } = await importOldFolder(divisionMethod)

      const cast = await heldOf(journal, heapQuery)
      expect(cast.origin === 'cast' && cast.divisionMethod).toBe(divisionMethod)
    },
  )

  it('reads only the regular .txt and .md files directly in the folder, matched case-sensitively', async () => {
    const { journal, old } = await workspace()
    await place('legacy-shape-b.txt', old, names.oldest)
    await place(
      'legacy-real-heap-casting.txt',
      old,
      names.heap.replace('.txt', '.TXT'),
    )
    await place('legacy-real-heap-casting.txt', old, 'notes.json')
    await mkdir(path.join(old, 'inner'))
    await place(
      'legacy-real-split-casting.txt',
      path.join(old, 'inner'),
      names.split,
    )

    const result = await history(
      ['--import-legacy', old, '--division-method', 'physical'],
      portsOver(journal),
    )

    const kept = await heldOf(journal, shapeBQuery)
    expect(result).toEqual({
      exitCode: 0,
      stdout: `${noCastingLine(path.join(old, names.oldest), kept.id)}\n${summary({ files: '1 file', cast: 0, recorded: 1, skipped: 0 })}\n`,
      stderr: '',
    })
    expect(await held(journal)).toHaveLength(1)
    expect(await fileNames(old)).toEqual(
      [names.heap.replace('.txt', '.TXT'), 'notes.json'].toSorted(),
    )
    expect(await fileNames(path.join(old, 'inner'))).toEqual([names.split])
  })

  it('reports an empty folder with every count zero', async () => {
    const { journal, old } = await workspace()

    const result = await history(
      ['--import-legacy', old, '--division-method', 'physical'],
      portsOver(journal),
    )

    expect(result).toEqual({
      exitCode: 0,
      stdout: `${summary({ files: '0 files', cast: 0, recorded: 0, skipped: 0 })}\n`,
      stderr: '',
    })
    expect(await held(journal)).toEqual([])
  })
})

describe('hexagram-history --import-legacy <file>…', () => {
  const heapName = 'consultation-2026-05-19T11-08-42+0800.txt'

  it('imports one file, printing its line and a summary in the singular', async () => {
    const { journal, old } = await workspace()
    const file = await place('legacy-real-heap-casting.txt', old, heapName)

    const result = await history(
      ['--import-legacy', file, '--division-method', 'automatic'],
      portsOver(journal),
    )

    const kept = await heldOf(journal, heapQuery)
    expect(result).toEqual({
      exitCode: 0,
      stdout: `${castLine(file, kept.id)}\n${summary({ files: '1 file', cast: 1, recorded: 0, skipped: 0 })}\n`,
      stderr: '',
    })
    expect(kept.origin === 'cast' && kept.divisionMethod).toBe('automatic')
    expect(await fileNames(old)).toEqual([])
    expect(await fileNames(path.join(journal, 'legacy'))).toEqual([heapName])
  })

  it('names a relative path as the user gave it, read against the working folder', async () => {
    const { root, journal, old } = await workspace()
    await place('legacy-shape-b.txt', old, heapName)
    const given = `old/${heapName}`
    const before = process.cwd()
    process.chdir(root)
    try {
      const result = await history(
        ['--import-legacy', given, '--division-method', 'physical'],
        portsOver(journal),
      )

      const kept = await heldOf(journal, shapeBQuery)
      expect(result).toEqual({
        exitCode: 0,
        stdout: `${noCastingLine(given, kept.id)}\n${summary({ files: '1 file', cast: 0, recorded: 1, skipped: 0 })}\n`,
        stderr: '',
      })
    } finally {
      process.chdir(before)
    }
    expect(await fileNames(path.join(journal, 'legacy'))).toEqual([heapName])
  })

  it('takes files and folders together', async () => {
    const { root, journal, old } = await workspace()
    const file = await place('legacy-real-heap-casting.txt', old, heapName)
    const other = path.join(root, 'other')
    await mkdir(other)
    const shapeBName = 'consultation-2026-03-16T13-28-33+0800.txt'
    await place('legacy-shape-b.txt', other, shapeBName)

    const result = await history(
      ['--import-legacy', file, other, '--division-method', 'physical'],
      portsOver(journal),
    )

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
    const heap = await heldOf(journal, heapQuery)
    const shapeB = await heldOf(journal, shapeBQuery)
    const lines = linesOf(result.stdout)
    expect(lines.at(-1)).toBe(
      summary({ files: '2 files', cast: 1, recorded: 1, skipped: 0 }),
    )
    expect(lines.slice(0, -1).toSorted()).toEqual(
      [
        castLine(file, heap.id),
        noCastingLine(path.join(other, shapeBName), shapeB.id),
      ].toSorted(),
    )
  })

  it.skipIf(process.platform === 'win32')(
    'skips a named path that is not a regular file, as not a regular file',
    async () => {
      const { journal } = await workspace()

      const result = await history(
        ['--import-legacy', '/dev/null', '--division-method', 'physical'],
        portsOver(journal),
      )

      expect(result).toEqual({
        exitCode: 0,
        stdout: `${skipped('/dev/null', 'it is not a regular file')}\n${summary({ files: '1 file', cast: 0, recorded: 0, skipped: 1 })}\n`,
        stderr: '',
      })
      expect(await held(journal)).toEqual([])
    },
  )

  it('keeps the same file twice when it is imported twice, its second original moved under a free suffixed name', async () => {
    const { journal, old } = await workspace()
    const file = await place('legacy-real-heap-casting.txt', old, heapName)
    const firstRun = await history(
      ['--import-legacy', file, '--division-method', 'physical'],
      portsOver(journal),
    )
    await place('legacy-real-heap-casting.txt', old, heapName)

    const secondRun = await history(
      ['--import-legacy', file, '--division-method', 'physical'],
      portsOver(journal),
    )

    expect(firstRun.exitCode).toBe(0)
    expect(secondRun.exitCode).toBe(0)
    expect(secondRun.stderr).toBe('')
    const consultations = await held(journal)
    const both = consultations.filter(
      (consultation) => consultation.query === heapQuery,
    )
    expect(both).toHaveLength(2)
    expect(both[0]?.id).not.toBe(both[1]?.id)
    expect({ ...both[0], id: undefined }).toEqual({ ...both[1], id: undefined })
    const legacy = await fileNames(path.join(journal, 'legacy'))
    expect(legacy).toHaveLength(2)
    expect(legacy).toContain(heapName)
    const suffixed = legacy.find((name) => name !== heapName) ?? ''
    expect(suffixed.startsWith(heapName.slice(0, -'.txt'.length))).toBe(true)
    expect(suffixed.endsWith('.txt')).toBe(true)
    const text = await fixtureText('legacy-real-heap-casting.txt')
    for (const name of legacy) {
      expect(await readFile(path.join(journal, 'legacy', name), 'utf8')).toBe(
        text,
      )
    }
  })

  it('stops at a Store failure partway, after printing the lines of the files already kept, with exit 1 and no summary', async () => {
    const { journal, old } = await workspace()
    const files = [
      await place('legacy-real-heap-casting.txt', old, heapName),
      await place(
        'legacy-real-split-casting.txt',
        old,
        'consultation-2026-05-20T08-15-00+0800.txt',
      ),
      await place(
        'legacy-shape-b.txt',
        old,
        'consultation-2026-03-16T13-28-33+0800.txt',
      ),
    ]
    const store = markdownStore(journal).consultationStore
    let keeps = 0
    const keep: ConsultationStore['keep'] = (consultation) => {
      keeps += 1
      return keeps === 2
        ? Promise.reject(new Error('the disk is full'))
        : store.keep(consultation)
    }

    const result = await history(
      ['--import-legacy', ...files, '--division-method', 'physical'],
      portsOver(journal, { keep }),
    )

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe(
      'hexagram-history: the Journal cannot be written\n',
    )
    const [kept, ...others] = await held(journal)
    expect(kept).toBeDefined()
    expect(others).toEqual([])
    const lines = linesOf(result.stdout)
    expect(lines).toHaveLength(1)
    const keptFile = files.find(
      (file) =>
        lines[0] === castLine(file, kept?.id ?? '') ||
        lines[0] === noCastingLine(file, kept?.id ?? ''),
    )
    expect(keptFile).toBeDefined()
    expect(await fileNames(path.join(journal, 'legacy'))).toEqual([
      path.basename(keptFile ?? ''),
    ])
    expect(await fileNames(old)).toEqual(
      files
        .filter((file) => file !== keptFile)
        .map((file) => path.basename(file))
        .toSorted(),
    )
  })
})

describe('hexagram-history --import-legacy of version-1 files', () => {
  it('keeps a version-1 Casting that replays as a Cast Consultation, and one with a disagreeing stalk count as a Recorded one', async () => {
    const { journal, old } = await workspace()
    const castName = 'consultation-2026-05-19T14-23-11+0800.md'
    const disagreeName = 'consultation-2026-05-21T09-00-00+0800.md'
    await writeFile(
      path.join(old, castName),
      version1Text({
        timestamp: '2026-05-19T14:23:11+0800',
        query: 'Will the bridge at Greyfen Hold stand through the thaw?',
        withCasting: true,
      }),
    )
    await writeFile(
      path.join(old, disagreeName),
      version1Text({
        timestamp: '2026-05-21T09:00:00+0800',
        query: 'Will the ferry at Westmill run through the spring floods?',
        withCasting: true,
        line6SecondRecordedMax: 39,
      }),
    )

    const result = await history(
      ['--import-legacy', old, '--division-method', 'virtual'],
      portsOver(journal),
    )

    const cast = await heldOf(
      journal,
      'Will the bridge at Greyfen Hold stand through the thaw?',
    )
    const recorded = await heldOf(
      journal,
      'Will the ferry at Westmill run through the spring floods?',
    )
    expect(withoutId(cast)).toEqual({
      origin: 'cast',
      query: 'Will the bridge at Greyfen Hold stand through the thaw?',
      divinedAt: moment('2026-05-19T14:23:11+08:00'),
      transformation: heapCasting.transformation,
      casting: heapCasting,
      divisionMethod: 'virtual',
    })
    expect(withoutId(recorded)).toEqual({
      origin: 'recorded',
      query: 'Will the ferry at Westmill run through the spring floods?',
      divinedAt: moment('2026-05-21T09:00:00+08:00'),
      transformation: heapCasting.transformation,
    })
    expect(result.exitCode).toBe(0)
    const lines = linesOf(result.stdout)
    expect(lines.slice(0, -1).toSorted()).toEqual(
      [
        castLine(path.join(old, castName), cast.id),
        doesNotReplayLine(path.join(old, disagreeName), recorded.id),
      ].toSorted(),
    )
    expect(lines.at(-1)).toBe(
      summary({ files: '2 files', cast: 1, recorded: 1, skipped: 0 }),
    )
    expect(await fileNames(path.join(journal, 'legacy'))).toEqual(
      [castName, disagreeName].toSorted(),
    )
  })

  it('skips a .md file that is not a version-1 record, with the reason', async () => {
    const { journal, old } = await workspace()
    const files = {
      version3: path.join(old, 'consultation-2026-05-22T09-00-00+0800.md'),
      noFrontmatter: path.join(old, 'greyfen-notes.md'),
      notYaml: path.join(old, 'consultation-2026-05-23T09-00-00+0800.md'),
    }
    await writeFile(
      files.version3,
      version1Text({
        schemaVersion: 3,
        timestamp: '2026-05-22T09:00:00+0800',
        query: 'Will the granary at Greyfen Hold be full by the first frost?',
        withCasting: false,
      }),
    )
    await writeFile(
      files.noFrontmatter,
      '# Notes on the Greyfen harvest\n\nNothing to import.\n',
    )
    await writeFile(
      files.notYaml,
      '---\nschemaVersion: 1\nquery: [unclosed\n---\n\nA body.\n',
    )

    const result = await history(
      ['--import-legacy', old, '--division-method', 'physical'],
      portsOver(journal),
    )

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
    const lines = linesOf(result.stdout)
    expect(lines.slice(0, -1).toSorted()).toEqual(
      [
        skipped(files.version3, 'it is not a version-1 record'),
        skipped(files.noFrontmatter, 'it has no frontmatter'),
        skipped(files.notYaml, 'its frontmatter is not YAML'),
      ].toSorted(),
    )
    expect(lines.at(-1)).toBe(
      summary({ files: '3 files', cast: 0, recorded: 0, skipped: 3 }),
    )
    expect(await held(journal)).toEqual([])
    expect(await fileNames(old)).toEqual(
      Object.values(files)
        .map((file) => path.basename(file))
        .toSorted(),
    )
  })
})

describe('hexagram-history --import-legacy with no path: the Journal folder', () => {
  it('migrates the version-1 and legacy files in the Journal folder, leaving its version-2 files and its subfolders alone', async () => {
    const { journal } = await workspace()
    const own = decodeRecord({
      schemaVersion: 2,
      id: '01JC0000000000000000000001',
      divinedAt: '2026-09-01',
      query: 'Will the mill at Westmill grind again?',
      transformation: '787878',
    })
    if (own.outcome !== 'decoded') throw new Error('the record is unreadable')
    await markdownStore(journal).consultationStore.keep(own.consultation)
    const [ownFile] = await fileNames(journal)
    const ownBytes = await readFile(path.join(journal, ownFile ?? ''), 'utf8')
    const version1Name = 'consultation-2026-05-19T14-23-11+0800.md'
    await writeFile(
      path.join(journal, version1Name),
      version1Text({
        timestamp: '2026-05-19T14:23:11+0800',
        query: 'Will the bridge at Greyfen Hold stand through the thaw?',
        withCasting: false,
      }),
    )
    const legacyName = 'consultation-2026-03-16T13-28-33+0800.txt'
    await place('legacy-shape-b.txt', journal, legacyName)
    await mkdir(path.join(journal, 'legacy'))
    const earlierName = 'consultation-2026-01-02T03-04-05+0800.txt'
    await place(
      'legacy-real-heap-casting.txt',
      path.join(journal, 'legacy'),
      earlierName,
    )

    const result = await history(
      ['--import-legacy', '--division-method', 'physical'],
      portsOver(journal),
    )

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
    const lines = linesOf(result.stdout)
    expect(lines.at(-1)).toBe(
      summary({ files: '2 files', cast: 0, recorded: 2, skipped: 0 }),
    )
    const version1 = await heldOf(
      journal,
      'Will the bridge at Greyfen Hold stand through the thaw?',
    )
    const legacy = await heldOf(journal, shapeBQuery)
    const keptLines = lines.slice(0, -1)
    expect(keptLines).toHaveLength(2)
    expect(
      keptLines.some(
        (line) =>
          line.startsWith('Kept ') &&
          line.endsWith(
            `${version1Name} as a Recorded Consultation, ${version1.id}: the file holds no Casting`,
          ),
      ),
    ).toBe(true)
    expect(
      keptLines.some(
        (line) =>
          line.startsWith('Kept ') &&
          line.endsWith(
            `${legacyName} as a Recorded Consultation, ${legacy.id}: the file holds no Casting`,
          ),
      ),
    ).toBe(true)
    expect(await held(journal)).toHaveLength(3)
    expect(await readFile(path.join(journal, ownFile ?? ''), 'utf8')).toBe(
      ownBytes,
    )
    expect(await fileNames(path.join(journal, 'legacy'))).toEqual(
      [earlierName, legacyName, version1Name].toSorted(),
    )
    expect(
      await readFile(path.join(journal, 'legacy', earlierName), 'utf8'),
    ).toBe(await fixtureText('legacy-real-heap-casting.txt'))
  })
})
