import {
  emptyPartialCastingRecord,
  type CastingRecord,
} from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import {
  CAST1_OFFSET_IN_BLOCK,
  castingSection,
  castingTableActiveRow,
} from '../src/output-sections.js'

// oxlint-disable-next-line no-control-regex
const SGR_PATTERN = /\u001B\[[0-9;]*m/g
const stripAnsi = (text: string): string => text.replaceAll(SGR_PATTERN, '')

// Eighteen data rows = every line (6) × every cast (3). A data row is any line
// that has the ` │ ` gutter and at least one digit (the cast number); the
// banner, leaf header and rule rows carry no digits.
const dataRowsOf = (rendered: string): string[] =>
  stripAnsi(rendered)
    .split('\n')
    .filter((row) => row.includes(' │ ') && /\d/.test(row))

const borderColumns = (row: string): number[] => {
  const positions: number[] = []
  for (const [index, ch] of [...row].entries())
    if (ch === '│') positions.push(index)
  return positions
}

// Visual column width: CJK ideographs (the line-label glyphs 初二三四五上) are
// East-Asian-Wide (2 columns); everything else here is 1. `[...r].length`
// (code points) is NOT visual width when wide glyphs are present. The
// U+3000..U+9FFF range covers the ideographic space and the CJK ideographs;
// the gutter `│` (U+2502) and `⇒` (U+21D2) are 1-column and fall outside it.
const visualWidthOf = (row: string): number =>
  [...row].reduce((n, ch) => n + (/[\u3000-\u9FFF]/.test(ch) ? 2 : 1), 0)

// pick=24, max=48 derives to stalks 49, L heap 24 / 5 piles / 4 odd,
// R heap 25 / 5 piles / 4 odd, held 1, aside 9, Σ 10.
const FULL: CastingRecord = Array.from({ length: 6 }, () => [
  { pick: 24, max: 48 },
  { pick: 20, max: 43 },
  { pick: 16, max: 35 },
]) as CastingRecord

describe('castingSection — full ledger', () => {
  it('renders the glossed two-level header and the double rule', () => {
    const out = stripAnsi(castingSection(FULL))
    expect(out).toContain('左Left')
    expect(out).toContain('右Right')
    for (const h of [
      '爻Line',
      '變Cast',
      '蓍Stalks',
      '左Heap',
      '揲Fours',
      '扐Odd',
      '右Heap',
      '掛Held',
      '歸奇Aside',
      '營Tally',
    ])
      expect(out).toContain(h)
    expect(out).toMatch(/═╪═/)
  })

  it('renders eighteen data rows', () => {
    expect(dataRowsOf(castingSection(FULL))).toHaveLength(18)
  })

  it('derives the per-cast quantities from {pick, max}', () => {
    const out = stripAnsi(castingSection(FULL))
    // cast-1 (max 48) row: stalks 49, L heap 24, aside 9
    expect(out).toContain(' 49 ')
    expect(out).toContain(' 24 ')
    expect(out).toContain(' 9 ')
  })

  it('labels each line block with its glyph+number once, on the cast-3 row, with ⇒ N', () => {
    const out = stripAnsi(castingSection(FULL))
    for (const label of ['初1', '二2', '三3', '四4', '五5', '上6'])
      expect(out).toContain(label)
    const rows = dataRowsOf(castingSection(FULL))
    // The first block is line 6: its top (cast-3) row carries 上6 and ⇒ N.
    expect(rows[0]!).toContain('上6')
    expect(rows[0]!).toMatch(/⇒ \d/)
    // The block's other two rows (casts 2, 1) carry no line label.
    expect(rows[1]!).not.toContain('上6')
    expect(rows[2]!).not.toContain('上6')
  })

  it('keeps every data row the same visual width', () => {
    const rows = dataRowsOf(castingSection(FULL))
    const widths = new Set(rows.map(visualWidthOf))
    expect(widths.size).toBe(1)
  })
})

describe('castingSection — partial', () => {
  it('renders 180 placeholder dots for an all-empty record', () => {
    const out = stripAnsi(castingSection(emptyPartialCastingRecord()))
    // 18 rows × 10 derived cells (爻Line + 變Cast are structural, never dots).
    expect((out.match(/·/g) ?? []).length).toBe(180)
  })

  it('keeps column boundaries identical between empty and full grids', () => {
    const empty = dataRowsOf(castingSection(emptyPartialCastingRecord()))
    const full = dataRowsOf(castingSection(FULL))
    expect(empty).toHaveLength(18)
    for (const [i, fullRow] of full.entries())
      expect(borderColumns(empty[i]!)).toEqual(borderColumns(fullRow))
  })

  it('renders "Casting not recorded" for a null casting', () => {
    const out = stripAnsi(castingSection(null))
    expect(out).toContain('CASTING:')
    expect(out).toContain('Casting not recorded')
    expect(out).not.toContain('│')
  })
})

describe('castingTableActiveRow', () => {
  it('maps each line index to its cast-1 (block-bottom) content row', () => {
    // line 1 (idx 0) is the bottom block (row 27); line 6 (idx 5) the top (row 7).
    expect([0, 1, 2, 3, 4, 5].map(castingTableActiveRow)).toEqual([
      27, 23, 19, 15, 11, 7,
    ])
  })

  it('stays consistent with castingSection output (contract)', () => {
    // Locate each line's labelled cast-3 row in the real render, then assert the
    // helper's cast-1 row is exactly CAST1_OFFSET_IN_BLOCK below it. This fails
    // loudly if castingSection's header height, block height, or ordering ever
    // changes — the guard against the geometry constants drifting.
    const rows = stripAnsi(castingSection(FULL)).split('\n')
    const LINE_LABELS = ['初1', '二2', '三3', '四4', '五5', '上6'] // line 1..6
    for (let lineIndex = 0; lineIndex < 6; lineIndex++) {
      const labelRow = rows.findIndex((row) =>
        row.includes(LINE_LABELS[lineIndex]!),
      )
      expect(labelRow).toBeGreaterThanOrEqual(0)
      expect(castingTableActiveRow(lineIndex)).toBe(
        labelRow + CAST1_OFFSET_IN_BLOCK,
      )
    }
  })
})
