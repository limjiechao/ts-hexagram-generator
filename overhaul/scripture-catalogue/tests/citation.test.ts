import type { Hexagram } from '@hexagram/oracle/hexagram'
import type { LinePosition } from '@hexagram/oracle/line-position'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type { Citation } from '#src/citation.js'

type ZhouyiCitation = Extract<Citation, { readonly work: 'zhouyi' }>
type LineStatement = Extract<ZhouyiCitation, { readonly line: unknown }>
type HexagramStatement = Exclude<ZhouyiCitation, { readonly line: unknown }>
type XiaoxiangCitation = Extract<Citation, { readonly work: 'xiaoxiang' }>

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

  it('names an All-Moving Statement by its `line`, which a Line Statement needs', () => {
    const allMoving: LineStatement = {
      work: 'zhouyi',
      hexagram: qian,
      line: 'all-moving',
    }
    // @ts-expect-error: a Line Statement has a `line`
    const lineless: LineStatement = { work: 'zhouyi', hexagram: qian }

    expect([allMoving, lineless]).toHaveLength(2)
  })

  it('names the 小象 on a Line or on the All-Moving Statement by its `line`', () => {
    expectTypeOf<XiaoxiangCitation['line']>().toEqualTypeOf<
      LinePosition | 'all-moving'
    >()
    const onAllMoving: XiaoxiangCitation = {
      work: 'xiaoxiang',
      hexagram: qian,
      line: 'all-moving',
    }

    expect(onAllMoving.line).toBe('all-moving')
  })
})
