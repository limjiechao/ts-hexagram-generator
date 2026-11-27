import { isDay } from '@hexagram/consultation-journal/divined-at'
import { describe, expect, it } from 'vitest'

import { isEditionId } from '#src/edition-id.js'
import type { Edition } from '#src/edition.js'

const id = 'legge-1882'
if (!isEditionId(id)) throw new Error('the slug is malformed')
const retrievedOn = {
  precision: 'day',
  year: 2026,
  month: 11,
  day: 20,
} as const
if (!isDay(retrievedOn)) throw new Error('the date is not a Day')

describe('Edition', () => {
  it('is in a script or a language, never both or neither', () => {
    const chinese: Edition = {
      id,
      work: 'zhouyi',
      shortName: 'Legge',
      title: 'Legge, Sacred Books of the East vol. 16 (Oxford, 1882)',
      script: 'traditional',
      witness: { description: 'ctext.org pages' },
      unidentified: false,
      licence: 'in-copyright',
    }
    const translation: Edition = {
      id,
      work: 'zhouyi',
      shortName: 'Legge',
      title: 'Legge, Sacred Books of the East vol. 16 (Oxford, 1882)',
      language: 'en',
      witness: { description: 'a scanned copy', retrievedOn },
      unidentified: false,
      licence: 'public-domain',
    }
    // @ts-expect-error: an Edition is not in both a script and a language
    const both: Edition = {
      id,
      work: 'zhouyi',
      shortName: 'Legge',
      title: 'Legge, Sacred Books of the East vol. 16 (Oxford, 1882)',
      script: 'traditional',
      language: 'en',
      witness: { description: 'ctext.org pages' },
      unidentified: false,
      licence: 'public-domain',
    }
    // @ts-expect-error: an Edition is in a script or a language
    const neither: Edition = {
      id,
      work: 'zhouyi',
      shortName: 'Legge',
      title: 'Legge, Sacred Books of the East vol. 16 (Oxford, 1882)',
      witness: { description: 'ctext.org pages' },
      unidentified: false,
      licence: 'public-domain',
    }

    expect([chinese, translation, both, neither]).toHaveLength(4)
  })

  it('always has a Witness, never an unidentified one', () => {
    // @ts-expect-error: every Edition has a Witness
    const unwitnessed: Edition = {
      id,
      work: 'zhouyi',
      shortName: 'Legge',
      title: 'Legge, Sacred Books of the East vol. 16 (Oxford, 1882)',
      script: 'simplified',
      unidentified: true,
      licence: 'in-copyright',
    }
    const unidentifiedWitness: Edition = {
      id,
      work: 'zhouyi',
      shortName: 'Legge',
      title: 'Legge, Sacred Books of the East vol. 16 (Oxford, 1882)',
      script: 'simplified',
      // @ts-expect-error: it is the Edition that may be unidentified
      witness: 'unidentified',
      unidentified: true,
      licence: 'in-copyright',
    }

    expect([unwitnessed, unidentifiedWitness]).toHaveLength(2)
  })

  it('says whether it is unidentified, so it is never taken for a known one', () => {
    // @ts-expect-error: an Edition says whether it is unidentified
    const unlabelled: Edition = {
      id,
      work: 'zhouyi',
      shortName: 'Legge',
      title: 'Legge, Sacred Books of the East vol. 16 (Oxford, 1882)',
      script: 'simplified',
      witness: { description: 'ctext.org pages', retrievedOn },
      licence: 'in-copyright',
    }
    const unidentified = {
      id,
      work: 'zhouyi',
      shortName: 'Legge',
      title: 'Legge, Sacred Books of the East vol. 16 (Oxford, 1882)',
      script: 'simplified',
      witness: { description: 'ctext.org pages', retrievedOn },
      unidentified: true,
      licence: 'in-copyright',
    } as const satisfies Edition
    // @ts-expect-error: an unidentified Edition is not a known one
    const known: Edition & { readonly unidentified: false } = unidentified

    expect([unlabelled, known]).toHaveLength(2)
  })

  it('takes only the Reading Preference scripts', () => {
    const edition: Edition = {
      id,
      work: 'zhouyi',
      shortName: 'Legge',
      title: 'Legge, Sacred Books of the East vol. 16 (Oxford, 1882)',
      // @ts-expect-error: the app knows only Traditional and Simplified
      script: 'jiaguwen',
      witness: { description: 'ctext.org pages' },
      unidentified: false,
      licence: 'public-domain',
    }

    expect(edition.work).toBe('zhouyi')
  })

  it('takes a retrieval date only as a Day', () => {
    const edition: Edition = {
      id,
      work: 'zhouyi',
      shortName: 'Legge',
      title: 'Legge, Sacred Books of the East vol. 16 (Oxford, 1882)',
      script: 'traditional',
      witness: {
        description: 'ctext.org pages',
        // @ts-expect-error: an unchecked date is not a Day
        retrievedOn: { precision: 'day', year: 2026, month: 2, day: 30 },
      },
      unidentified: false,
      licence: 'in-copyright',
    }

    expect(edition.licence).toBe('in-copyright')
  })
})
