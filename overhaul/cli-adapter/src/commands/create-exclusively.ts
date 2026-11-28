import { randomUUID } from 'node:crypto'
import { link, open, rm } from 'node:fs/promises'
import path from 'node:path'

/*
 * The one way `hexagram-history` writes a file at a path the user gave:
 * whole or not at all, and never over a file already there.
 */

/**
 * Writes `contents`, text as UTF-8 or bytes as they are, at `file` only if
 * no file holds that path: `exists` when one does, `unwritable` on any
 * other failure. The contents are written whole beside it first and then
 * linked in, since a hard link, unlike a rename, refuses to replace a
 * file, so a reader never sees part of an export. A known limit: a
 * filesystem without hard links cannot be exported to.
 */
export async function createExclusively(
  file: string,
  contents: string | Uint8Array,
): Promise<'created' | 'exists' | 'unwritable'> {
  const temporary = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${randomUUID()}.tmp`,
  )
  try {
    const handle = await open(temporary, 'wx')
    try {
      await handle.writeFile(contents)
      await handle.sync()
    } finally {
      await handle.close()
    }
    await link(temporary, file)
    return 'created'
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      return 'exists'
    }
    return 'unwritable'
  } finally {
    // What is reported is the export, or the failure that stopped it; a
    // leftover dotfile `.tmp` is harmless, so a failed removal is ignored.
    await rm(temporary, { force: true, maxRetries: 3 }).catch(() => {})
  }
}
