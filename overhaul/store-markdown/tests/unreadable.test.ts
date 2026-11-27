import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { UnreadableReason } from '@hexagram/consultation-journal/unreadable-file'
import { afterEach, describe, expect, it } from 'vitest'

import { markdownConsultationStore } from '#src/markdown-consultation-store.js'

import {
  castFrontmatter,
  castRecord,
  consultationOf,
  fakeRenderBody,
  fileText,
  plant,
  readFixture,
  removeTemporaryFolders,
  snapshot,
  temporaryFolder,
} from './support/journal-folder.js'

// Every Query, Id and date below is invented (ADR-0015).

afterEach(removeTemporaryFolders)

function storeOver(journalFolder: string, renderBody = fakeRenderBody()) {
  return markdownConsultationStore({ journalFolder, renderBody })
}

const cast = consultationOf(castRecord())
const plantedName = '2026-11-26--01M8AJDS3VQ4X7M2N5P9T0W1YC.md'

/** Plants one file and lists the Journal it is alone in. */
async function listAlone(text: string) {
  const folder = await temporaryFolder()
  await plant(folder, plantedName, text)
  return storeOver(folder).consultationStore.list()
}

async function expectUnreadable(text: string, reason: UnreadableReason) {
  expect(await listAlone(text)).toEqual({
    consultations: [],
    unreadable: [{ location: plantedName, reason }],
  })
}

describe('no-frontmatter', () => {
  it.each([
    ['a body alone', '# Greyfen granary\n\nNo record here.\n'],
    ['an empty file', ''],
  ])('makes %s Unreadable', async (_, text) => {
    await expectUnreadable(text, { kind: 'no-frontmatter' })
  })
})

describe('not-yaml', () => {
  it.each([
    ['an unclosed flow sequence', castFrontmatter({ casting: '[[4, 3, 4]' })],
    ['an unclosed quotation', castFrontmatter({ query: '"Will Ashmere' })],
  ])('makes frontmatter with %s Unreadable', async (_, frontmatter) => {
    await expectUnreadable(fileText(frontmatter), { kind: 'not-yaml' })
  })

  it.each([
    [
      '!!js/function',
      `!!js/function 'function () { globalThis.yamlRan = true }'`,
    ],
    ['!!js/undefined', `!!js/undefined ''`],
    ['!!js/regexp', '!!js/regexp /Greyfen/'],
  ])(
    'refuses the unsafe %s tag as not YAML and runs nothing',
    async (_, value) => {
      await expectUnreadable(fileText(castFrontmatter({ query: value })), {
        kind: 'not-yaml',
      })
      expect(Reflect.get(globalThis, 'yamlRan')).toBeUndefined()
    },
  )
})

describe('not-version-2', () => {
  it.each([
    ['schemaVersion 3', castFrontmatter({ schemaVersion: '3' })],
    ['no schemaVersion', castFrontmatter({ schemaVersion: '' })],
    ['schemaVersion as text', castFrontmatter({ schemaVersion: "'2'" })],
    ['a sequence for a record', '- Greyfen\n- Ashmere\n'],
    ['a scalar for a record', 'Greyfen\n'],
  ])('makes a record with %s Unreadable', async (_, frontmatter) => {
    await expectUnreadable(fileText(frontmatter), { kind: 'not-version-2' })
  })

  it('makes a version-1 file Unreadable', async () => {
    await expectUnreadable(await readFixture('version-1.md'), {
      kind: 'not-version-2',
    })
  })
})

describe('invalid-field', () => {
  it.each([
    ['id', 'a malformed Id', { id: '01m8ajds3vq4x7m2n5p9t0w1yc' }],
    ['id', 'no Id', { id: '' }],
    ['divinedAt', 'a time in Z', { divinedAt: "'2026-11-26T00:00:00.123Z'" }],
    [
      'divinedAt',
      'a Day for a Cast Consultation',
      { divinedAt: "'2026-11-26'" },
    ],
    ['query', 'a blank Query', { query: "'   '" }],
    [
      'transformation',
      'an unquoted Transformation',
      { transformation: '678976' },
    ],
    ['transformation', 'five Line Values', { transformation: "'67897'" }],
    ['casting', 'one Line of Picks', { casting: '[[4, 3, 4]]' }],
    [
      'divisionMethod',
      'an unknown Division Method',
      { divisionMethod: 'by-hand' },
    ],
    [
      'divisionMethod',
      'a Casting without a Division Method',
      { divisionMethod: '' },
    ],
  ] as const)('names %s for %s', async (field, _, overrides) => {
    await expectUnreadable(fileText(castFrontmatter(overrides)), {
      kind: 'invalid-field',
      field,
    })
  })
})

describe('casting-does-not-replay', () => {
  it('makes a Casting that does not replay to its Transformation Unreadable', async () => {
    await expectUnreadable(
      fileText(castFrontmatter({ transformation: "'678977'" })),
      { kind: 'casting-does-not-replay' },
    )
  })
})

