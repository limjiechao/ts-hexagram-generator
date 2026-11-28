import type { Buffer } from 'node:buffer'
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

import type { Clock } from '@hexagram/application/clock'
import type { ConsultationStore } from '@hexagram/application/consultation-store'
import type { RandomSource } from '@hexagram/application/random-source'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import type { Consultation } from '@hexagram/consultation-journal/consultation'
import { markdownConsultationStore } from '@hexagram/store-markdown/markdown-consultation-store'
import { afterEach, describe, expect, it } from 'vitest'

import type {
  CommandIo,
  CommandOutput,
  CommandPorts,
} from '#src/commands/entry-point.js'
import { run, usage } from '#src/commands/hexagram-history.js'
import { exportedConsultationsLine } from '#src/commands/maintenance-reports.js'
import type { CompilePdf } from '#src/typst-pdf.js'

import {
  browseOrder,
  typstConsultations,
  typstFixture,
  typstFixtures,
  type TypstCaseName,
} from '../support/typst-cases.js'
import {
  inventedTranslationId,
  typstFixtureCatalogue,
} from '../support/typst-catalogue.js'

// `hexagram-history --export <path> [--filter <text>]` writing Typst source
// (use case 9; manual 6.8), driven in process over a Journal in a fresh
// folder under the system's temporary directory, never the repository's
// own Journal, with every export target inside that folder too: no
// spawned bin may reach `--export`. The Store is the real Markdown
// Store; the Catalogue is the Typst fixtures' fake; the PDF
// compiler is a stub a `.typ` export must never call. Every Query, Id and
// date is invented.

const folders: string[] = []

afterEach(async () => {
  await Promise.all(
    folders
      .splice(0)
      .map((folder) => rm(folder, { recursive: true, force: true })),
  )
})

/** A fresh folder for one test: its Journal, and the export's targets. */
async function temporaryFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), 'hexagram-export-'))
  folders.push(folder)
  return folder
}

/** A Journal in `folder` holding these Consultations. */
async function journalHolding(
  folder: string,
  consultations: readonly Consultation[],
): Promise<string> {
  const journalFolder = path.join(folder, 'journal')
  await mkdir(journalFolder)
  const store = markdownConsultationStore({
    journalFolder,
    renderBody: (kept) => Promise.resolve(`# A body for ${kept.id}\n`),
  })
  for (const consultation of consultations)
    await store.consultationStore.keep(consultation)
  return journalFolder
}

const casesNamed = (names: readonly TypstCaseName[]): Consultation[] =>
  names.map((name) => typstConsultations[name])

/** Every file under `folder`, by path, with its bytes. */
async function snapshot(folder: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {}
  const entries = await readdir(folder, {
    recursive: true,
    withFileTypes: true,
  })
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const file = path.join(entry.parentPath, entry.name)
    files[path.relative(folder, file)] = await readFile(file, 'utf8')
  }
  return files
}

interface PortOptions {
  readonly scriptureCatalogue?: ScriptureCatalogue
  readonly consultationStore?: ConsultationStore
}

/**
 * The ports over the Journal: the real Markdown Store and the fake
 * Catalogue, unless the options name others, each use recorded by port;
 * the Random Source, the Clock and the Store's maintenance throw if used,
 * and `compilePdf` is a stub that records each call.
 */
