import { afterEach, describe, expect, it, vi } from 'vitest'

import { markdownConsultationStore } from '#src/markdown-consultation-store.js'

import {
  castRecord,
  consultationOf,
  fakeRenderBody,
  markdownFiles,
  removeTemporaryFolders,
  temporaryFolder,
} from './support/journal-folder.js'

// Every name and text below is invented (ADR-0015). A temporary file whose
// removal fails cannot be arranged on a real file system, so while
// `cleanup.failing` is set, removing any `.tmp` file is made to fail.

const cleanup = vi.hoisted(() => ({ failing: false, refused: 0 }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  const refuses = (target: unknown): boolean =>
    cleanup.failing && String(target).endsWith('.tmp')
  const denied = (): Promise<never> => {
    cleanup.refused += 1
    return Promise.reject(
      Object.assign(new Error('EPERM: operation not permitted'), {
        code: 'EPERM',
      }),
    )
  }
  const rm: typeof actual.rm = (target, options) =>
    refuses(target) ? denied() : actual.rm(target, options)
  const unlink: typeof actual.unlink = (target) =>
    refuses(target) ? denied() : actual.unlink(target)
  return { ...actual, default: { ...actual, rm, unlink }, rm, unlink }
})

afterEach(async () => {
  cleanup.failing = false
  cleanup.refused = 0
  await removeTemporaryFolders()
})

describe('keep when its temporary file cannot be removed', () => {
  it('still resolves, the kept file in place', async () => {
    const folder = await temporaryFolder()
    const consultation = consultationOf(castRecord())
    const { consultationStore } = markdownConsultationStore({
      journalFolder: folder,
      renderBody: fakeRenderBody(),
    })
    cleanup.failing = true

    await expect(consultationStore.keep(consultation)).resolves.toBeUndefined()

    cleanup.failing = false
    expect(cleanup.refused).toBeGreaterThan(0)
    const name = `2026-11-26--${consultation.id}.md`
    expect(await markdownFiles(folder)).toEqual([name])
    await expect(consultationStore.get(consultation.id)).resolves.toEqual(
      consultation,
    )
  })
})