describe('duplicate-id', () => {
  it('makes the later file Unreadable, naming the first, and gets the first', async () => {
    const folder = await temporaryFolder()
    const first = '2026-11-26--01M8AJDS3VQ4X7M2N5P9T0W1YC.md'
    const later = '2026-11-27--copied-by-hand.md'
    await plant(folder, later, fileText(castFrontmatter({ query: 'A copy' })))
    await plant(folder, first, fileText(castFrontmatter()))
    const { consultationStore } = storeOver(folder)

    expect(await consultationStore.list()).toEqual({
      consultations: [cast],
      unreadable: [
        {
          location: later,
          reason: { kind: 'duplicate-id', firstLocation: first },
        },
      ],
    })
    expect(await consultationStore.get(cast.id)).toEqual(cast)
  })

  it('orders file names by code point, not by locale', async () => {
    const folder = await temporaryFolder()
    await plant(
      folder,
      'alpha.md',
      fileText(castFrontmatter({ query: 'A copy' })),
    )
    await plant(folder, 'Zeta.md', fileText(castFrontmatter()))
    const { consultationStore } = storeOver(folder)

    expect(await consultationStore.list()).toEqual({
      consultations: [cast],
      unreadable: [
        {
          location: 'alpha.md',
          reason: { kind: 'duplicate-id', firstLocation: 'Zeta.md' },
        },
      ],
    })
    expect(await consultationStore.get(cast.id)).toEqual(cast)
  })

  it('names the first file in every later duplicate', async () => {
    const folder = await temporaryFolder()
    for (const name of ['a.md', 'b.md', 'c.md']) {
      await plant(folder, name, fileText(castFrontmatter()))
    }

    const listed = await storeOver(folder).consultationStore.list()

    expect(listed.consultations).toEqual([cast])
    expect(
      listed.unreadable.toSorted((x, y) => (x.location < y.location ? -1 : 1)),
    ).toEqual([
      {
        location: 'b.md',
        reason: { kind: 'duplicate-id', firstLocation: 'a.md' },
      },
      {
        location: 'c.md',
        reason: { kind: 'duplicate-id', firstLocation: 'a.md' },
      },
    ])
  })
})

describe('Unreadable files in a Journal', () => {
  it('lists Unreadable files apart from the Consultations', async () => {
    const folder = await temporaryFolder()
    await plant(folder, plantedName, fileText(castFrontmatter()))
    await plant(folder, 'empty.md', '')
    await plant(folder, 'version-1.md', await readFixture('version-1.md'))

    const listed = await storeOver(folder).consultationStore.list()

    expect(listed.consultations).toEqual([cast])
    expect(
      listed.unreadable.toSorted((x, y) => (x.location < y.location ? -1 : 1)),
    ).toEqual([
      { location: 'empty.md', reason: { kind: 'no-frontmatter' } },
      { location: 'version-1.md', reason: { kind: 'not-version-2' } },
    ])
  })

  it('gets undefined for an Id only an Unreadable file holds', async () => {
    const folder = await temporaryFolder()
    await plant(
      folder,
      plantedName,
      fileText(castFrontmatter({ transformation: "'678977'" })),
    )

    expect(
      await storeOver(folder).consultationStore.get(cast.id),
    ).toBeUndefined()
  })

  it('never reads a body', async () => {
    const body = '---\nschemaVersion: 1\n---\n\n!!js/function junk: [\n'
    expect(await listAlone(fileText(castFrontmatter(), body))).toEqual({
      consultations: [cast],
      unreadable: [],
    })
  })

  it('writes nothing when it lists and gets', async () => {
    const folder = await temporaryFolder()
    await plant(folder, plantedName, fileText(castFrontmatter()))
    await plant(folder, 'b.md', fileText(castFrontmatter()))
    await plant(folder, 'empty.md', '')
    await plant(folder, 'notes.txt', 'Greyfen.\n')
    const before = await snapshot(folder)
    const { consultationStore } = storeOver(folder)

    await consultationStore.list()
    await consultationStore.get(cast.id)

    expect(await snapshot(folder)).toEqual(before)
  })

  it('skips every Unreadable file when it rerenders bodies', async () => {
    const folder = await temporaryFolder()
    await plant(folder, 'a.md', fileText(castFrontmatter(), 'Old body.\n'))
    await plant(folder, 'b.md', fileText(castFrontmatter(), 'Old body.\n'))
    await plant(folder, 'empty.md', '')
    await plant(
      folder,
      'no-replay.md',
      fileText(castFrontmatter({ transformation: "'678977'" }), 'Old body.\n'),
    )
    const before = await snapshot(folder)

    expect(await storeOver(folder).rerenderBodies()).toEqual({ rewritten: 1 })

    const after = await snapshot(folder)
    for (const unreadable of ['b.md', 'empty.md', 'no-replay.md']) {
      expect(after[unreadable]).toBe(before[unreadable])
    }
    expect(await readFile(path.join(folder, 'a.md'), 'utf8')).not.toContain(
      'Old body.',
    )
  })
})
