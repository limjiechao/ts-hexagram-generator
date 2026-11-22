// `drift:check [--root <dir>]` (ADR-0042, R-208, R-209, R-231, R-232): scans
// the `overhaul/` of the repo `<dir>` names, resolved from the working
// directory, or of this repo, and runs signal 4 over it; its contract is
// `ephemeral-finding.ts`'s. Report paths are relative to that repo's root,
// with `/`. It exits 1 on any finding, 0 when clean, and 2 on a tool error,
// which prints only the error, naming the root or the file.

import { stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import type { EphemeralCode } from './ephemeral-finding.js'
import { scanTree } from './scanner.js'
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
  const scan = await scanTree(root)
  if (!scan.ok) {
    fail(`overhaul/${scan.file} does not parse: ${scan.message}`)
    return
  }
  // Files come sorted by code units and findings by line and code (R-209).
  let findings = 0
  let files = 0
  for (const [file, records] of scan.files) {
    const found = findEphemeralIds(records)
    if (found.length > 0) files += 1
    for (const { line, code, ids } of found) {
      const cites = code === 'E7' ? 'R-199' : 'R-198'
      console.info(
        `overhaul/${file}:${line} ${code}: ${described[code]} ${ids.join(', ')}; comments and test names cite ADRs and glossary terms only (ADR-0042, ${cites})`,
      )
      findings += 1
    }
  }
  console.info(`drift:check: ${scan.files.size} files parsed in ${named}`)
  // N counts report lines, one per file, line and code (R-230).
  console.info(`signal 4: ${findings} findings in ${files} files`)
  if (findings > 0) process.exitCode = 1
}

await check(process.argv.slice(2)).catch((error: unknown) => {
  fail(String(error))
})
