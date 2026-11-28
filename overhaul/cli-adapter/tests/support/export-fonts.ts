import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { exportFontFiles, exportFontFolder } from '#src/typst-pdf.js'

// The export's fonts as the tests find them: real font bytes, Git LFS
// pointers left by a clone without LFS, or not there at all.

/** How a Git LFS pointer file begins. */
export const lfsPointerHead: string =
  'version https://git-lfs.github.com/spec/v1'

/** An invented LFS pointer, as a clone without LFS leaves one. */
export const inventedLfsPointer: string = `${lfsPointerHead}
oid sha256:0000000000000000000000000000000000000000000000000000000000000000
size 12345
`

/** Whether the file at `file` is an LFS pointer rather than its content. */
export function isLfsPointer(file: string): boolean {
  return (
    readFileSync(file).subarray(0, lfsPointerHead.length).toString('latin1') ===
    lfsPointerHead
  )
}

/**
 * The state of the font folder: `real` when every file of `exportFontFiles`
 * is there and none is a pointer, `pointers` when every one is there and
 * some are pointers, `missing` otherwise.
 */
export function exportFontsState(): 'real' | 'pointers' | 'missing' {
  let folder: string
  try {
    folder = exportFontFolder()
  } catch {
    // Not found at all; the font folder's own row says why.
    return 'missing'
  }
  const files = exportFontFiles.map(({ file }) => path.join(folder, file))
  if (!files.every((file) => existsSync(file))) return 'missing'
  return files.some(isLfsPointer) ? 'pointers' : 'real'
}

/** Why a row that needs real font bytes is skipped. */
export const pointersSkipReason: string =
  'skipped: the export fonts are Git LFS pointers; run `git lfs pull` to fetch them'

/**
 * A fresh font folder under the system's temporary directory, each real
 * font linked in by name, except those `replaced` names, which hold the
 * bytes given instead, or are left out when given `undefined`. Removed by
 * the returned `remove`.
 */
export async function fontFolderWith(
  replaced: Readonly<Record<string, string | undefined>> = {},
): Promise<{ readonly folder: string; readonly remove: () => Promise<void> }> {
  const folder = await mkdtemp(path.join(tmpdir(), 'hexagram-fonts-'))
  const real = exportFontFolder()
  for (const { file } of exportFontFiles) {
    const target = path.join(folder, file)
    if (!(file in replaced)) {
      await symlink(path.join(real, file), target)
      continue
    }
    const bytes = replaced[file]
    if (bytes !== undefined) await writeFile(target, bytes)
  }
  return {
    folder,
    remove: () => rm(folder, { recursive: true, force: true }),
  }
}
