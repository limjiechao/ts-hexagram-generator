// Runs a drift script through tsx from the repo root, as `pnpm` would, and
// returns its exit code and output whether it passes or fails; the provers
// judge a script by both (R-215).

import { execFile } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))

export interface Run {
  readonly code: number | string
  readonly stdout: string
  readonly stderr: string
}

export async function runTsx(
  entry: string,
  args: readonly string[],
): Promise<Run> {
  try {
    const { stdout, stderr } = await promisify(execFile)(
      process.execPath,
      ['--import', 'tsx', entry, ...args],
      { cwd: repoRoot },
    )
    return { code: 0, stdout, stderr }
  } catch (error) {
    const { code, stdout, stderr } = error as Partial<Run>
    return { code: code ?? 'none', stdout: stdout ?? '', stderr: stderr ?? '' }
  }
}
