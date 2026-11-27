import { randomUUID } from 'node:crypto'
import {
  chmod,
  constants,
  copyFile,
  link,
  open,
  rename,
  rm,
  stat,
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
    await removeTemporary(temporary)
  }
}

/**
 * Replaces the file `name` in `folder` with `text` in one step, keeping the
 * file's mode (ADR-0030).
 */
export async function replaceAtomically(
  folder: string,
  name: string,
  text: string,
): Promise<void> {
  const target = path.join(folder, name)
  const { mode } = await stat(target)
  const temporary = temporaryPath(folder, name)
  try {
    await writeDurably(temporary, text)
    await chmod(temporary, mode)
    await rename(temporary, target)
  } catch (error) {
    await rm(temporary, { force: true })
    throw error
  }
}

/**
 * Moves the file `from` into `folder` under the first name `nameFor` gives,
 * counting attempts from 1, that no file holds. It never replaces a file.
 */
export async function moveExclusively(
  from: string,
  folder: string,
  nameFor: (attempt: number) => string,
): Promise<void> {
  if (!(await linkUnderFreeName(from, folder, nameFor))) {
    // A hard link cannot cross devices, so a copy is made in `folder` and
    // linked instead; a partial copy then never holds a free name.
    const temporary = temporaryPath(folder, nameFor(1))
    try {
      await copyFile(from, temporary, constants.COPYFILE_EXCL)
      if (!(await linkUnderFreeName(temporary, folder, nameFor))) {
        throw new Error(`${temporary} cannot be linked within ${folder}`)
      }
    } finally {
      await removeTemporary(temporary)
    }
  }
  await unlink(from)
}

/** Links `file` under the first free name; false when it is on another device. */
async function linkUnderFreeName(
  file: string,
  folder: string,
  nameFor: (attempt: number) => string,
): Promise<boolean> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await link(file, path.join(folder, nameFor(attempt)))
      return true
    } catch (error) {
      if (hasCode(error, 'EXDEV')) {
        return false
      }
      if (!hasCode(error, 'EEXIST')) {
        throw error
      }
    }
  }
}

// A dotfile not ending in `.md`, so the Store never reads it as a
// Consultation, and unique, so writes running at once never share one.
function temporaryPath(folder: string, name: string): string {
  return path.join(folder, `.${name}.${randomUUID()}.tmp`)
}

// Retried, since on Windows a scanner or indexer briefly holding the
// freshly linked file makes the first removal fail with EBUSY or EPERM.
async function removeTemporary(file: string): Promise<void> {
  await rm(file, { force: true, maxRetries: 3 })
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
