import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// The Journal's folder is anchored to the repository root, never to the
// directory a command is run from (ADR-0020): walk up from this module to the
// folder holding the workspace marker.

const workspaceMarker = 'pnpm-workspace.yaml'

/** The name of the Journal's folder under the repository root (ADR-0020). */
const journalFolderName = 'consultations'

/**
 * The repository root: the nearest folder at or above `startFolder` that holds
 * `pnpm-workspace.yaml`. Throws when none is found, a layout error rather than
 * a condition to recover from.
 */
function findRepositoryRoot(startFolder: string): string {
  let folder = startFolder
  while (!existsSync(path.join(folder, workspaceMarker))) {
    const parent = path.dirname(folder)
    if (parent === folder) {
      throw new Error(
        `no ${workspaceMarker} in ${startFolder} or any folder above it`,
      )
    }
    folder = parent
  }
  return folder
}

/** The Journal's folder, from this module's own location. */
export function journalFolder(moduleUrl: string = import.meta.url): string {
  return path.join(
    findRepositoryRoot(path.dirname(fileURLToPath(moduleUrl))),
    journalFolderName,
  )
}
