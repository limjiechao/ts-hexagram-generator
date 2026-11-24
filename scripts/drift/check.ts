// `drift:check [--root <dir>]` (ADR-0042, R-208, R-209, R-231, R-232,
// R-243, R-247, R-253 to R-255, R-262, R-264): in the repo `<dir>` names, resolved from
// the working directory, or this repo, runs signal 1 over its source
// documents, reads its `CONTEXT.md`, scans its `overhaul/`, and runs signals
// 2 and 4 over it; their contracts are `doc-truth-finding.ts`'s,
// `glossary-finding.ts`'s and `ephemeral-finding.ts`'s. Report paths are
// relative to that repo's root, with `/`. It exits 1 on any finding, 0 when
// clean, and 2 on a tool error, which prints only the error, naming the
// root, `AGENTS.md`, `CONTEXT.md`, the exception file's line or the file.

import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import type {
  DocTruthException,
  DocTruthFinding,
  FormerRoot,
} from './doc-truth-finding.js'
import type { EphemeralCode } from './ephemeral-finding.js'
import type { AvoidForm } from './glossary-finding.js'
import { scanTree } from './scanner.js'
import {
  checkPaths,
  checkSymbols,
  presentNames,
  readExceptions,
  readSource,
} from './signal-1.js'
import { findGlossaryForms, readGlossary } from './signal-2.js'
import { findEphemeralIds } from './signal-4.js'

const described: Readonly<Record<EphemeralCode, string>> = {
  E1: 'question ID',
  E2: 'Matter ID',
  E3: 'seam ID',
  E4: 'B-number',
  E5: 'slice or wave label',
  E6: 'ephemeral record path or name',
  E7: 'Ruling ID',
}

interface Report {
  readonly file: string
  readonly line: number
  readonly code: string
  readonly text: string
}

function byCodeUnits(a: string, b: string): number {
  if (a < b) return -1
  return a > b ? 1 : 0
}

// Each form with its `CONTEXT.md` lines, as R-247 words it.
function describeForms(
  names: readonly string[],
  forms: ReadonlyMap<string, AvoidForm>,
): string {
  const each = names.map(
    (name) =>
      `"${name}" (CONTEXT.md:${forms.get(name)?.lines.join(', ') ?? ''})`,
  )
  return `Avoid form${names.length > 1 ? 's' : ''} ${each.join(', ')}`
}

function fail(message: string): void {
  console.error(`drift:check: ${message}`)
  process.exitCode = 2
}

const exceptionFile = 'scripts/drift/doc-truth-exceptions.md'
const citeD = '(ADR-0042, R-195)'

function quoted(names: readonly string[]): string {
  return names.map((name) => `"${name}"`).join(', ')
}

function describeMiss({ code, names }: DocTruthFinding): string {
  const several = names.length > 1
  if (code === 'D3')
    return `${several ? 'symbols' : 'symbol'} ${quoted(names)} ${several ? 'are' : 'is'} not in the code; docs name only what exists ${citeD}`
  const what =
    code === 'D2'
      ? `${several ? 'globs' : 'glob'} ${quoted(names)}${several ? ': each' : ''} matches nothing`
      : `${several ? 'paths' : 'path'} ${quoted(names)} ${several ? 'do' : 'does'} not exist`
  return `${what}; docs name only what exists ${citeD}`
}

async function readOptional(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, 'utf8')
  } catch {
    return
  }
}

async function namesIn(folder: string, pattern: RegExp): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => [])
  return entries
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => entry.name)
    .toSorted(byCodeUnits)
}

interface Signal1Run {
  readonly reports: readonly Report[]
  readonly summary: string
}

