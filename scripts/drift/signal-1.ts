// Drift signal 1 (ADR-0042, R-195, R-201, R-202, R-207, R-251 to R-255,
// R-261, R-262): the paths and symbols a source document names in code
// spans must exist. The contract is `doc-truth-finding.ts`'s.

import { glob, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import type {
  DocTruthCode,
  DocTruthException,
  DocTruthFinding,
  ExceptionsRead,
  FormerRoot,
  PathCheck,
  SourceRead,
  SourceWord,
  SymbolCheck,
} from './doc-truth-finding.js'

const heading = /^ {0,3}(#{1,6})(?:[ \t](.*))?$/
const fence = /^ {0,3}(`{3,}|~{3,})/
const oneSpan = /^(`+)([^`]*)\1$/

function cellsOf(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')
}

// A cell holding one code span, read without its backticks; '' otherwise.
function spanText(cell: string): string {
  return oneSpan.exec(cell.trim())?.[2]?.trim() ?? ''
}

export function readExceptions(text: string): ExceptionsRead {
  const lines = text.split(/\r?\n/)
  const exceptions: DocTruthException[] = []
  const formerRoots: FormerRoot[] = []
  const header = lines.findIndex((line) => {
    const cells = cellsOf(line).map((cell) => cell.trim())
    return (
      line.trimStart().startsWith('|') && cells.join('|') === 'File|Name|Reason'
    )
  })
  // Rows start after the delimiter row and run to the first non-`|` line.
  for (
    let index = header === -1 ? lines.length : header + 2;
    index < lines.length && (lines[index] ?? '').trimStart().startsWith('|');
    index++
  ) {
    const line = index + 1
    const [fileCell = '', nameCell = '', reasonCell = '', ...rest] = cellsOf(
      lines[index] ?? '',
    )
    const file = spanText(fileCell)
    const name = spanText(nameCell)
    const reason = reasonCell.trim()
    if (file === '' || name === '' || reason === '' || rest.length > 0)
      return {
        ok: false,
        line,
        message: 'an entry needs a File and a Name code span and a Reason',
      }
    const earlier = exceptions.find(
      (entry) => entry.file === file && entry.name === name,
    )
    if (earlier !== undefined)
      return {
        ok: false,
        line,
        message: `a duplicate of the entry on line ${earlier.line}`,
      }
    exceptions.push({ line, file, name, reason })
  }
  const listed = lines.findIndex((line) => line.trimEnd() === '## Former roots')
  const firstItem = listed === -1 ? lines.length : listed + 1
  for (let index = firstItem; index < lines.length; index++) {
    const item = lines[index] ?? ''
    if (heading.test(item)) break
    if (!item.startsWith('- ')) continue
    const root = spanText(item.slice(2))
    if (root === '')
      return {
        ok: false,
        line: index + 1,
        message: 'a former root needs one code span',
      }
    formerRoots.push({ line: index + 1, root })
  }
  return { ok: true, exceptions, formerRoots }
}

// A paragraph's text, its lines joined by `\n`, with each line's number.
interface Paragraph {
  readonly text: string
  readonly starts: readonly (readonly [offset: number, line: number])[]
}

function lineAt(paragraph: Paragraph, offset: number): number {
  let line = 0
  for (const [start, number] of paragraph.starts)
    if (start <= offset) line = number
  return line
}

// Code spans per CommonMark: a backtick run closes on the next run of the
// same length; a run with no match is literal text (R-251).
function spanWords(paragraph: Paragraph, words: SourceWord[]): void {
  const runs = [...paragraph.text.matchAll(/`+/g)]
  for (let open = 0; open < runs.length; open++) {
    const opening = runs[open]
    if (opening === undefined) continue
    const close = runs.findIndex(
      (run, index) => index > open && run[0].length === opening[0].length,
    )
    const closing = runs[close]
    if (closing === undefined) continue
    const line = lineAt(paragraph, opening.index)
    const inside = paragraph.text.slice(
      opening.index + opening[0].length,
      closing.index,
    )
    for (const word of inside.split(/\s+/))
      if (word !== '') words.push({ line, word })
    open = close
  }
}

export function readSource(text: string): SourceRead {
  const lines = text.split(/\r?\n/)
  const firstHeading = lines.findIndex((line) => line.startsWith('##'))
  const statusLine = lines
    .slice(0, firstHeading === -1 ? lines.length : firstHeading)
    .find((line) => line.startsWith('Status: '))
  const words: SourceWord[] = []
  let paragraph: { text: string; starts: [number, number][] } | undefined
  const flush = () => {
    if (paragraph !== undefined) spanWords(paragraph, words)
    paragraph = undefined
  }
  let fenceOpen = ''
  // The level of the Considered options heading being skipped, or 0.
  let skipping = 0
  for (const [index, line] of lines.entries()) {
    const number = index + 1
    const fenceRun = fence.exec(line)?.[1]
    if (fenceOpen !== '') {
      const closes =
        fenceRun !== undefined &&
        fenceRun[0] === fenceOpen[0] &&
        fenceRun.length >= fenceOpen.length &&
        line.trim() === fenceRun
      if (closes) fenceOpen = ''
      continue
    }
    if (fenceRun !== undefined) {
      flush()
      fenceOpen = fenceRun
      continue
    }
    const found = heading.exec(line)
    if (found !== null) {
      flush()
      const level = found[1]?.length ?? 0
      if (skipping !== 0 && level > skipping) continue
      // The text without its closing `#` run, as CommonMark reads it.
      const title = (found[2] ?? '').trim().replace(/(?:^|[ \t])#+$/, '')
      skipping = title.trim() === 'Considered options' ? level : 0
      if (skipping === 0) paragraph = { text: line, starts: [[0, number]] }
      flush()
      continue
    }
    if (skipping !== 0) continue
    if (line.trim() === '') {
      flush()
      continue
    }
    if (paragraph === undefined)
      paragraph = { text: line, starts: [[0, number]] }
    else {
      paragraph.starts.push([paragraph.text.length + 1, number])
      paragraph.text += `\n${line}`
    }
  }
  flush()
  return { status: statusLine?.slice('Status: '.length), words }
}

// Strips a trailing `#…`, `:N` or `:N-M`, then `/` (R-251).
function stripped(word: string): string {
  return word
    .replace(/#.*$/, '')
    .replace(/:\d+(?:-\d+)?$/, '')
    .replace(/\/+$/, '')
}

function withSlash(root: string): string {
  return root.endsWith('/') ? root : `${root}/`
}

export async function checkPaths(
  root: string,
  words: readonly SourceWord[],
  formerRoots: readonly string[],
  excepted: ReadonlySet<string>,
): Promise<PathCheck> {
  const listings = new Map<string, Promise<ReadonlySet<string>>>()
  const listing = (folder: string) => {
    let entries = listings.get(folder)
    if (entries === undefined) {
      entries = readdir(path.join(root, folder)).then(
        (names) => new Set(names),
        () => new Set<string>(),
      )
      listings.set(folder, entries)
    }
    return entries
  }
  // Each segment by exact case against its folder's listing (R-252).
  const exists = async (name: string) => {
    let folder = ''
    for (const segment of name.split(/[\\/]/)) {
      const entries = await listing(folder)
      if (!entries.has(segment)) return false
      folder = folder === '' ? segment : `${folder}/${segment}`
    }
    return true
  }
  const matchesSomething = async (pattern: string) => {
    for await (const match of glob(pattern, { cwd: root }))
      if (await exists(match)) return true
    return false
  }
  const misses = new Map<string, DocTruthFinding>()
  const exceptedNames: string[] = []
  const counts = new Map<string, number>()
  for (const { line, word } of words) {
    const name = stripped(word)
    if (/^(?:\.\.?)?\//.test(name) || /<[^>]*>/.test(name)) continue
    if (!name.includes('/')) continue
    // The root test ignores case, so a wrong-case root is still checked,
    // and still caught by the case-exact existence test (R-257).
    const lowered = `${name}/`.toLowerCase()
    const former = formerRoots.find((formerRoot) =>
      lowered.startsWith(withSlash(formerRoot).toLowerCase()),
    )
    if (former !== undefined) {
      counts.set(former, (counts.get(former) ?? 0) + 1)
      continue
    }
    const [first = ''] = name.split('/')
    const rootEntries = await listing('')
    const firstLowered = first.toLowerCase()
    if (![...rootEntries].some((entry) => entry.toLowerCase() === firstLowered))
      continue
    const code: DocTruthCode = /[*?[{]/.test(name) ? 'D2' : 'D1'
    const found =
      code === 'D2' ? await matchesSomething(name) : await exists(name)
    if (found) continue
    if (excepted.has(name)) {
      if (!exceptedNames.includes(name)) exceptedNames.push(name)
      continue
    }
    const key = `${line} ${code}`
    const finding = misses.get(key) ?? { line, code, names: [] }
    if (!finding.names.includes(name))
      misses.set(key, { ...finding, names: [...finding.names, name] })
  }
  const findings = [...misses.values()].toSorted(
    (a, b) => a.line - b.line || (a.code < b.code ? -1 : 1),
  )
  return { findings, excepted: exceptedNames, formerRoots: counts }
}

const codeFile = /\.(?:ts|tsx|mts|cts|js|mjs|cjs|json)$/
const skippedFolders: ReadonlySet<string> = new Set([
  'node_modules',
  'dist',
  'consultations',
])

// Every whole word in the code and JSON under `root` (R-210, R-262). A
// skipped folder is never entered, so nothing under `consultations/` is
// ever opened; a read error on a file that is entered is not swallowed.
export async function presentNames(root: string): Promise<ReadonlySet<string>> {
  const names = new Set<string>()
  const walk = async (folder: string): Promise<void> => {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const at = path.join(folder, entry.name)
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && !skippedFolders.has(entry.name))
          await walk(at)
      } else if (entry.isFile() && codeFile.test(entry.name)) {
        const text = await readFile(at, 'utf8')
        for (const [word] of text.matchAll(/[\w$]+/g)) names.add(word)
      }
    }
  }
  await walk(root)
  return names
}

// camelCase, or PascalCase with a lower-to-upper hump (R-261).
const symbol = /^(?=[A-Za-z]).*[a-z][A-Z]/

export function checkSymbols(
  words: readonly SourceWord[],
  present: ReadonlySet<string>,
  excepted: ReadonlySet<string>,
): SymbolCheck {
  const misses = new Map<number, string[]>()
  const exceptedNames: string[] = []
  for (const { line, word } of words) {
    // Paths are D1's and D2's (R-261).
    if (word.includes('/')) continue
    for (const token of word.split(/[^\w$]+/)) {
      if (!symbol.test(token) || present.has(token)) continue
      if (excepted.has(token)) {
        if (!exceptedNames.includes(token)) exceptedNames.push(token)
        continue
      }
      const names = misses.get(line) ?? []
      if (!names.includes(token)) misses.set(line, [...names, token])
    }
  }
  const findings = [...misses]
    .map(([line, names]): DocTruthFinding => ({ line, code: 'D3', names }))
    .toSorted((a, b) => a.line - b.line)
  return { findings, excepted: exceptedNames }
}
