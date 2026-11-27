import { describe, expect, it } from 'vitest'

import {
  fileIdentity,
  type IdentityCalls,
} from '#src/commands/file-identity.js'

// `fileIdentity` over stubbed filesystem calls. Only the equality of two
// identities is asserted, never their text. Every path below is invented.

interface StubFile {
  readonly dev: bigint
  readonly ino: bigint
  /** The canonical path; absent when `realpath` fails for it. */
  readonly real?: string
}

/** Calls over a table of paths; a path not in the table cannot be stat'ed. */
function stubCalls(files: Readonly<Record<string, StubFile>>): IdentityCalls {
  return {
    stat: (file) => {
      const found = files[file]
      return found === undefined
        ? Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
        : Promise.resolve({ dev: found.dev, ino: found.ino })
    },
    realpath: (file) => {
      const real = files[file]?.real
      return real === undefined
        ? Promise.reject(Object.assign(new Error('EIO'), { code: 'EIO' }))
        : Promise.resolve(real)
    },
  }
}

describe('fileIdentity', () => {
  it('gives two different real paths with no inode two identities', async () => {
    const calls = stubCalls({
      'd/a.txt': { dev: 0n, ino: 0n, real: '/share/d/a.txt' },
      'd/b.txt': { dev: 0n, ino: 0n, real: '/share/d/b.txt' },
    })

    const a = await fileIdentity('d/a.txt', calls)
    const b = await fileIdentity('d/b.txt', calls)

    expect(a).toBeDefined()
    expect(b).toBeDefined()
    expect(a).not.toBe(b)
  })

  it('gives one real path with no inode, reached by two names, one identity', async () => {
    const calls = stubCalls({
      'd/a.txt': { dev: 0n, ino: 0n, real: '/share/d/a.txt' },
      'link-to-a.txt': { dev: 0n, ino: 0n, real: '/share/d/a.txt' },
    })

    const first = await fileIdentity('d/a.txt', calls)
    const second = await fileIdentity('link-to-a.txt', calls)

    expect(first).toBeDefined()
    expect(first).toBe(second)
  })

  it('gives two names with equal device and inode one identity, whatever their real paths', async () => {
    const calls = stubCalls({
      'd/a.txt': { dev: 7n, ino: 42n, real: '/home/d/a.txt' },
      'hard-link.txt': { dev: 7n, ino: 42n, real: '/home/hard-link.txt' },
    })

    const first = await fileIdentity('d/a.txt', calls)
    const second = await fileIdentity('hard-link.txt', calls)

    expect(first).toBeDefined()
    expect(first).toBe(second)
  })

  it('gives different inodes, or one inode on different devices, different identities', async () => {
    const calls = stubCalls({
      'd/a.txt': { dev: 7n, ino: 42n },
      'd/b.txt': { dev: 7n, ino: 43n },
      'e/a.txt': { dev: 8n, ino: 42n },
    })

    const identities = await Promise.all(
      ['d/a.txt', 'd/b.txt', 'e/a.txt'].map((file) =>
        fileIdentity(file, calls),
      ),
    )

    expect(identities.every((identity) => identity !== undefined)).toBe(true)
    expect(new Set(identities).size).toBe(3)
  })

  it('keeps inodes beyond 2^53 apart', async () => {
    const calls = stubCalls({
      'd/a.txt': { dev: 7n, ino: 2n ** 60n },
      'd/b.txt': { dev: 7n, ino: 2n ** 60n + 1n },
    })

    expect(await fileIdentity('d/a.txt', calls)).not.toBe(
      await fileIdentity('d/b.txt', calls),
    )
  })

  it.each(['7:42', '7-42', '0x7:0x2a', 'ino:7:42', 'dev:7:ino:42', '42'])(
    'never gives an inode identity equal to a path identity, even for the real path %j',
    async (real) => {
      const calls = stubCalls({
        'by-inode.txt': { dev: 7n, ino: 42n },
        'by-path.txt': { dev: 0n, ino: 0n, real },
      })

      const byInode = await fileIdentity('by-inode.txt', calls)
      const byPath = await fileIdentity('by-path.txt', calls)

      expect(byInode).toBeDefined()
      expect(byPath).toBeDefined()
      expect(byInode).not.toBe(byPath)
    },
  )

  it('has no identity for a path that cannot be stat’ed', async () => {
    expect(await fileIdentity('missing.txt', stubCalls({}))).toBeUndefined()
  })

  it('has no identity for a path with no inode whose real path cannot be found', async () => {
    const calls = stubCalls({ 'd/a.txt': { dev: 0n, ino: 0n } })

    expect(await fileIdentity('d/a.txt', calls)).toBeUndefined()
  })

  it('never throws, even when a call throws instead of rejecting', async () => {
    const throwing: IdentityCalls = {
      stat: () => {
        throw new Error('stat threw')
      },
      realpath: () => {
        throw new Error('realpath threw')
      },
    }
    const noInodeThenThrow: IdentityCalls = {
      stat: () => Promise.resolve({ dev: 0n, ino: 0n }),
      realpath: () => {
        throw new Error('realpath threw')
      },
    }

    await expect(fileIdentity('d/a.txt', throwing)).resolves.toBeUndefined()
    await expect(
      fileIdentity('d/a.txt', noInodeThenThrow),
    ).resolves.toBeUndefined()
  })
})
