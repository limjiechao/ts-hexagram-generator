import process from 'node:process'

import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import { markdownConsultationStore } from '@hexagram/store-markdown/markdown-consultation-store'
import { describe, expect, it, vi } from 'vitest'

import { journalFolder } from '#src/journal-folder.js'
import { processPorts } from '#src/process-adapters.js'
import { markdownBodyRenderer } from '#src/readout/markdown-body.js'

// The Store builder and the body renderer are replaced by stand-ins that
// only say what they were given, so nothing here reads or writes the
// Journal folder the bins use: the real one, of this checkout.
const standIns = vi.hoisted(() => {
  const unusable = (): never => {
    throw new Error('a stand-in was called')
  }
  return {
    renderBody: unusable,
    store: {
      consultationStore: {
        keep: unusable,
        list: unusable,
        get: unusable,
        remove: unusable,
        deletionRecords: unusable,
      },
      rerenderBodies: unusable,
      moveToLegacy: unusable,
    },
  }
})

vi.mock('@hexagram/store-markdown/markdown-consultation-store', () => ({
  markdownConsultationStore: vi.fn(() => standIns.store),
}))

vi.mock('#src/readout/markdown-body.js', () => ({
  markdownBodyRenderer: vi.fn(() => standIns.renderBody),
}))

describe('processPorts: the adapters a bin passes', () => {
  it('passes the bundled Scripture Catalogue itself', () => {
    expect(processPorts(process).scriptureCatalogue).toBe(
      bundledScriptureCatalogue,
    )
  })

  it('passes the Markdown Store over the Journal folder, its bodies rendered from the bundled Catalogue', () => {
    vi.mocked(markdownConsultationStore).mockClear()
    vi.mocked(markdownBodyRenderer).mockClear()

    const ports = processPorts(process)

    expect(vi.mocked(markdownBodyRenderer).mock.calls).toEqual([
      [{ scriptureCatalogue: bundledScriptureCatalogue }],
    ])
    expect(vi.mocked(markdownConsultationStore).mock.calls).toEqual([
      [{ journalFolder: journalFolder(), renderBody: standIns.renderBody }],
    ])
    expect(ports.journalFolder).toBe(journalFolder())
    expect(ports.consultationStore).toBe(standIns.store.consultationStore)
    expect(ports.moveToLegacy).toBe(standIns.store.moveToLegacy)
    expect(ports.rerenderBodies).toBe(standIns.store.rerenderBodies)
  })
})