function portsOver(
  journalFolder: string,
  touched: string[],
  options: PortOptions = {},
): CommandPorts {
  const store = markdownConsultationStore({
    journalFolder,
    renderBody: () => Promise.reject(new Error('the export kept a body')),
  })
  const consultationStore = options.consultationStore ?? store.consultationStore
  const catalogue = options.scriptureCatalogue ?? typstFixtureCatalogue
  const unused = (port: string) => (): never => {
    touched.push(port)
    throw new Error(`the export used the ${port}`)
  }
  const read = (port: string): void => {
    touched.push(port)
  }
  // Each method is called on its object, so a fake that reads `this` works.
  const scriptureCatalogue: ScriptureCatalogue = {
    passageTexts: (citation, preference) => {
      read('Scripture Catalogue')
      return catalogue.passageTexts(citation, preference)
    },
    hexagramNames: (hexagram, preference) => {
      read('Scripture Catalogue')
      return catalogue.hexagramNames(hexagram, preference)
    },
    receivedSequenceNumber: (hexagram) => {
      read('Scripture Catalogue')
      return catalogue.receivedSequenceNumber(hexagram)
    },
    trigramNames: (trigram, preference) => {
      read('Scripture Catalogue')
      return catalogue.trigramNames(trigram, preference)
    },
    editions: (work) => {
      read('Scripture Catalogue')
      return catalogue.editions(work)
    },
  }
  const journal: ConsultationStore = {
    keep: (consultation) => {
      read('Consultation Store')
      return consultationStore.keep(consultation)
    },
    list: () => {
      read('Consultation Store')
      return consultationStore.list()
    },
    get: (id) => {
      read('Consultation Store')
      return consultationStore.get(id)
    },
    remove: (record) => {
      read('Consultation Store')
      return consultationStore.remove(record)
    },
    deletionRecords: () => {
      read('Consultation Store')
      return consultationStore.deletionRecords()
    },
  }
  const randomSource: RandomSource = { integerBelow: unused('Random Source') }
  const clock: Clock = { now: unused('Clock') }
  const compilePdf: CompilePdf = (typst) => {
    touched.push('compilePdf')
    return Promise.resolve(new TextEncoder().encode(`%PDF-stub ${typst}`))
  }
  return {
    scriptureCatalogue,
    consultationStore: journal,
    randomSource,
    clock,
    journalFolder,
    moveToLegacy: unused('Markdown Consultation Store'),
    rerenderBodies: unused('Markdown Consultation Store'),
    compilePdf,
  }
}

/** How a fake stream fails, if it does. */
interface StreamFailure {
  /**
   * Emits `error` when the first chunk is written; with no listener, it
   * throws, as a Node stream's unheard `error` ends the process.
   */
  readonly errorEvent?: boolean
  /** Hands the first write's callback an error, after `write` returns. */
  readonly callbackError?: boolean
}

function fakeOutput(chunks: string[], failure: StreamFailure = {}) {
  const listeners: ((error: Error) => void)[] = []
  let failed = false
  const output: CommandOutput = {
    isTTY: false,
    write: (chunk, callback) => {
      chunks.push(chunk)
      const failsNow = !failed
      failed = true
      if (failsNow && failure.errorEvent) {
        if (listeners.length === 0) throw new Error('an unheard stream error')
        for (const listener of listeners)
          listener(new Error('EPIPE: an invented broken pipe'))
      }
      setImmediate(() => {
        callback?.(
          failsNow && failure.callbackError
            ? new Error('EPIPE: an invented broken pipe')
            : null,
        )
      })
      return true
    },
    on: (event: string, listener: (error: Error) => void) => {
      if (event === 'error') listeners.push(listener)
    },
    off: (event: string, listener: (error: Error) => void) => {
      if (event !== 'error') return
      const at = listeners.indexOf(listener)
      if (at !== -1) listeners.splice(at, 1)
    },
  }
  return { output, listeners }
}

interface RunOptions {
  readonly stdout?: StreamFailure
  readonly stderr?: StreamFailure
}

/** Runs `hexagram-history` with `argv`, stdout not a TTY. */
async function history(
  argv: readonly string[],
  ports: CommandPorts,
  options: RunOptions = {},
) {
  const stdout: string[] = []
  const stderr: string[] = []
  const out = fakeOutput(stdout, options.stdout)
  const err = fakeOutput(stderr, options.stderr)
  const io: CommandIo = {
    stdin: { isTTY: false, on: () => {}, off: () => {}, pause: () => {} },
    signals: { on: () => {}, off: () => {} },
    stdout: out.output,
    stderr: err.output,
    isTTY: false,
    rows: undefined,
    columns: undefined,
    env: {},
  }
  const exitCode = await run(argv, io, ports)
  return {
    exitCode,
    stdout: stdout.join(''),
    stderr: stderr.join(''),
    // Every listener the run added is released once it ends.
    listenersLeft: out.listeners.length + err.listeners.length,
  }
}

