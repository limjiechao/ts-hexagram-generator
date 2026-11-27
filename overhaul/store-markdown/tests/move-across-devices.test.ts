import { Buffer } from 'node:buffer'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { markdownConsultationStore } from '#src/markdown-consultation-store.js'

import {
  fakeRenderBody,
  readFixture,
  regularFiles,
  removeTemporaryFolders,
  temporaryFolder,
} from './support/journal-folder.js'

// Every name and text below is invented (ADR-0015). A second device is not
// available to a test, so the first hard link from the original is made to
// fail as it does across devices.

const crossDevice = vi.hoisted(() => ({ original: '' }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  const pathModule = await import('node:path')
  const link: typeof actual.link = (existingPath, newPath) => {
    if (
      crossDevice.original !== '' &&
      pathModule.resolve(String(existingPath)) === crossDevice.original
    ) {
      crossDevice.original = ''
      return Promise.reject(
        Object.assign(new Error('EXDEV: cross-device link not permitted'), {
          code: 'EXDEV',
        }),
      )
    }
    return actual.link(existingPath, newPath)
  }
  return { ...actual, default: { ...actual, link }, link }
})

afterEach(removeTemporaryFolders)

describe('moveToLegacy across devices', () => {
  it('copies the file under a free name, leaving the taken one untouched', async () => {
    const folder = await temporaryFolder()
    const elsewhere = await temporaryFolder()
    const legacy = path.join(folder, 'legacy')
    await mkdir(legacy)
    await writeFile(path.join(legacy, 'greyfen.md'), 'Already moved.\n')
    const original = path.join(elsewhere, 'greyfen.md')
    const bytes = Buffer.from(await readFixture('version-1.md'), 'utf8')
    await writeFile(original, bytes)
    crossDevice.original = path.resolve(original)

    await markdownConsultationStore({
      journalFolder: folder,
      renderBody: fakeRenderBody(),
    }).moveToLegacy(original)

    expect(crossDevice.original).toBe('')
    expect(await regularFiles(elsewhere)).toEqual([])
    expect(await regularFiles(legacy)).toEqual(['greyfen-2.md', 'greyfen.md'])
    expect(await readFile(path.join(legacy, 'greyfen.md'), 'utf8')).toBe(
      'Already moved.\n',
    )
    expect(await readFile(path.join(legacy, 'greyfen-2.md'))).toEqual(bytes)
  })
})
