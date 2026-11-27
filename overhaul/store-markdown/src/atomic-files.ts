import { randomUUID } from 'node:crypto'
import {
  constants,
  copyFile,
  link,
  open,
  rename,
  rm,
  unlink,
} from 'node:fs/promises'
import path from 'node:path'

/** Whether a Node file-system error carries this `code`. */
export function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code
}

/**
 * Writes `text` as `name` in `folder` only if no file holds that name,
 * resolving to whether it did. A reader sees the whole file or none of it
 * (ADR-0030).
 */
export async function createExclusively(
  folder: string,
  name: string,
  text: string,
): Promise<boolean> {
  const temporary = temporaryPath(folder, name)
  try {
    await writeDurably(temporary, text)
    // A hard link, unlike a rename, refuses to replace an existing file.
    await link(temporary, path.join(folder, name))
    return true
  } catch (error) {
    if (hasCode(error, 'EEXIST')) {
      return false
    }
    throw error
  } finally {
    await rm(temporary, { force: true })
  }
}

/** Replaces the file `name` in `folder` with `text` in one step (ADR-0030). */
export async function replaceAtomically(
  folder: string,
  name: string,
  text: string,
): Promise<void> {
  const temporary = temporaryPath(folder, name)
  try {
    await writeDurably(temporary, text)
    await rename(temporary, path.join(folder, name))
  } catch (error) {
    await rm(temporary, { force: true })
    throw error
  }
}

/**
 * Moves the file `from` to `to` unless a file holds `to`, resolving to
 * whether it moved.
 */
export async function moveExclusively(
  from: string,
  to: string,
): Promise<boolean> {
  try {
    await link(from, to)
  } catch (error) {
    if (hasCode(error, 'EEXIST')) {
      return false
    }
    // A hard link cannot cross devices, so the file is copied instead.
    if (!hasCode(error, 'EXDEV')) {
      throw error
    }
    try {
      await copyFile(from, to, constants.COPYFILE_EXCL)
    } catch (copyError) {
      if (hasCode(copyError, 'EEXIST')) {
        return false
      }
      // The exclusive copy created `to`, so a partial copy is ours to remove.
      await rm(to, { force: true })
      throw copyError
    }
  }
  await unlink(from)
  return true
}

// A dotfile not ending in `.md`, so the Store never reads it as a
// Consultation, and unique, so writes running at once never share one.
function temporaryPath(folder: string, name: string): string {
  return path.join(folder, `.${name}.${randomUUID()}.tmp`)
}

async function writeDurably(file: string, text: string): Promise<void> {
  const handle = await open(file, 'wx')
  try {
    await handle.writeFile(text, 'utf8')
    await handle.sync()
  } finally {
    await handle.close()
  }
}