const line = (text: string): string => `${text}\n`

const noConsultation = line('hexagram-history: no Consultation to export')
const journalUnreadable = line('hexagram-history: the Journal cannot be read')
const catalogueUnreadable = line(
  'hexagram-history: the Scripture Catalogue cannot be read',
)
const stdoutUnwritable = line('hexagram-history: stdout cannot be written')

const bytesOf = (file: string): Promise<Buffer> => readFile(file)

/** The export's stdout line, as manual 6.8's run words it. */
const exported = (target: string, count: number): string =>
  line(
    `Exported ${String(count)} ${count === 1 ? 'consultation' : 'consultations'} to ${target}.`,
  )

describe('exportedConsultationsLine', () => {
  it.each([
    ['readings.typ', 1, 'Exported 1 consultation to readings.typ.'],
    ['readings.typ', 2, 'Exported 2 consultations to readings.typ.'],
    ['out/x.pdf', 40, 'Exported 40 consultations to out/x.pdf.'],
  ])('words %s with %i as %s', (file, count, expected) => {
    expect(exportedConsultationsLine(file, count)).toBe(expected)
  })
})

describe('hexagram-history --export <path>.typ: the Typst byte fixtures', () => {
  it.each(
    typstFixtures.map((fixture) => ({ ...fixture, shown: fixture.file })),
  )(
    '$shown: written whole, its count on stdout, exit 0, nothing else touched',
    async ({ file, consultations, options }) => {
      const folder = await temporaryFolder()
      const journalFolder = await journalHolding(
        folder,
        casesNamed(consultations),
      )
      const journalBefore = await snapshot(journalFolder)
      const target = path.join(folder, 'out.typ')
      const touched: string[] = []

      const ended = await history(
        ['--export', target, ...options],
        portsOver(journalFolder, touched),
      )

      expect(ended).toEqual({
        exitCode: 0,
        stdout: exported(target, consultations.length),
        stderr: '',
        listenersLeft: 0,
      })
      expect(await bytesOf(target)).toEqual(typstFixture(file))
      expect(await readdir(folder)).toEqual(['journal', 'out.typ'].toSorted())
      expect(await snapshot(journalFolder)).toEqual(journalBefore)
      expect(new Set(touched)).toEqual(
        new Set(['Consultation Store', 'Scripture Catalogue']),
      )
    },
  )

  it('the five are written in the browse list’s order, whatever order the Store keeps them in', async () => {
    const folder = await temporaryFolder()
    const journalFolder = await journalHolding(
      folder,
      casesNamed(browseOrder.toReversed()),
    )
    const target = path.join(folder, 'five.typ')

    const ended = await history(
      ['--export', target],
      portsOver(journalFolder, []),
    )

    expect(ended.exitCode).toBe(0)
    expect(await bytesOf(target)).toEqual(typstFixture('all-five.typ'))
  })

  it('the path is reported as given, not resolved', async () => {
    const folder = await temporaryFolder()
    const journalFolder = await journalHolding(
      folder,
      casesNamed(['recorded-day']),
    )
    await mkdir(path.join(folder, 'sub'))
    const target = `${folder}/sub/../given.typ`

    const ended = await history(
      ['--export', target],
      portsOver(journalFolder, []),
    )

    expect(ended.stdout).toBe(exported(target, 1))
    expect(await bytesOf(path.join(folder, 'given.typ'))).toEqual(
      typstFixture('recorded-day.typ'),
    )
  })

  it.each([
    {
      shown: '--export=<path>',
      argv: (target: string) => [`--export=${target}`],
    },
    {
      shown: 'the options before --export',
      argv: (target: string) => ['--script', 'simplified', '--export', target],
    },
  ])('$shown is the same export', async ({ argv }) => {
    const folder = await temporaryFolder()
    const journalFolder = await journalHolding(
      folder,
      casesNamed(['cast-several-moving']),
    )
    const target = path.join(folder, 'out.typ')

    const ended = await history(argv(target), portsOver(journalFolder, []))

    expect(ended.exitCode).toBe(0)
    const expected = argv(target).includes('simplified')
      ? 'simplified.typ'
      : 'cast-several-moving.typ'
    expect(await bytesOf(target)).toEqual(typstFixture(expected))
  })
})

