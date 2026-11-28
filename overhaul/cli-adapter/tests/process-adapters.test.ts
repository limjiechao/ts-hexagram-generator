import process from 'node:process'

import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import { markdownConsultationStore } from '@hexagram/store-markdown/markdown-consultation-store'
import { describe, expect, it, vi } from 'vitest'

import { journalFolder } from '#src/journal-folder.js'
import { processPorts } from '#src/process-adapters.js'
import { markdownBodyRenderer } from '#src/readout/markdown-body.js'
import { exportFontFolder, typstPdfCompiler } from '#src/typst-pdf.js'

// The Store builder, the body renderer and the PDF compiler's builder are
// replaced by stand-ins that only say what they were given, so nothing here
// reads or writes the Journal folder the bins use, the real one of this
// checkout, and nothing loads Typst.
const standIns = vi.hoisted(() => {
  const unusable = (): never => {
    throw new Error('a stand-in was called')
  }
  return {
    renderBody: unusable,
    compilePdf: (typst: string) =>
      Promise.resolve(new TextEncoder().encode(`%PDF-stand-in ${typst}`)),
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

vi.mock('#src/typst-pdf.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#src/typst-pdf.js')>()),
  typstPdfCompiler: vi.fn(() => standIns.compilePdf),
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

  it('passes the real PDF compiler over the export’s font folder, built without compiling anything', async () => {
    vi.mocked(typstPdfCompiler).mockClear()

    const ports = processPorts(process)
    const compiled = await ports.compilePdf('an invented source')

    expect(vi.mocked(typstPdfCompiler).mock.calls).toEqual([
      [exportFontFolder()],
    ])
    expect(new TextDecoder().decode(compiled)).toBe(
      '%PDF-stand-in an invented source',
    )
  })
})
