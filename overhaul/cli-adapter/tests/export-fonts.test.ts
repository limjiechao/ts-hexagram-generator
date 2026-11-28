import type { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import type { Polarity } from '@hexagram/oracle/figure'
import type { Hexagram } from '@hexagram/oracle/hexagram'
import type { LinePosition } from '@hexagram/oracle/line-position'
import type { Trigram } from '@hexagram/oracle/trigram'
import { movingLineMarks } from '@hexagram/presentation/moving-line-marks'
import type { Citation } from '@hexagram/scripture-catalogue/citation'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import type { Work } from '@hexagram/scripture-catalogue/work'
import { describe, expect, it } from 'vitest'

import { exportFontFiles, exportFontFolder } from '#src/typst-pdf.js'

import {
  exportFontsState,
  isLfsPointer,
  lfsPointerHead,
  pointersSkipReason,
} from './support/export-fonts.js'
import { typstFixture, typstFixtures } from './support/typst-cases.js'

// The export's fonts themselves: that together they hold a glyph for every
// character the export can set from the bundled Catalogue and the
// template, that their bytes are the ones committed, and that they are
// committed through Git LFS with their OFL licence texts beside them. The
// bytes are read, never installed, and no row compiles anything.

const fontFolder = exportFontFolder()
const fontPath = (file: string): string => path.join(fontFolder, file)

// --- The character map --------------------------------------------------------

/**
 * The code points a font maps to a glyph other than `.notdef`, read from
 * its `cmap` table's format 4 and format 12 subtables: enough for an
 * OpenType or TrueType font, with no dependency.
 */
function mappedCodePoints(bytes: Buffer): Set<number> {
  const tag = bytes.toString('latin1', 0, 4)
  if (tag !== 'OTTO' && tag !== '\u0000\u0001\u0000\u0000' && tag !== 'true') {
    throw new Error(
      `not a single OpenType or TrueType font (begins ${JSON.stringify(tag)})`,
    )
  }
  const tableCount = bytes.readUInt16BE(4)
  let cmap: number | undefined
  for (let index = 0; index < tableCount; index += 1) {
    const record = 12 + index * 16
    if (bytes.toString('latin1', record, record + 4) === 'cmap') {
      cmap = bytes.readUInt32BE(record + 8)
    }
  }
  if (cmap === undefined) throw new Error('no cmap table')
  const mapped = new Set<number>()
  const subtableCount = bytes.readUInt16BE(cmap + 2)
  for (let index = 0; index < subtableCount; index += 1) {
    const subtable = cmap + bytes.readUInt32BE(cmap + 4 + index * 8 + 4)
    const format = bytes.readUInt16BE(subtable)
    if (format === 4) readFormat4(bytes, subtable, mapped)
    if (format === 12) readFormat12(bytes, subtable, mapped)
  }
  return mapped
}

function readFormat4(bytes: Buffer, at: number, mapped: Set<number>): void {
  const segments = bytes.readUInt16BE(at + 6) / 2
  const ends = at + 14
  const starts = ends + segments * 2 + 2
  const deltas = starts + segments * 2
  const rangeOffsets = deltas + segments * 2
  for (let segment = 0; segment < segments; segment += 1) {
    const end = bytes.readUInt16BE(ends + segment * 2)
    const start = bytes.readUInt16BE(starts + segment * 2)
    const delta = bytes.readInt16BE(deltas + segment * 2)
    const rangeOffsetAt = rangeOffsets + segment * 2
    const rangeOffset = bytes.readUInt16BE(rangeOffsetAt)
    for (let code = start; code <= end && code !== 0xffff; code += 1) {
      let glyph: number
      if (rangeOffset === 0) {
        glyph = (code + delta) & 0xffff
      } else {
        const index = bytes.readUInt16BE(
          rangeOffsetAt + rangeOffset + (code - start) * 2,
        )
        glyph = index === 0 ? 0 : (index + delta) & 0xffff
      }
      if (glyph !== 0) mapped.add(code)
    }
  }
}

function readFormat12(bytes: Buffer, at: number, mapped: Set<number>): void {
  const groups = bytes.readUInt32BE(at + 12)
  for (let group = 0; group < groups; group += 1) {
    const record = at + 16 + group * 12
    const start = bytes.readUInt32BE(record)
    const end = bytes.readUInt32BE(record + 4)
    const startGlyph = bytes.readUInt32BE(record + 8)
    for (let code = start; code <= end; code += 1) {
      if (startGlyph + (code - start) !== 0) mapped.add(code)
    }
  }
}

// --- What the export can set --------------------------------------------------

const polarity = (bit: number): Polarity => (bit === 1 ? 'yang' : 'yin')

const bitOf = (n: number, at: number): Polarity => polarity((n >> at) & 1)

const allHexagrams: readonly Hexagram[] = Array.from(
  { length: 64 },
  (_, n): Hexagram => [
    bitOf(n, 0),
    bitOf(n, 1),
    bitOf(n, 2),
    bitOf(n, 3),
    bitOf(n, 4),
    bitOf(n, 5),
  ],
)

const allTrigrams: readonly Trigram[] = Array.from(
  { length: 8 },
  (_, n): Trigram => [bitOf(n, 0), bitOf(n, 1), bitOf(n, 2)],
)

const linePositions: readonly LinePosition[] = [1, 2, 3, 4, 5, 6]
const works: readonly Work[] = [
  'zhouyi',
  'tuan',
  'daxiang',
  'xiaoxiang',
  'wenyan',
  'yilin',
]

/** Every Citation the Catalogue can be asked for. */
const allCitations: readonly Citation[] = allHexagrams.flatMap(
  (hexagram): Citation[] => [
    { work: 'zhouyi', hexagram },
    { work: 'zhouyi', hexagram, line: 'all-moving' },
    ...linePositions.flatMap((line): Citation[] => [
      { work: 'zhouyi', hexagram, line },
      { work: 'xiaoxiang', hexagram, line },
    ]),
    { work: 'tuan', hexagram },
    { work: 'daxiang', hexagram },
    { work: 'wenyan', hexagram },
    ...allHexagrams.map(
      (emerging): Citation => ({ work: 'yilin', standing: hexagram, emerging }),
    ),
  ],
)

/**
 * Every text the bundled Catalogue gives, in both scripts with every
 * Translation it holds: each passage, Commentary and Yilin Verse, each
 * Hexagram and Trigram name and imagery, and each Edition's short name,
 * title and Witness.
 */
async function catalogueTexts(): Promise<string[]> {
  const texts: string[] = []
  const byWork = await Promise.all(
    works.map((work) => bundledScriptureCatalogue.editions(work)),
  )
  const editions = byWork.flat()
  for (const edition of editions)
    texts.push(edition.shortName, edition.title, edition.witness.description)
  const translations = editions
    .filter((edition) => edition.language !== undefined)
    .map((edition) => edition.id)
  for (const script of ['traditional', 'simplified'] as const) {
    const preference: ReadingPreference = {
      script,
      translations: [...new Set(translations)],
      commentaries: ['tuan', 'daxiang', 'xiaoxiang', 'wenyan'],
      yilinVerse: true,
    }
    for (const citation of allCitations) {
      for (const passage of await bundledScriptureCatalogue.passageTexts(
        citation,
        preference,
      ))
        texts.push(passage.text)
    }
    for (const hexagram of allHexagrams) {
      for (const name of await bundledScriptureCatalogue.hexagramNames(
        hexagram,
        preference,
      ))
        texts.push(name.name)
    }
    for (const trigram of allTrigrams) {
      for (const name of await bundledScriptureCatalogue.trigramNames(
        trigram,
        preference,
      ))
        texts.push(name.name, name.imagery)
    }
  }
  return texts
}

/**
 * The labels a Readout gives its passages and Commentaries, which the
 * Catalogue does not hold: the Hexagram Statement, each Line's name, the
 * All-Moving Statements and the four Commentaries.
 */
const passageLabels =
  '卦辭 初九 九二 九三 九四 九五 上九 初六 六二 六三 六四 六五 上六 用九 用六 彖傳 大象 小象 文言'

/** The Hexagram symbols, U+4DC0 to U+4DFF. */
const hexagramSymbols = String.fromCodePoint(
  ...Array.from({ length: 64 }, (_, n) => 0x4dc0 + n),
)

/** Every character in `texts`, less whitespace, by code point. */
function charactersOf(texts: readonly string[]): Set<number> {
  const characters = new Set<number>()
  for (const text of texts) {
    for (const character of text) {
      if (/\s/u.test(character)) continue
      const codePoint = character.codePointAt(0)
      if (codePoint !== undefined) characters.add(codePoint)
    }
  }
  return characters
}

const shown = (codePoint: number): string =>
  `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')} ${String.fromCodePoint(codePoint)}`

const fontsState = exportFontsState()

describe('the export fonts cover every character the export can set', () => {
  it.skipIf(fontsState === 'pointers')(
    fontsState === 'pointers'
      ? `every character has a glyph in one of exportFontFiles (${pointersSkipReason})`
      : 'every character of the bundled Catalogue in both scripts, the template, the passage labels, U+4DC0–U+4DFF, ○ ✕ ━ has a glyph in one of exportFontFiles',
    async () => {
      const covered = new Set<number>()
      for (const { file } of exportFontFiles) {
        for (const codePoint of mappedCodePoints(readFileSync(fontPath(file))))
          covered.add(codePoint)
      }
      const characters = charactersOf([
        ...(await catalogueTexts()),
        // The template, as each Typst fixture writes it out.
        ...typstFixtures.map(({ file }) => typstFixture(file).toString('utf8')),
        passageLabels,
        hexagramSymbols,
        movingLineMarks[9],
        movingLineMarks[6],
        '○✕━',
      ])

      const uncovered = [...characters]
        .filter((codePoint) => !covered.has(codePoint))
        .toSorted((a, b) => a - b)
        .map(shown)

      expect(characters.size).toBeGreaterThan(1000)
      expect(uncovered).toEqual([])
    },
    120_000,
  )
})

// --- The committed bytes ------------------------------------------------------

/**
 * Each font file's SHA-256, as committed. A pointer file names the same
 * digest as its `oid`, so the rows hold in a clone without LFS too.
 */
const expectedSha256: Readonly<Record<string, string>> = {
  'LibertinusSerif-Regular.otf':
    'fcf06307a77367394fcb0ccb241e59eea70dba3d732be309647611224679c733',
  'LibertinusSerif-Bold.otf':
    '0264914210ed51b3231ebc92ce529e9f2e166ba9eebf0cd4a579558690a27b64',
  'LibertinusSerif-Italic.otf':
    '9a393d63d6e05f620d3dc0190dfd35a8ede58c0808cf0fc9de7fcb9c723e4c24',
  'NotoSerifCJKtc-Regular.otf':
    '234301038e76e7c35c43113785024700c4e4fe7bdce1d1fbbc42fca7e6683798',
  'NotoSansSymbols2-Regular.ttf':
    '3ce38effdb615dd929c8b0f52768dfa2cd21f206e3824bc7df61e4074b41ae52',
}

/** The SHA-256 of a font's bytes, or the one its LFS pointer names. */
function sha256Of(file: string): string {
  if (isLfsPointer(file)) {
    const oid = /^oid sha256:([0-9a-f]{64})$/m.exec(readFileSync(file, 'utf8'))
    if (oid === null) throw new Error(`${file} is a pointer with no oid`)
    return oid[1] ?? ''
  }
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

describe('the export fonts are the committed bytes', () => {
  it('expectedSha256 names exactly the files of exportFontFiles', () => {
    expect(Object.keys(expectedSha256).toSorted()).toEqual(
      exportFontFiles.map(({ file }) => file).toSorted(),
    )
  })

  it.each(exportFontFiles.map(({ file }) => file))(
    '%s has its recorded SHA-256',
    (file) => {
      expect(
        expectedSha256[file],
        `fill in expectedSha256 for ${file}`,
      ).toMatch(/^[0-9a-f]{64}$/)
      expect(sha256Of(fontPath(file))).toBe(expectedSha256[file])
    },
  )
})

// --- Git LFS and the licences -------------------------------------------------

const repositoryRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: path.dirname(fileURLToPath(import.meta.url)),
  encoding: 'utf8',
}).trim()

