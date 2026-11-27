/** The filesystem calls `fileIdentity` makes, injected so a test can stub them. */
export interface IdentityCalls {
  /** The file's device and inode, as `stat` gives them with `bigint: true`. */
  readonly stat: (
    file: string,
  ) => Promise<{ readonly dev: bigint; readonly ino: bigint }>
  /** The file's canonical path, every symbolic link resolved. */
  readonly realpath: (file: string) => Promise<string>
}

/**
 * Which file a path names, so the import reads, keeps and reports each
 * file once however many paths reach it: its device and inode, or its
 * canonical path when the inode is 0, as on a filesystem that reports
 * none. Undefined when the path cannot be stat'ed, or its canonical path
 * is needed and cannot be found; such a path has no identity, and is
 * skipped at each mention. The two forms are tagged so they never equal
 * each other.
 */
export async function fileIdentity(
  file: string,
  calls: IdentityCalls,
): Promise<string | undefined> {
  try {
    const { dev, ino } = await calls.stat(file)
    if (ino !== 0n) return `inode:${String(dev)}:${String(ino)}`
    return `path:${await calls.realpath(file)}`
  } catch {
    return undefined
  }
}
