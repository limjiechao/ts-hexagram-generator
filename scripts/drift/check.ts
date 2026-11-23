// `drift:check [--root <dir>]` (ADR-0042, R-208, R-209, R-231, R-232,
// R-243, R-247): reads the `CONTEXT.md` of the repo `<dir>` names, resolved
// from the working directory, or of this repo, scans its `overhaul/`, and
// runs signals 2 and 4 over it; their contracts are `glossary-finding.ts`'s
// and `ephemeral-finding.ts`'s. Report paths are relative to that repo's
// root, with `/`. It exits 1 on any finding, 0 when clean, and 2 on a tool
// error, which prints only the error, naming the root, `CONTEXT.md` or the
// file.

import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import type { EphemeralCode } from './ephemeral-finding.js'
import type { AvoidForm } from './glossary-finding.js'
import { scanTree } from './scanner.js'
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
  const reports: Report[] = []
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
  console.info(
    `signal 2: ${count('G')} findings in ${filesWith.G.size} files (${glossary.forms.length} forms checked, ${glossary.unmarked} unmarked)`,
  )
  console.info(`signal 4: ${count('E')} findings in ${filesWith.E.size} files`)
  if (reports.length > 0) process.exitCode = 1
}

await check(process.argv.slice(2)).catch((error: unknown) => {
  fail(String(error))
})
