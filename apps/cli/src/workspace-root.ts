import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { CONSULTATIONS_DIR_NAME } from '@hexagram/consultation-file'

// The consultations directory must stay anchored to the monorepo root, NOT to
// `process.cwd()`. `defaultConsultationsDir()` (in @hexagram/consultation-file)
// is medium-neutral and resolves `<cwd>/consultations` — correct when the bin
// is invoked from the repo root, but wrong when invoked from this package's own
// directory (`apps/cli`), where it would resolve `apps/cli/consultations`.
//
// The root-anchoring is an app-layer concern: walk up from this module's own
// location until we find the workspace marker (`pnpm-workspace.yaml`), then
// resolve `consultations/` relative to that root. The app passes the result as
// the explicit `dir` into the consultation-file / history APIs (which already
// accept a `dir`), so the directory is stable regardless of the invocation cwd.

const WORKSPACE_MARKER = 'pnpm-workspace.yaml'

/**
 * Find the monorepo root by walking up from `startDir` until a directory
 * containing `pnpm-workspace.yaml` is found. Throws if no marker is reached
 * before the filesystem root — a build/layout error worth failing loudly on,
 * not a recoverable runtime condition.
 */
export function findWorkspaceRoot(startDir: string): string {
  let dir = startDir
  while (true) {
    if (existsSync(path.join(dir, WORKSPACE_MARKER))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) {
      throw new Error(
        `Could not locate ${WORKSPACE_MARKER} walking up from ${startDir}`,
      )
    }
    dir = parent
  }
}

/**
 * The monorepo root, resolved from this module's own location
 * (`import.meta.url`) — independent of `process.cwd()`.
 */
export function workspaceRoot(moduleUrl: string = import.meta.url): string {
  return findWorkspaceRoot(path.dirname(fileURLToPath(moduleUrl)))
}

/**
 * The repo-root-anchored consultations directory. Resolved from this module's
 * own location (`import.meta.url`), so it is independent of `process.cwd()`.
 */
export function workspaceConsultationsDir(
  moduleUrl: string = import.meta.url,
): string {
  return path.join(workspaceRoot(moduleUrl), CONSULTATIONS_DIR_NAME)
}

/**
 * Anchor `process.cwd()` to the monorepo root for the lifetime of a bin.
 *
 * The casting save path (`saveConsultationFile` inside the Ink viewer and
 * `logAndSaveConsultationOutput`) and the shell's History mount resolve their
 * directory via `defaultConsultationsDir()` = `<cwd>/consultations`, and they
 * do NOT accept an explicit `dir`. Rather than ripple a `dir` prop through the
 * whole viewer component tree, the app layer pins cwd to the workspace root at
 * bin entry — so every consumer of the medium-neutral `defaultConsultationsDir`
 * lands on `<repo-root>/consultations`, no matter which directory the user ran
 * the command from. History/migration additionally pass the explicit dir.
 */
export function anchorCwdToWorkspaceRoot(
  moduleUrl: string = import.meta.url,
): void {
  process.chdir(workspaceRoot(moduleUrl))
}
