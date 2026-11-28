import { existsSync, readFileSync } from 'node:fs'
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

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

/** A temporary font folder and how to remove it. */
export interface MadeFontFolder {
  readonly folder: string
  readonly remove: () => Promise<void>
}

/**
 * A fresh font folder under the system's temporary directory, each real
 * font linked in by name, except those `replaced` names, which hold the
 * bytes given instead, or are left out when given `undefined`. Removed by
 * the returned `remove`.
 */
export async function fontFolderWith(
  replaced: Readonly<Record<string, string | undefined>> = {},
): Promise<MadeFontFolder> {
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

/**
 * Bytes that begin as an OpenType font does (`OTTO`) and hold no table, so
 * they pass a check of the first four bytes and no font parser takes them.
 */
export const inventedFontLikeBytes: string = `OTTO${'\u0000'.repeat(60)}`

/**
 * Whether a file's mode can make it unreadable here: not on Windows, and
 * not as root, who reads it anyway.
 */
export const modeCanDenyReading: boolean =
  process.platform !== 'win32' && process.getuid?.() !== 0

/**
 * The ways a font file is there but cannot be read, each a font folder
 * built like `fontFolderWith`'s with `file` made so: `EACCES` a file of
 * mode 000, `EISDIR` a folder under the font's name.
 */
export const unreadableFonts = {
  EACCES: async (file: string): Promise<MadeFontFolder> => {
    const made = await fontFolderWith({ [file]: inventedFontLikeBytes })
    await chmod(path.join(made.folder, file), 0o000)
    return made
  },
  EISDIR: async (file: string): Promise<MadeFontFolder> => {
    const made = await fontFolderWith({ [file]: undefined })
    await mkdir(path.join(made.folder, file))
    return made
  },
} as const