const fontExtensions = /\.(?:otf|ttf|ttc|woff2?)$/i

/** The font files the folder holds, whatever their names. */
const fontFilesInFolder = (): string[] =>
  readdirSync(fontFolder).filter((name) => fontExtensions.test(name))

const gitAttributes = (relative: string): Record<string, string> => {
  const output = execFileSync(
    'git',
    ['check-attr', 'filter', 'diff', 'merge', '--', relative],
    { cwd: repositoryRoot, encoding: 'utf8' },
  )
  return Object.fromEntries(
    output
      .trim()
      .split('\n')
      .map((row) => {
        const [, attribute = '', value = ''] = row.split(': ')
        return [attribute, value]
      }),
  )
}

describe('the export fonts are committed through Git LFS, each with its OFL licence', () => {
  it('the font folder holds the files of exportFontFiles and no other font', () => {
    expect(fontFilesInFolder().toSorted()).toEqual(
      exportFontFiles.map(({ file }) => file).toSorted(),
    )
  })

  it.each(exportFontFiles.map(({ file }) => file))(
    '%s: .gitattributes gives it to LFS, and git holds its pointer',
    (file) => {
      // Git reads a path with forward slashes, on Windows too.
      const relative = path
        .relative(repositoryRoot, fontPath(file))
        .split(path.sep)
        .join('/')

      expect(gitAttributes(relative)).toEqual({
        filter: 'lfs',
        diff: 'lfs',
        merge: 'lfs',
      })
      // The blob git stages or commits is the pointer, never the font.
      const staged = execFileSync('git', ['cat-file', 'blob', `:${relative}`], {
        cwd: repositoryRoot,
      })
      expect(staged.toString('latin1', 0, lfsPointerHead.length)).toBe(
        lfsPointerHead,
      )
    },
  )

  it.each(
    [
      ...new Set(exportFontFiles.map(({ file }) => file.split('-')[0] ?? file)),
    ].map((stem) => ({ stem })),
  )('$stem: an OFL licence text sits beside its fonts', ({ stem }) => {
    const licences = readdirSync(fontFolder).filter(
      (name) =>
        name.startsWith(stem) &&
        name.endsWith('.txt') &&
        readFileSync(fontPath(name), 'utf8').includes(
          'SIL OPEN FONT LICENSE Version 1.1',
        ),
    )

    expect(licences).not.toEqual([])
  })
})
