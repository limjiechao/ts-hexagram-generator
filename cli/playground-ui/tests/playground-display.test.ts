// Pure unit tests for the playground's P6 top-half renderer. No React, no
// Ink — every assertion runs against the ANSI string output of
// `buildPlaygroundDisplay`.

import { getHexagramRecord } from '@hexagram/core/getters'
import { getEmergingHexagram } from '@hexagram/core/line-semantics'
import type { Hexagram } from '@hexagram/core/types'
import { NORMAL_GREY, stripAnsi } from '@hexagram/viewer-core'
import { describe, expect, it } from 'vitest'

import {
  BAR_BLOCK_WIDTH,
  CHEVRON_WIDTH,
  GAP_WIDTH,
  LEFT_LINE_WIDTH,
  TOP_HALF_ROWS,
  TOP_HALF_WIDTH,
} from '../src/playground-display-geometry.js'
import { buildPlaygroundDisplay } from '../src/playground-display.js'

// Replicate the same `visualWidth` the renderer uses so the tests are not
// coupled to `string-width`. (The renderer's `visualWidth` is module-private.)
function visualWidth(text: string): number {
  let width = 0
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0
    const isFullwidth =
      (codePoint >= 0x1100 && codePoint <= 0x115f) ||
      (codePoint >= 0x2e80 && codePoint <= 0x303e) ||
      (codePoint >= 0x3041 && codePoint <= 0x33ff) ||
      (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
      (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
      (codePoint >= 0xa000 && codePoint <= 0xa4cf) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7af) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff01 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6)
    width += isFullwidth ? 2 : 1
  }
  return width
}

function rowWidth(row: string): number {
  return visualWidth(stripAnsi(row))
}

const QIAN: Hexagram = [7, 7, 7, 7, 7, 7]

