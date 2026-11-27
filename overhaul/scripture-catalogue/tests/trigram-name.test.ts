import type { Trigram } from '@hexagram/oracle/trigram'
import { describe, expect, it } from 'vitest'

import { isEditionId } from '#src/edition-id.js'
import type { Edition } from '#src/edition.js'
import type { TrigramName } from '#src/trigram-name.js'

// Every fixture below is invented: no Edition, Witness, name or imagery is real.

const id = 'invented-chinese'
if (!isEditionId(id)) throw new Error('the slug is malformed')
const edition: Edition = {
  id,
  work: 'zhouyi',
  shortName: 'Invented Chinese',
  title: 'An invented Chinese text (nowhere, 2026)',
  script: 'traditional',
  witness: { description: 'an invented set of pages' },
  unidentified: false,
  licence: 'public-domain',
}
const heaven: Trigram = ['yang', 'yang', 'yang']

describe('Trigram name', () => {
  it('carries its name and imagery labelled with the Edition that gives them', () => {
    const named: TrigramName = {
      trigram: heaven,
      edition,
      name: 'invented name',
      imagery: 'invented imagery',
    }
    // @ts-expect-error: a name belongs to an Edition, never to the Trigram alone
    const unlabelled: TrigramName = {
      trigram: heaven,
      name: 'invented name',
      imagery: 'invented imagery',
    }
    // @ts-expect-error: a name travels with its imagery
    const withoutImagery: TrigramName = {
      trigram: heaven,
      edition,
      name: 'invented name',
    }

    expect([named, unlabelled, withoutImagery]).toHaveLength(3)
  })
})