// Signal 1 over `AGENTS.md`, the Accepted ADRs and `docs/design/*.md`
// (R-207, R-253), with the exception file's entries and former roots
// (R-254); undefined after a tool error.
async function runSignal1(repo: string): Promise<Signal1Run | undefined> {
  const agents = await readOptional(path.join(repo, 'AGENTS.md'))
  if (agents === undefined) {
    fail('no AGENTS.md to read')
    return undefined
  }
  const documents: [string, string][] = [['AGENTS.md', agents]]
  for (const name of await namesIn(
    path.join(repo, 'docs/adr'),
    /^\d{4}-.*\.md$/,
  )) {
    const file = `docs/adr/${name}`
    const text = await readFile(path.join(repo, file), 'utf8')
    if (readSource(text).status?.startsWith('Accepted') === true)
      documents.push([file, text])
  }
  for (const name of await namesIn(path.join(repo, 'docs/design'), /\.md$/)) {
    const file = `docs/design/${name}`
    documents.push([file, await readFile(path.join(repo, file), 'utf8')])
  }
  const exceptionText = await readOptional(path.join(repo, exceptionFile))
  let exceptions: readonly DocTruthException[] = []
  let formerRoots: readonly FormerRoot[] = []
  if (exceptionText !== undefined) {
    const read = readExceptions(exceptionText)
    if (!read.ok) {
      fail(`${exceptionFile}:${read.line}: ${read.message}`)
      return undefined
    }
    ;({ exceptions, formerRoots } = read)
  }
  for (const { line, root } of formerRoots) {
    const there = await stat(path.join(repo, root)).then(
      () => true,
      () => false,
    )
    if (there) {
      fail(`${exceptionFile}:${line}: former root ${root} exists`)
      return undefined
    }
  }
  const reports: Report[] = []
  const used = new Set<DocTruthException>()
  const counts = new Map(formerRoots.map(({ root }) => [root, 0]))
  const present = await presentNames(repo)
  for (const [file, text] of documents) {
    const own = exceptions.filter((entry) => entry.file === file)
    const { words } = readSource(text)
    const excepted = new Set(own.map(({ name }) => name))
    const paths = await checkPaths(
      repo,
      words,
      formerRoots.map(({ root }) => root),
      excepted,
    )
    const symbols = checkSymbols(words, present, excepted)
    for (const finding of [...paths.findings, ...symbols.findings])
      reports.push({ file, ...finding, text: describeMiss(finding) })
    for (const entry of own)
      if (
        paths.excepted.includes(entry.name) ||
        symbols.excepted.includes(entry.name)
      )
        used.add(entry)
    for (const [root, count] of paths.formerRoots)
      counts.set(root, (counts.get(root) ?? 0) + count)
  }
  // An entry that excepts no miss of either checker is stale (R-195, R-254).
  for (const entry of exceptions)
    if (!used.has(entry))
      reports.push({
        file: exceptionFile,
        line: entry.line,
        code: 'D4',
        text: `exception for "${entry.name}" in ${entry.file} no longer matches a miss ${citeD}`,
      })
  const roots =
    [...counts].map(([root, count]) => `${root} ${count}`).join(', ') || 'none'
  const files = new Set(reports.map(({ file }) => file)).size
  return {
    reports,
    summary: `signal 1: ${reports.length} findings in ${files} files (${documents.length} documents read, ${exceptions.length} exceptions, former roots: ${roots})`,
  }
}

async function check(args: readonly string[]): Promise<void> {
  const given = args[0] === '--root' ? args[1] : undefined
  if (args.length > 0 && (given === undefined || args.length !== 2)) {
    fail('usage: drift:check [--root <dir>]')
    return
  }
  const repo =
    given === undefined
      ? fileURLToPath(new URL('../../', import.meta.url))
      : path.resolve(given)
  const root = path.join(repo, 'overhaul')
  const named =
    given === undefined ? 'overhaul/' : path.join(given, 'overhaul/')
  const isFolder = await stat(root).then(
    (stats) => stats.isDirectory(),
    () => false,
  )
  if (!isFolder) {
    fail(`no folder to scan at ${named}`)
    return
  }
  let glossaryText: string
  try {
    glossaryText = await readFile(path.join(repo, 'CONTEXT.md'), 'utf8')
  } catch {
    fail('no CONTEXT.md to read')
    return
  }
  const signal1 = await runSignal1(repo)
  if (signal1 === undefined) return
  const glossary = readGlossary(glossaryText)
  if (!glossary.ok) {
    fail(`CONTEXT.md:${glossary.line}: ${glossary.message}`)
    return
  }
  const scan = await scanTree(root)
  if (!scan.ok) {
    fail(`overhaul/${scan.file} does not parse: ${scan.message}`)
    return
  }
  const forms = new Map(glossary.forms.map((form) => [form.form, form]))
  const reports: Report[] = [...signal1.reports]
  // Files with findings, per signal; N counts report lines (R-230, R-236).
  const filesWith = { G: new Set<string>(), E: new Set<string>() }
  for (const [scanned, records] of scan.files) {
    const file = `overhaul/${scanned}`
    for (const { line, code, forms: found } of findGlossaryForms(
      file,
      records,
      glossary.forms,
    )) {
      filesWith.G.add(file)
      reports.push({
        file,
        line,
        code,
        text: `${describeForms(found, forms)}; identifiers and UI strings use glossary terms (ADR-0042, R-197)`,
      })
    }
    for (const { line, code, ids } of findEphemeralIds(records)) {
      filesWith.E.add(file)
      const cites = code === 'E7' ? 'R-199' : 'R-198'
      reports.push({
        file,
        line,
        code,
        text: `${described[code]} ${ids.join(', ')}; comments and test names cite ADRs and glossary terms only (ADR-0042, ${cites})`,
      })
    }
  }
  // Sorted by file, line and code, by code units (R-209).
  const sorted = reports.toSorted(
    (a, b) =>
      byCodeUnits(a.file, b.file) ||
      a.line - b.line ||
      byCodeUnits(a.code, b.code),
  )
  for (const { file, line, code, text } of sorted)
    console.info(`${file}:${line} ${code}: ${text}`)
  const count = (family: string) =>
    sorted.filter((report) => report.code.startsWith(family)).length
  console.info(`drift:check: ${scan.files.size} files parsed in ${named}`)
  console.info(signal1.summary)
  console.info(
    `signal 2: ${count('G')} findings in ${filesWith.G.size} files (${glossary.forms.length} forms checked, ${glossary.unmarked} unmarked)`,
  )
  console.info(`signal 4: ${count('E')} findings in ${filesWith.E.size} files`)
  if (reports.length > 0) process.exitCode = 1
}

await check(process.argv.slice(2)).catch((error: unknown) => {
  fail(String(error))
})
