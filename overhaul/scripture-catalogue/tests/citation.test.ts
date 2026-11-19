import type { Hexagram } from '@hexagram/oracle/hexagram'
import { describe, expect, it } from 'vitest'

import type { Citation } from '#src/citation.js'

type ZhouyiCitation = Extract<Citation, { readonly work: 'zhouyi' }>
type LineStatement = Extract<ZhouyiCitation, { readonly line: unknown }>
type HexagramStatement = Exclude<ZhouyiCitation, { readonly line: unknown }>

const qian: Hexagram = ['yang', 'yang', 'yang', 'yang', 'yang', 'yang']

describe('Citation', () => {
  it('does not take a Line Statement for a Hexagram Statement', () => {
    const hexagramStatement: HexagramStatement = {
      work: 'zhouyi',
      hexagram: qian,
    }
    const lineStatement: LineStatement = {
      work: 'zhouyi',
      hexagram: qian,
      line: 4,
    }
    // @ts-expect-error: a Hexagram Statement has no `line`
    const mistaken: HexagramStatement = lineStatement

    expect([hexagramStatement, mistaken]).toHaveLength(2)
  })
})