describe('buildPlaygroundDisplay', () => {
  describe('geometry constants', () => {
    it('LEFT_LINE_WIDTH = CHEVRON_WIDTH + BAR_BLOCK_WIDTH', () => {
      expect(LEFT_LINE_WIDTH).toBe(CHEVRON_WIDTH + BAR_BLOCK_WIDTH)
    })

    it('TOP_HALF_ROWS = 13 (header + 6 lines + blank + 2 name + 1 divider + 2 trigram)', () => {
      expect(TOP_HALF_ROWS).toBe(13)
    })

    it('TOP_HALF_WIDTH leaves room for the right identity cell from col 46', () => {
      // Right column starts at `LEFT_LINE_WIDTH + GAP_WIDTH`. TOP_HALF_WIDTH
      // must be at least that anchor + the right line block, with extra room
      // when identity rows are wider than the line block.
      expect(TOP_HALF_WIDTH).toBeGreaterThanOrEqual(
        LEFT_LINE_WIDTH + GAP_WIDTH + BAR_BLOCK_WIDTH,
      )
    })
  })

  describe('row count and width invariants', () => {
    it('emits TOP_HALF_ROWS rows', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      expect(out.rows.length).toBe(TOP_HALF_ROWS)
    })

    it('every row has the declared total width', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      expect(out.width).toBe(TOP_HALF_WIDTH)
      for (const [index, row] of out.rows.entries()) {
        expect(
          rowWidth(row),
          `row ${index}: ${JSON.stringify(stripAnsi(row))}`,
        ).toBe(TOP_HALF_WIDTH)
      }
    })
  })

  describe('focus chevron placement', () => {
    it('renders the chevron on the focused line row (L1 at the bottom for focusIndex=0)', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      // Line rows are rows[1..6]; bottom (L1) is the LAST line row at index 6.
      const lineRows = out.rows.slice(1, 7)
      const plainLineRows = lineRows.map(stripAnsi)
      // Chevron sits in the leading 2 cols of each row.
      expect(plainLineRows[5]?.startsWith('› ')).toBe(true)
      for (const [index, plain] of plainLineRows.entries()) {
        if (index === 5) continue
        expect(
          plain.startsWith('  '),
          `non-focused row ${index} should start with 2 spaces`,
        ).toBe(true)
      }
    })

    it('focusIndex=5 places the chevron on the TOP line row (L6)', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 5,
        pulse: false,
        hasMoving: false,
      })
      const lineRows = out.rows.slice(1, 7).map(stripAnsi)
      expect(lineRows[0]?.startsWith('› ')).toBe(true)
      for (const [index, plain] of lineRows.entries()) {
        if (index === 0) continue
        expect(plain.startsWith('  ')).toBe(true)
      }
    })
  })

  describe('moving-line arrow', () => {
    it('renders the moving arrow body on the moving line and only the moving line', () => {
      // Standing = [9, 7, 7, 7, 7, 7] — only L1 moves.
      const standing: Hexagram = [9, 7, 7, 7, 7, 7]
      const emerging = getEmergingHexagram(standing)
      const out = buildPlaygroundDisplay({
        standing,
        emerging,
        focusIndex: 0,
        pulse: false,
        hasMoving: true,
      })
      const lineRows = out.rows.slice(1, 7).map(stripAnsi)
      // The last line row corresponds to L1 (the moving line). Check that
      // the arrow head — the long horizontal stroke + ▶ — appears in it.
      const movingRow = lineRows[5]
      expect(movingRow).toMatch(/─────────────────▶/)

      // Non-moving line rows should NOT contain the arrow body — the gap
      // region between the two halves is filled with spaces (STATIC_GAP).
      for (const [index, plain] of lineRows.entries()) {
        if (index === 5) continue
        expect(
          plain.includes('▶'),
          `non-moving line ${index} contains arrow`,
        ).toBe(false)
        expect(
          plain.includes('─'),
          `non-moving line ${index} contains stroke`,
        ).toBe(false)
      }
    })
  })

  describe('dim ghost mode (hasMoving === false)', () => {
    it('mirrors the standing identity on the emerging side', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      // Identity rows are rows[8..11]; row1 (#N name) is at index 8.
      const row1 = stripAnsi(out.rows[8] ?? '')
      const { Metadata, Name } = getHexagramRecord(QIAN)
      const label = `#${Metadata.Order.WenWang} ${Name.Chinese.Traditional}（${Metadata.Pronunciation.Pinyin}）`
      // Should appear twice on the row (left + right column, both showing
      // the same standing identity in dim mode).
      const occurrences = row1.split(label).length - 1
      expect(occurrences).toBe(2)
    })

    it('emerging side uses NORMAL_GREY for the first identity row in dim mode', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      // The emerging column starts at LEFT_LINE_WIDTH + GAP_WIDTH cols into
      // the row. Easiest check: NORMAL_GREY should appear in the raw row.
      const raw = out.rows[8] ?? ''
      expect(raw.includes(NORMAL_GREY)).toBe(true)
    })

    it('shows the actual emerging hexagram identity when hasMoving === true', () => {
      const standing: Hexagram = [9, 7, 7, 7, 7, 7]
      const emerging = getEmergingHexagram(standing)
      const out = buildPlaygroundDisplay({
        standing,
        emerging,
        focusIndex: 0,
        pulse: false,
        hasMoving: true,
      })
      const row1 = stripAnsi(out.rows[8] ?? '')
      const standingId = getHexagramRecord(standing)
      const emergingId = getHexagramRecord(emerging)
      const standingLabel = `#${standingId.Metadata.Order.WenWang} ${standingId.Name.Chinese.Traditional}（${standingId.Metadata.Pronunciation.Pinyin}）`
      const emergingLabel = `#${emergingId.Metadata.Order.WenWang} ${emergingId.Name.Chinese.Traditional}（${emergingId.Metadata.Pronunciation.Pinyin}）`
      expect(row1.includes(standingLabel)).toBe(true)
      expect(row1.includes(emergingLabel)).toBe(true)
      // The two should not be the same hexagram (standing #1, emerging #44).
      expect(standingLabel).not.toBe(emergingLabel)
    })
  })

  describe('header row', () => {
    it('row 0 contains BOTH "Standing Hexagram" and "Emerging Hexagram"', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      const header = stripAnsi(out.rows[0] ?? '')
      expect(header.includes('Standing Hexagram')).toBe(true)
      expect(header.includes('Emerging Hexagram')).toBe(true)
    })

    it('"Standing Hexagram" is left-aligned at the start of the standing bar block (col 2)', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      const header = stripAnsi(out.rows[0] ?? '')
      // The standing bar block sits in cols [CHEVRON_WIDTH,
      // CHEVRON_WIDTH + BAR_BLOCK_WIDTH) = [2, 27). The label is left-flush
      // so the "S" sits at the bar block's first column (col 2) — directly
      // above each line row's value digit.
      expect(header.indexOf('Standing Hexagram')).toBe(CHEVRON_WIDTH)
    })

    it('"Emerging Hexagram" is left-aligned at the right column anchor (col 46)', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      const header = stripAnsi(out.rows[0] ?? '')
      // The emerging bar block sits in cols [LEFT_LINE_WIDTH + GAP_WIDTH,
      // LEFT_LINE_WIDTH + GAP_WIDTH + BAR_BLOCK_WIDTH) = [46, 71). The label
      // is left-flush so the "E" sits at col 46 — directly above each line
      // row's right-column value digit.
      expect(header.indexOf('Emerging Hexagram')).toBe(
        LEFT_LINE_WIDTH + GAP_WIDTH,
      )
    })
  })

  describe('identity stack alignment', () => {
    it('identity row 1 starts at col 2 (under the value digit, not under the chevron)', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      // Row 8 is the first identity row (#N Chinese（pinyin）).
      const row = stripAnsi(out.rows[8] ?? '')
      // The first non-space character should sit at col CHEVRON_WIDTH = 2.
      // For QIAN that row begins with "#1 ".
      expect(row.startsWith('  #1 ')).toBe(true)
      expect(row.slice(0, CHEVRON_WIDTH)).toBe(' '.repeat(CHEVRON_WIDTH))
      expect(row[CHEVRON_WIDTH]).toBe('#')
    })

    it('emerging identity row 1 starts at col 46 (the right column anchor)', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      const row = stripAnsi(out.rows[8] ?? '')
      // In dim-ghost mode both columns show "#1 乾（qián）". The SECOND
      // occurrence of "#1 " marks the start of the right column. `indexOf`
      // returns a char position; convert to a visual column by measuring
      // everything before that position.
      const RIGHT_COL_START = LEFT_LINE_WIDTH + GAP_WIDTH
      const secondCharIdx = row.indexOf('#1 ', CHEVRON_WIDTH + 1)
      expect(visualWidth(row.slice(0, secondCharIdx))).toBe(RIGHT_COL_START)
    })
  })

  describe('identity-stack divider', () => {
    it('inserts a horizontal-rule row between the English name and the trigram rows', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      // Row 10 is the divider (row 8 = name, row 9 = English, row 10 = divider,
      // row 11 = Upper trigram, row 12 = Lower trigram).
      const divider = stripAnsi(out.rows[10] ?? '')
      // Divider uses ─ (U+2500). The English-name row above must NOT contain
      // any ─ characters, so the regex match is uniquely the divider.
      expect(divider).toMatch(/─{10,}/)
      const englishName = stripAnsi(out.rows[9] ?? '')
      expect(englishName.includes('─')).toBe(false)
    })

    it('divider appears on both the standing and emerging sides', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      const divider = stripAnsi(out.rows[10] ?? '')
      // Two separate runs of ─ — one in the left identity cell, one in the
      // right. They are separated by padding spaces.
      const runs = divider.match(/─+/g) ?? []
      expect(runs.length).toBe(2)
    })
  })

  describe('trigram identity rows (font-fallback fix)', () => {
    it('trigram identity rows contain no U+2630–U+2637 characters', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      // Rows 11 and 12 are the Upper/Lower trigram identity rows
      // (row 10 is the divider inserted after the English-name row).
      const upperRow = stripAnsi(out.rows[11] ?? '')
      const lowerRow = stripAnsi(out.rows[12] ?? '')
      const trigramSymbolPattern = /[\u2630-\u2637]/
      expect(trigramSymbolPattern.test(upperRow)).toBe(false)
      expect(trigramSymbolPattern.test(lowerRow)).toBe(false)
    })

    it('renders Upper/Lower rows in the "<Position>: <Chinese> <Pinyin> (<English>)" format', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      const upperRow = stripAnsi(out.rows[11] ?? '')
      const lowerRow = stripAnsi(out.rows[12] ?? '')
      // QIAN's upper and lower trigrams are both 乾 (Qián, Heaven).
      expect(upperRow.includes('Upper: 乾 Qián (Heaven)')).toBe(true)
      expect(lowerRow.includes('Lower: 乾 Qián (Heaven)')).toBe(true)
    })

    it('exhaustively excludes U+2630–U+2637 across all 64 hexagrams', () => {
      const all = enumerateHexagrams()
      const trigramSymbolPattern = /[\u2630-\u2637]/
      for (const standing of all) {
        const emerging = getEmergingHexagram(standing)
        const out = buildPlaygroundDisplay({
          standing,
          emerging,
          focusIndex: 0,
          pulse: false,
          hasMoving: standing.some((line) => line === 6 || line === 9),
        })
        for (const row of out.rows) {
          expect(
            trigramSymbolPattern.test(stripAnsi(row)),
            `hexagram ${JSON.stringify(standing)}: row contains trigram symbol`,
          ).toBe(false)
        }
      }
    })
  })

  function enumerateHexagrams(): Hexagram[] {
    const out: Hexagram[] = []
    for (let n = 0; n < 64; n++) {
      const bits = n.toString(2).padStart(6, '0')
      const hex = bits.split('').map((b) => (b === '0' ? 7 : 8))
      out.push([hex[5], hex[4], hex[3], hex[2], hex[1], hex[0]] as Hexagram)
    }
    return out
  }

  describe('all 64 hexagrams', () => {
    it('renders every hexagram without throwing, with stable row count + width', () => {
      const all = enumerateHexagrams()
      for (const standing of all) {
        const emerging = getEmergingHexagram(standing)
        const out = buildPlaygroundDisplay({
          standing,
          emerging,
          focusIndex: 0,
          pulse: false,
          hasMoving: standing.some((line) => line === 6 || line === 9),
        })
        expect(out.rows.length).toBe(TOP_HALF_ROWS)
        for (const row of out.rows) {
          expect(rowWidth(row)).toBe(TOP_HALF_WIDTH)
        }
      }
    })
  })
})
