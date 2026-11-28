import { Buffer } from 'node:buffer'
import { readdirSync, readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  exportFontFiles,
  exportFontFolder,
  ExportFontsError,
  TypstCompileError,
  typstPdfCompiler,
} from '#src/typst-pdf.js'

import {
  fontFolderWith,
  inventedFontLikeBytes,
  inventedLfsPointer,
  modeCanDenyReading,
  unreadableFonts,
} from './support/export-fonts.js'
import { typstFixture, typstFixtures } from './support/typst-cases.js'

// The PDF side of `--export` (use case 9) on Typst's WebAssembly build:
// each Typst byte fixture compiled in process over the export's own fonts,
// and the two ways a compile is refused. Every font folder other than the
// real one is a fresh folder under the system's temporary directory; no
// row writes a PDF anywhere, and none touches a Journal.

const here = path.dirname(fileURLToPath(import.meta.url))

/** The WebAssembly build is slow to start, so rows that compile wait longer. */
const compiling = { timeout: 120_000 }

const pdfHead = '%PDF-'
const headOf = (bytes: Uint8Array): string =>
  new TextDecoder('latin1').decode(bytes.subarray(0, pdfHead.length))

const fixtureSource = (file: string): string =>
  typstFixture(file).toString('utf8')

// One compiler for the rows over the real font folder, as a bin makes one.
const compilePdf = typstPdfCompiler(exportFontFolder())

/** The bytes each fixture compiled to, for the rows that compare. */
const compiled = new Map<string, Uint8Array>()

const removals: (() => Promise<void>)[] = []
afterEach(async () => {
  await Promise.all(removals.splice(0).map((remove) => remove()))
})

/** A font folder from `fontFolderWith`, removed after the row. */
async function fontFolder(
  replaced: Readonly<Record<string, string | undefined>> = {},
): Promise<string> {
  const made = await fontFolderWith(replaced)
  removals.push(made.remove)
  return made.folder
}

