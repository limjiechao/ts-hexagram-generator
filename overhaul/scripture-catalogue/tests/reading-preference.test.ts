import { describe, expect, it } from 'vitest'

import type { ReadingPreference } from '#src/reading-preference.js'

type Commentaries = ReadingPreference['commentaries']

describe('ReadingPreference', () => {
  it('takes only the 十翼 as Commentaries', () => {
    const commentaries: Commentaries = [
      'tuan',
      'daxiang',
      'xiaoxiang',
      'wenyan',
    ]
    // @ts-expect-error: the 經 is not a Commentary
    const jing: Commentaries = ['zhouyi']
    // @ts-expect-error: the 易林 is not a Commentary
    const yilin: Commentaries = ['yilin']

    expect([...commentaries, ...jing, ...yilin]).toHaveLength(6)
  })
})
