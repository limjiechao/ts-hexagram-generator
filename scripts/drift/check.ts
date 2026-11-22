// `drift:check [--root <dir>]` (ADR-0042, R-208, R-209): scans `overhaul/`,
// or `<dir>` resolved from the working directory, alone. Until a signal lands it only
// walks and parses, so it has no findings: it exits 0 with its summary, or 2
// on a tool error naming the root or the file, relative to the root with `/`.

import { stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { scanTree } from './scanner.js'

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
  const root =
    given === undefined
      ? fileURLToPath(new URL('../../overhaul/', import.meta.url))
      : path.resolve(given)
  const named = given ?? 'overhaul/'
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
    fail(`${scan.file} does not parse: ${scan.message}`)
    return
  }
  console.info(`drift:check: ${scan.files.size} files parsed in ${named}`)
}

await check(process.argv.slice(2)).catch((error: unknown) => {
  fail(String(error))
})