describe('hexagram-history --export with --filter', () => {
  it('exports only the Consultations whose Query holds the text, ignoring case, in browse order', async () => {
    const folder = await temporaryFolder()
    const everything = await journalHolding(folder, casesNamed(browseOrder))
    const target = path.join(folder, 'filtered.typ')

    const ended = await history(
      ['--export', target, '--filter', 'GREYFEN'],
      portsOver(everything, []),
    )

    // Three Queries name Greyfen: the same bytes as a Journal of those three.
    expect(ended).toEqual({
      exitCode: 0,
      stdout: exported(target, 3),
      stderr: '',
      listenersLeft: 0,
    })
    const only = await temporaryFolder()
    const onlyThree = await journalHolding(
      only,
      casesNamed(['cast-all-moving', 'cast-x-zhi-x', 'recorded-moment']),
    )
    const expectedTarget = path.join(only, 'expected.typ')
    await history(['--export', expectedTarget], portsOver(onlyThree, []))
    expect(await bytesOf(target)).toEqual(await bytesOf(expectedTarget))
  })

  it('a filter matching one Consultation: the singular line', async () => {
    const folder = await temporaryFolder()
    const journalFolder = await journalHolding(folder, casesNamed(browseOrder))
    const target = path.join(folder, 'one.typ')

    const ended = await history(
      ['--export', target, '--filter', 'embassy'],
      portsOver(journalFolder, []),
    )

    expect(ended.stdout).toBe(exported(target, 1))
    expect(await bytesOf(target)).toEqual(typstFixture('recorded-day.typ'))
  })
})

describe('hexagram-history --export: a path that is neither .typ nor .pdf', () => {
  it.each([
    'out.txt',
    'out.PDF',
    'out.Typ',
    'out.TYP',
    'out',
    'out.typ.bak',
    'out.pdf.txt',
    'out.typst',
    'out.pdf ',
    'typ',
    'folder.pdf/out',
  ])(
    '%s: the usage line, exit 1, before any port, nothing written',
    async (name) => {
      const folder = await temporaryFolder()
      const journalFolder = await journalHolding(
        folder,
        casesNamed(['recorded-day']),
      )
      const before = await snapshot(folder)
      const touched: string[] = []

      const ended = await history(
        ['--export', path.join(folder, name), '--translation', 'legge-1882'],
        portsOver(journalFolder, touched),
      )

      expect(ended).toEqual({
        exitCode: 1,
        stdout: '',
        stderr: line(usage),
        listenersLeft: 0,
      })
      expect(touched).toEqual([])
      expect(await snapshot(folder)).toEqual(before)
    },
  )

  it.each(['out.pdf.typ', 'out.v2.typ', '.hidden.typ'])(
    '%s: the last extension decides, so it is Typst source',
    async (name) => {
      const folder = await temporaryFolder()
      const journalFolder = await journalHolding(
        folder,
        casesNamed(['recorded-day']),
      )
      const target = path.join(folder, name)

      const ended = await history(
        ['--export', target],
        portsOver(journalFolder, []),
      )

      expect(ended.exitCode).toBe(0)
      expect(await bytesOf(target)).toEqual(typstFixture('recorded-day.typ'))
    },
  )
})

