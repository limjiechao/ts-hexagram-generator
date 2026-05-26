// Width-invariant guard for the playground's identity stack. Re-derives the
// worst-case display width across all 64 hexagrams (same logic the
// `scripts/measure-identity-stack-width.ts` scan uses) and asserts it fits
// inside the hardcoded `COLUMN_WIDTH`. If the hexagram/trigram data ever
// gains a longer name, this test fails loudly — at which point the scan
// should be re-run and `COLUMN_WIDTH` bumped.

import { getHexagramRecord, getTrigramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/types'
import { describe, expect, it } from 'vitest'

import { COLUMN_WIDTH } from '../src/playground-display'

const TRIGRAM_SYMBOL: Record<string, string> = {
  '1': '☰',
  '2': '☱',
  '3': '☲',
  '4': '☳',
  '5': '☴',
  '6': '☵',
  '7': '☶',
  '8': '☷',
}

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

function enumerateHexagrams(): Hexagram[] {
  const out: Hexagram[] = []
  for (let n = 0; n < 64; n++) {
    const bits = n.toString(2).padStart(6, '0')
    const hex = bits.split('').map((b) => (b === '0' ? 7 : 8))
    out.push([hex[5], hex[4], hex[3], hex[2], hex[1], hex[0]] as Hexagram)
  }
  return out
}

interface Worst {
  readonly width: number
  readonly label: string
  readonly row: string
}

describe('playground identity-stack width invariant', () => {
  it('every identity-stack row fits inside COLUMN_WIDTH', () => {
    let worst: Worst = { width: 0, label: '', row: '' }

    for (const standing of enumerateHexagrams()) {
      const record = getHexagramRecord(standing)
      const wenwang = String(record.Metadata.Order.WenWang)
      const chinese = String(record.Name.Chinese.Traditional)
      const pinyin = String(record.Metadata.Pronunciation.Pinyin)
      const english = String(record.Name.English.WilhelmBaynes)
      const upperKey = record.Metadata.Trigram.Upper as unknown as number
      const lowerKey = record.Metadata.Trigram.Lower as unknown as number
      const upperTrigram = getTrigramRecord(upperKey as never)
      const lowerTrigram = getTrigramRecord(lowerKey as never)
      const upperSym =
        TRIGRAM_SYMBOL[String(upperTrigram.Metadata.Order.Fuxi)] ?? '◌'
      const lowerSym =
        TRIGRAM_SYMBOL[String(lowerTrigram.Metadata.Order.Fuxi)] ?? '◌'

      const rows = [
        `#${wenwang} ${chinese}（${pinyin}）`,
        english,
        `${upperSym} ${String(upperTrigram.Name.Chinese.Traditional)}`,
        `${lowerSym} ${String(lowerTrigram.Name.Chinese.Traditional)}`,
      ]
      for (const row of rows) {
        const w = visualWidth(row)
        if (w > worst.width) {
          worst = { width: w, label: `#${wenwang} ${chinese}`, row }
        }
      }
    }

    expect(
      worst.width,
      `widest identity row: "${worst.row}" (${worst.label}) is ${worst.width} cols`,
    ).toBeLessThanOrEqual(COLUMN_WIDTH)
  })
})
