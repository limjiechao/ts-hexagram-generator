import { describe, expect, it } from 'vitest'

import { defaultReadingPreference } from '#src/default-reading-preference.js'

describe('defaultReadingPreference', () => {
  it('holds the glossary defaults', () => {
    expect(defaultReadingPreference).toEqual({
      script: 'traditional',
      translations: ['legge-1882'],
      commentaries: ['daxiang', 'xiaoxiang'],
      yilinVerse: false,
    })
  })

  it('keeps Legge, whose EditionId the guard admits', () => {
    expect(defaultReadingPreference.translations).not.toHaveLength(0)
  })
})