describe('hexagram-history --export: when nothing matches', () => {
  it.each([
    {
      shown: 'a filter that matches no Query',
      consultations: browseOrder,
      filter: ['--filter', 'harvest'],
    },
    { shown: 'an empty Journal', consultations: [], filter: [] },
  ])(
    '$shown: the nothing-to-export line, exit 1, no file',
    async ({ consultations, filter }) => {
      const folder = await temporaryFolder()
      const journalFolder = await journalHolding(
        folder,
        casesNamed(consultations),
      )
      const before = await snapshot(folder)
      const touched: string[] = []

      const ended = await history(
        ['--export', path.join(folder, 'out.typ'), ...filter],
        portsOver(journalFolder, touched),
      )

      expect(ended).toEqual({
        exitCode: 1,
        stdout: '',
        stderr: noConsultation,
        listenersLeft: 0,
      })
      expect(await snapshot(folder)).toEqual(before)
      expect(touched).toEqual(['Consultation Store'])
    },
  )

  it('a Journal of Unreadable files only: nothing to export, exit 1, no file', async () => {
    const folder = await temporaryFolder()
    const journalFolder = await journalHolding(folder, [])
    await writeFile(
      path.join(journalFolder, '2026-11-01--not-a-record.md'),
      'An invented file with no frontmatter.\n',
    )
    const before = await snapshot(folder)

    const ended = await history(
      ['--export', path.join(folder, 'out.typ')],
      portsOver(journalFolder, []),
    )

    expect(ended.stderr).toBe(noConsultation)
    expect(ended.exitCode).toBe(1)
    expect(await snapshot(folder)).toEqual(before)
  })

  it('an Unreadable file beside a match is left out and not counted', async () => {
    const folder = await temporaryFolder()
    const journalFolder = await journalHolding(
      folder,
      casesNamed(['recorded-day']),
    )
    await writeFile(
      path.join(journalFolder, '2026-11-01--not-a-record.md'),
      'An invented file with no frontmatter.\n',
    )
    const target = path.join(folder, 'out.typ')

    const ended = await history(
      ['--export', target],
      portsOver(journalFolder, []),
    )

    expect(ended.stdout).toBe(exported(target, 1))
    expect(await bytesOf(target)).toEqual(typstFixture('recorded-day.typ'))
  })
})

describe('hexagram-history --export: the target', () => {
  it('a file already there is never written over: the already-exists line, exit 1', async () => {
    const folder = await temporaryFolder()
    const journalFolder = await journalHolding(
      folder,
      casesNamed(['recorded-day']),
    )
    const target = path.join(folder, 'out.typ')
    await writeFile(target, 'An invented file the export must keep.\n')
    const before = await snapshot(folder)

    const ended = await history(
      ['--export', target],
      portsOver(journalFolder, []),
    )

    expect(ended).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: line(`hexagram-history: ${target} already exists`),
      listenersLeft: 0,
    })
    expect(await snapshot(folder)).toEqual(before)
  })

  it.each([
    { shown: 'in a folder that does not exist', at: ['missing', 'out.typ'] },
    { shown: 'under a file', at: ['a-file', 'out.typ'] },
  ])(
    'a target $shown cannot be written: its line, exit 1, nothing created',
    async ({ at }) => {
      const folder = await temporaryFolder()
      const journalFolder = await journalHolding(
        folder,
        casesNamed(['recorded-day']),
      )
      await writeFile(path.join(folder, 'a-file'), 'An invented file.\n')
      const before = await snapshot(folder)
      const target = path.join(folder, ...at)

      const ended = await history(
        ['--export', target],
        portsOver(journalFolder, []),
      )

      expect(ended).toEqual({
        exitCode: 1,
        stdout: '',
        stderr: line(`hexagram-history: ${target} cannot be written`),
        listenersLeft: 0,
      })
      expect(await snapshot(folder)).toEqual(before)
    },
  )
})

