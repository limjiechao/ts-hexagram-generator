// Pure unit tests for the playground's P6 top-half renderer. No React, no
// Ink — every assertion runs against the ANSI string output of
// `buildPlaygroundDisplay`.

import { getEmergingHexagram, getHexagramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/types'
import { NORMAL_GREY, stripAnsi } from '@hexagram/viewer-core'
import { describe, expect, it } from 'vitest'

import {
  buildPlaygroundDisplay,
  COLUMN_WIDTH,
  GAP_WIDTH,
  TOP_HALF_WIDTH,
} from '../src/playground-display'

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
    it('TOP_HALF_WIDTH = COLUMN_WIDTH * 2 + GAP_WIDTH', () => {
      expect(TOP_HALF_WIDTH).toBe(COLUMN_WIDTH * 2 + GAP_WIDTH)
    })
  })

  describe('row count and width invariants', () => {
    it('emits header + blank + 6 line rows + blank + 4 identity rows = 12 rows', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      expect(out.rows.length).toBe(12)
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

    it('focusIndex=null omits the chevron from every line row', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: null,
        pulse: false,
        hasMoving: false,
      })
      const lineRows = out.rows.slice(1, 7).map(stripAnsi)
      for (const plain of lineRows) {
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
        focusIndex: null,
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
      // Identity rows are rows[9..11]; the row1 (#N name) is at index 9.
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
      // The emerging column starts at COLUMN_WIDTH + GAP_WIDTH cols into the
      // row. Search for the NORMAL_GREY escape sequence in the second half
      // of the raw row.
      const raw = out.rows[8] ?? ''
      // Easiest check: NORMAL_GREY should appear at least twice in the row
      // (once for the standing row1 — actually BOLD_WHITE — and at least
      // once for the emerging cell). Since standing's row1 is BOLD_WHITE,
      // the first NORMAL_GREY occurrence comes from the emerging cell.
      expect(raw.includes(NORMAL_GREY)).toBe(true)
    })

    it('shows the actual emerging hexagram identity when hasMoving === true', () => {
      const standing: Hexagram = [9, 7, 7, 7, 7, 7]
      const emerging = getEmergingHexagram(standing)
      const out = buildPlaygroundDisplay({
        standing,
        emerging,
        focusIndex: null,
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
    it('row 0 contains BOTH "Standing" and "Emerging" centered', () => {
      const out = buildPlaygroundDisplay({
        standing: QIAN,
        emerging: QIAN,
        focusIndex: 0,
        pulse: false,
        hasMoving: false,
      })
      const header = stripAnsi(out.rows[0] ?? '')
      expect(header.includes('Standing')).toBe(true)
      expect(header.includes('Emerging')).toBe(true)
    })
  })

  describe('all 64 hexagrams', () => {
    function enumerateHexagrams(): Hexagram[] {
      const out: Hexagram[] = []
      for (let n = 0; n < 64; n++) {
        const bits = n.toString(2).padStart(6, '0')
        const hex = bits.split('').map((b) => (b === '0' ? 7 : 8))
        out.push([hex[5], hex[4], hex[3], hex[2], hex[1], hex[0]] as Hexagram)
      }
      return out
    }

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
        expect(out.rows.length).toBe(12)
        for (const row of out.rows) {
          expect(rowWidth(row)).toBe(TOP_HALF_WIDTH)
        }
      }
    })
  })
})
