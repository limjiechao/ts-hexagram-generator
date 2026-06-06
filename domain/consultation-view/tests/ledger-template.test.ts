import { deriveSplit } from '@hexagram/core/casting-derivation'
import { describe, expect, it } from 'vitest'

import type { LedgerRow } from '../src/ir.js'
import { ledgerBlock, type LedgerStyle } from '../src/ledger-template.js'

// Identity style = the Markdown medium (plain gutter, no colour, throw on null).
const plainStyle: LedgerStyle = {
  gutter: ' │ ',
  heading: (t) => t,
  rule: (t) => t,
  dataCell: (_key, text) => text,
  placeholder: () => {
    throw new Error('markdown casting expects a full record')
  },
}

// One full line-6 block (3 casts), all selectable picks valid (pick < max).
const rows: readonly LedgerRow[] = [
  {
    lineNumber: 6,
    castNumber: 3,
    showLine: true,
    trailingRule: false,
    cell: deriveSplit({ pick: 4, max: 8 }),
  },
  {
    lineNumber: 6,
    castNumber: 2,
    showLine: false,
    trailingRule: false,
    cell: deriveSplit({ pick: 4, max: 7 }),
  },
  {
    lineNumber: 6,
    castNumber: 1,
    showLine: false,
    trailingRule: false,
    cell: deriveSplit({ pick: 4, max: 7 }),
  },
]

describe('ledgerBlock', () => {
  it('plain style: emits banner, header, rule, and one data row per input', () => {
    const out = ledgerBlock(rows, plainStyle)
    const lines = out.split('\n')
    // banner + header + headerRule + 3 data rows = 6 lines (no trailingRule here).
    expect(lines).toHaveLength(6)
    expect(lines[0]).toContain('左Left')
    expect(lines[0]).toContain('右Right')
    expect(lines[1]).toContain('爻Line')
    expect(lines[2]).toMatch(/═╪═/)
    // The cast-3 (block-top) data row shows the line label and the ⇒ tally.
    expect(lines[3]).toContain('上6')
    expect(lines[3]).toContain('⇒')
  })

  it('decorating style: wraps cells via the callbacks, plain stays unwrapped', () => {
    const wrapStyle: LedgerStyle = {
      ...plainStyle,
      dataCell: (key, text) => (key === 'sigma' ? `<${text}>` : text),
    }
    const wrapped = ledgerBlock(rows, wrapStyle).split('\n')[3]!
    const plain = ledgerBlock(rows, plainStyle).split('\n')[3]!
    expect(wrapped).not.toBe(plain)
    expect(wrapped).toContain('<')
  })

  it('null cell uses the placeholder callback (not dataCell)', () => {
    const placeholderRows: readonly LedgerRow[] = [
      {
        lineNumber: 6,
        castNumber: 3,
        showLine: true,
        trailingRule: false,
        cell: null,
      },
    ]
    const dots = ledgerBlock(placeholderRows, {
      ...plainStyle,
      placeholder: (dot) => `[${dot}]`,
    })
    // The placeholder callback wraps the already-padded `·` (pad inside, wrap
    // outside) — the same layout the ANSI serializer uses for its colour run, so
    // the dot arrives right-aligned within its column, never bare.
    expect(dots).toMatch(/\[ +·\]/)
  })
})