// A static value import, a re-export or a bare import of either package
// would load it with the module, so every bin would pay for it; only
// `import type` and a dynamic `import(…)` leave it unloaded.
/** Whether a module's source loads either package when it is imported. */
const loadsAtImport = (source: string): boolean =>
  [...source.matchAll(/['"]@myriaddreamin\//g)].some(({ index }) => {
    const before = source.slice(0, index)
    if (before.trimEnd().endsWith('import(')) return false
    const statement = before.slice(
      Math.max(
        before.lastIndexOf('\nimport '),
        before.lastIndexOf('\nexport '),
      ) + 1,
    )
    return !/^(?:import|export) type\b/.test(statement)
  })

describe('exportFontFolder', () => {
  it('is `fonts/` in the cli-adapter package, found from the module, not the working folder', () => {
    expect(exportFontFolder()).toBe(path.resolve(here, '..', 'fonts'))
  })
})

describe('typstPdfCompiler(exportFontFolder()): the Typst byte fixtures', () => {
  it.each(typstFixtures.map(({ file }) => file))(
    '%s compiles to bytes that begin %%PDF-',
    async (file) => {
      const bytes = await compilePdf(fixtureSource(file))

      expect(bytes).toBeInstanceOf(Uint8Array)
      expect(headOf(bytes)).toBe(pdfHead)
      compiled.set(file, bytes)
    },
    compiling.timeout,
  )

  it.each(typstFixtures.map(({ file }) => file))(
    '%s compiled again gives the same bytes',
    async (file) => {
      const first =
        compiled.get(file) ?? (await compilePdf(fixtureSource(file)))

      const again = await compilePdf(fixtureSource(file))

      expect(Buffer.from(again).equals(Buffer.from(first))).toBe(true)
    },
    compiling.timeout,
  )
})

describe('typstPdfCompiler: loaded once, on its first call', () => {
  it(
    'a second call reuses the fonts the first loaded, and a new compiler gives the same bytes',
    async () => {
      const folder = await fontFolder()
      const compile = typstPdfCompiler(folder)
      const source = fixtureSource('cast-several-moving.typ')

      const first = await compile(source)
      // Nothing is left to load: a compiler that reloaded fonts would fail.
      await rm(folder, { recursive: true, force: true })
      const second = await compile(source)

      expect(headOf(first)).toBe(pdfHead)
      expect(Buffer.from(second).equals(Buffer.from(first))).toBe(true)
      const fromTheRealFolder = await compilePdf(source)
      expect(Buffer.from(first).equals(Buffer.from(fromTheRealFolder))).toBe(
        true,
      )
    },
    compiling.timeout,
  )

  it(
    'making a compiler reads nothing: one over a folder that does not exist is made, and only its call fails',
    async () => {
      const nowhere = path.join(here, 'no-such-font-folder')

      const compile = typstPdfCompiler(nowhere)
      const refused = compile(fixtureSource('recorded-day.typ'))

      const failure = await refused.catch((error: unknown) => error)
      if (!(failure instanceof ExportFontsError)) throw failure
      expect(failure.reason).toBe('missing')
      expect(exportFontFiles.map(({ file }) => file)).toContain(failure.file)
    },
    compiling.timeout,
  )

  it('no module under src imports typst.ts or its WebAssembly module at load; only a call does', () => {
    const sourceFolder = path.resolve(here, '..', 'src')
    const files = readdirSync(sourceFolder, {
      recursive: true,
      encoding: 'utf8',
    })
      .filter((file) => file.endsWith('.ts'))
      .map((file) => path.join(sourceFolder, file))
    // The check itself tells the three apart.
    expect(
      loadsAtImport("import { $typst } from '@myriaddreamin/typst.ts'\n"),
    ).toBe(true)
    expect(
      loadsAtImport("import '@myriaddreamin/typst-ts-web-compiler'\n"),
    ).toBe(true)
    expect(
      loadsAtImport("import type { X } from '@myriaddreamin/typst.ts'\n"),
    ).toBe(false)
    expect(
      loadsAtImport(
        "const m = await import(\n  '@myriaddreamin/typst.ts'\n)\n",
      ),
    ).toBe(false)

    const offenders = files.filter((file) =>
      loadsAtImport(readFileSync(file, 'utf8')),
    )

    expect(offenders).toEqual([])
  })
})

describe('typstPdfCompiler: a font that cannot be loaded', () => {
  it.each(exportFontFiles.map(({ file }) => file))(
    '%s missing: ExportFontsError naming it, reason missing',
    async (file) => {
      const compile = typstPdfCompiler(await fontFolder({ [file]: undefined }))

      const failure = await compile(fixtureSource('recorded-day.typ')).catch(
        (error: unknown) => error,
      )

      expect(failure).toBeInstanceOf(ExportFontsError)
      expect(failure).toMatchObject({ file, reason: 'missing' })
    },
    compiling.timeout,
  )

  it.each(exportFontFiles.map(({ file }) => file))(
    '%s a Git LFS pointer: ExportFontsError naming it, reason not-a-font',
    async (file) => {
      const compile = typstPdfCompiler(
        await fontFolder({ [file]: inventedLfsPointer }),
      )

      const failure = await compile(fixtureSource('recorded-day.typ')).catch(
        (error: unknown) => error,
      )

      expect(failure).toBeInstanceOf(ExportFontsError)
      expect(failure).toMatchObject({ file, reason: 'not-a-font' })
    },
    compiling.timeout,
  )
})

describe('typstPdfCompiler: a source Typst refuses', () => {
  it(
    '#let x = ( : TypstCompileError carrying Typst’s diagnostics',
    async () => {
      const failure = await compilePdf('#let x = (\n').catch(
        (error: unknown) => error,
      )

      if (!(failure instanceof TypstCompileError)) throw failure
      const { diagnostics } = failure
      expect(diagnostics.length).toBeGreaterThan(0)
      for (const diagnostic of diagnostics) {
        expect(typeof diagnostic).toBe('string')
        expect(diagnostic.trim()).not.toBe('')
      }
    },
    compiling.timeout,
  )

  it(
    'the compiler still compiles after a refusal, to the same bytes',
    async () => {
      const source = fixtureSource('recorded-day.typ')
      const before = await compilePdf(source)

      await compilePdf('#let x = (\n').catch(() => 'refused')
      const after = await compilePdf(source)

      expect(Buffer.from(after).equals(Buffer.from(before))).toBe(true)
    },
    compiling.timeout,
  )
})

describe('typstPdfCompiler: a font that is there but cannot be read', () => {
  it.skipIf(!modeCanDenyReading).each(exportFontFiles.map(({ file }) => file))(
    '%s of mode 000 (EACCES): ExportFontsError naming it, reason unreadable',
    async (file) => {
      const made = await unreadableFonts.EACCES(file)
      removals.push(made.remove)

      const failure = await typstPdfCompiler(made.folder)(
        fixtureSource('recorded-day.typ'),
      ).catch((error: unknown) => error)

      expect(failure).toBeInstanceOf(ExportFontsError)
      expect(failure).toMatchObject({ file, reason: 'unreadable' })
    },
  )

  it.each(exportFontFiles.map(({ file }) => file))(
    '%s a folder (EISDIR): ExportFontsError naming it, reason unreadable',
    async (file) => {
      const made = await unreadableFonts.EISDIR(file)
      removals.push(made.remove)

      const failure = await typstPdfCompiler(made.folder)(
        fixtureSource('recorded-day.typ'),
      ).catch((error: unknown) => error)

      expect(failure).toBeInstanceOf(ExportFontsError)
      expect(failure).toMatchObject({ file, reason: 'unreadable' })
    },
  )

  // Each case starts the WebAssembly build, so one file of two families.
  it.each(['LibertinusSerif-Italic.otf', 'NotoSansSymbols2-Regular.ttf'])(
    '%s begins OTTO but Typst takes no font from it: ExportFontsError naming it, reason unreadable',
    async (file) => {
      const compile = typstPdfCompiler(
        await fontFolder({ [file]: inventedFontLikeBytes }),
      )

      const failure = await compile(fixtureSource('recorded-day.typ')).catch(
        (error: unknown) => error,
      )

      expect(failure).toBeInstanceOf(ExportFontsError)
      expect(failure).toMatchObject({ file, reason: 'unreadable' })
    },
    compiling.timeout,
  )
})

describe('typstPdfCompiler: the WebAssembly build cannot be loaded', () => {
  afterEach(() => {
    vi.doUnmock('@myriaddreamin/typst-ts-web-compiler')
    vi.resetModules()
  })

  it('rejects with an error of its own class, neither a font nor a compile error', async () => {
    // A fresh copy of the module, whose import of the WebAssembly build
    // fails as an unreadable or missing `.wasm` would.
    vi.resetModules()
    vi.doMock('@myriaddreamin/typst-ts-web-compiler', () => {
      throw new Error('an invented WebAssembly load failure')
    })
    const fresh = await import('#src/typst-pdf.js')
    const compile = fresh.typstPdfCompiler(exportFontFolder())

    const failure = await compile(fixtureSource('recorded-day.typ')).catch(
      (error: unknown) => error,
    )

    expect(failure).toBeInstanceOf(Error)
    expect(failure).not.toBeInstanceOf(fresh.ExportFontsError)
    expect(failure).not.toBeInstanceOf(fresh.TypstCompileError)
    // The run tells it from any other error by its class, to give it its
    // own line.
    expect(Object.getPrototypeOf(failure)).not.toBe(Error.prototype)
  })
})
