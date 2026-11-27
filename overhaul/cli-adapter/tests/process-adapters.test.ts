import process from 'node:process'

import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import { describe, expect, it } from 'vitest'

import { processPorts } from '#src/process-adapters.js'

describe('processPorts: the adapters a bin passes', () => {
  it('passes the bundled Scripture Catalogue itself', () => {
    expect(processPorts(process).scriptureCatalogue).toBe(
      bundledScriptureCatalogue,
    )
  })

  it('still passes a Consultation Store that refuses every call', async () => {
    const { consultationStore } = processPorts(process)

    // Called inside a Promise, so a stub that throws at once refuses too.
    await expect(
      Promise.resolve().then(() => consultationStore.list()),
    ).rejects.toThrow()
    await expect(
      Promise.resolve().then(() => consultationStore.deletionRecords()),
    ).rejects.toThrow()
  })
})