describe('hexagram-history --export: the Reading Preference is checked first', () => {
  it.each(
    [
      ['--translation', 'legge-1883'],
      ['--translation', 'invented-zh'],
      ['--translation', 'legge-1882', '--translation', 'legge-1882'],
      ['--commentary', 'bogus'],
    ].map((options) => ({ options, shown: options.join(' ') })),
  )(
    '$shown: the usage line, exit 1, the Journal never read, nothing written',
    async ({ options }) => {
      const folder = await temporaryFolder()
      const journalFolder = await journalHolding(
        folder,
        casesNamed(['recorded-day']),
      )
      const before = await snapshot(folder)
      const touched: string[] = []

      const ended = await history(
        ['--export', path.join(folder, 'out.typ'), ...options],
        portsOver(journalFolder, touched),
      )

      expect(ended).toEqual({
        exitCode: 1,
        stdout: '',
        stderr: line(usage),
        listenersLeft: 0,
      })
      expect(touched).not.toContain('Consultation Store')
      expect(await snapshot(folder)).toEqual(before)
    },
  )

  it('the Catalogue fails while a --translation is checked: its line, exit 1, the Journal never read', async () => {
    const folder = await temporaryFolder()
    const journalFolder = await journalHolding(
      folder,
      casesNamed(['recorded-day']),
    )
    const before = await snapshot(folder)
    const touched: string[] = []

    const ended = await history(
      [
        '--export',
        path.join(folder, 'out.typ'),
        '--translation',
        inventedTranslationId,
      ],
      portsOver(journalFolder, touched, {
        scriptureCatalogue: {
          ...typstFixtureCatalogue,
          editions: () => Promise.reject(new Error('an invented failure')),
        },
      }),
    )

    expect(ended).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: catalogueUnreadable,
      listenersLeft: 0,
    })
    expect(touched).toEqual(['Scripture Catalogue'])
    expect(await snapshot(folder)).toEqual(before)
  })
})

describe('hexagram-history --export: a port that fails', () => {
  it('the Journal cannot be read: its line, exit 1, no file', async () => {
    const folder = await temporaryFolder()
    const journalFolder = await journalHolding(folder, [])
    const failing: ConsultationStore = {
      keep: () => Promise.reject(new Error('unused')),
      list: () => Promise.reject(new Error('EACCES: an invented failure')),
      get: () => Promise.reject(new Error('unused')),
      remove: () => Promise.reject(new Error('unused')),
      deletionRecords: () => Promise.reject(new Error('unused')),
    }
    const before = await snapshot(folder)
    const touched: string[] = []

    const ended = await history(
      ['--export', path.join(folder, 'out.typ')],
      portsOver(journalFolder, touched, { consultationStore: failing }),
    )

    expect(ended).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: journalUnreadable,
      listenersLeft: 0,
    })
    expect(touched).toEqual(['Consultation Store'])
    expect(await snapshot(folder)).toEqual(before)
  })

  it('the Catalogue fails while the Readouts are built: its line, exit 1, no file', async () => {
    const folder = await temporaryFolder()
    const journalFolder = await journalHolding(
      folder,
      casesNamed(['recorded-day']),
    )
    const before = await snapshot(folder)

    const ended = await history(
      ['--export', path.join(folder, 'out.typ')],
      portsOver(journalFolder, [], {
        scriptureCatalogue: {
          ...typstFixtureCatalogue,
          trigramNames: () => Promise.reject(new Error('an invented failure')),
        },
      }),
    )

    expect(ended).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: catalogueUnreadable,
      listenersLeft: 0,
    })
    expect(await snapshot(folder)).toEqual(before)
  })
})

describe('hexagram-history --export: a stream that fails', () => {
  it.each([
    { shown: 'by its error event', stdout: { errorEvent: true } },
    { shown: 'by the write’s callback', stdout: { callbackError: true } },
  ])(
    'stdout fails $shown after the file is written: the file kept, the stdout line, exit 1',
    async ({ stdout }) => {
      const folder = await temporaryFolder()
      const journalFolder = await journalHolding(
        folder,
        casesNamed(['recorded-day']),
      )
      const target = path.join(folder, 'out.typ')

      const ended = await history(
        ['--export', target],
        portsOver(journalFolder, []),
        { stdout },
      )

      expect(ended).toEqual({
        exitCode: 1,
        stdout: exported(target, 1),
        stderr: stdoutUnwritable,
        listenersLeft: 0,
      })
      expect(await bytesOf(target)).toEqual(typstFixture('recorded-day.typ'))
    },
  )

  it('stderr fails while the nothing-to-export line is written: heard and ignored, exit 1', async () => {
    const folder = await temporaryFolder()
    const journalFolder = await journalHolding(folder, [])

    const ended = await history(
      ['--export', path.join(folder, 'out.typ')],
      portsOver(journalFolder, []),
      { stderr: { errorEvent: true, callbackError: true } },
    )

    expect(ended).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: noConsultation,
      listenersLeft: 0,
    })
  })
})
