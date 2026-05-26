// Throwaway scan: measure the worst-case display width of the playground's
// 4-line identity stack across all 64 hexagrams. Run with `tsx`:
//
//   pnpm --filter @hexagram/playground-ui exec tsx scripts/measure-identity-stack-width.ts
//
// Prints the worst-case width per row kind and a recommended COLUMN_WIDTH
// (max + 2-col buffer). Re-run if hexagram/trigram data ever changes.

import { getHexagramRecord, getTrigramRecord } from '@hexagram/core/getters'
import type { Hexagram, Line } from '@hexagram/types'

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

// Iterate all 64 records by enumerating every yang/yin tuple via the
// HEXAGRAM_RECORDS dict. Cheapest: enumerate `H[12]{6}` keys.
function enumerateHexagrams(): Hexagram[] {
  const lineFor: Record<string, Line> = { '1': 7, '2': 8 }
  const out: Hexagram[] = []
  for (let n = 0; n < 64; n++) {
    const bits = n.toString(2).padStart(6, '0')
    // 0 → '1' (yang), 1 → '2' (yin) — match HexagramLineToKey reverse
    const digits = bits.split('').map((b) => (b === '0' ? '1' : '2'))
    const hex: Hexagram = [
      lineFor[digits[5] as string],
      lineFor[digits[4] as string],
      lineFor[digits[3] as string],
      lineFor[digits[2] as string],
      lineFor[digits[1] as string],
      lineFor[digits[0] as string],
    ] as Hexagram
    out.push(hex)
  }
  return out
}

function measure(): void {
  let maxRow1 = 0
  let maxRow1Hex = ''
  let maxRow2 = 0
  let maxRow2Hex = ''
  let maxRow3 = 0
  let maxRow3Hex = ''
  let maxRow4 = 0
  let maxRow4Hex = ''

  const all = enumerateHexagrams()
  for (const hex of all) {
    const record = getHexagramRecord(hex)
    const wenwang = record.Metadata.Order.WenWang
    const chinese = record.Name.Chinese.Traditional
    const pinyin = record.Metadata.Pronunciation.Pinyin
    const english = record.Name.English.WilhelmBaynes
    const upperKey = record.Metadata.Trigram.Upper as unknown as number
    const lowerKey = record.Metadata.Trigram.Lower as unknown as number
    const upperTrigram = getTrigramRecord(upperKey as never)
    const lowerTrigram = getTrigramRecord(lowerKey as never)
    const upperFuxi = String(upperTrigram.Metadata.Order.Fuxi)
    const lowerFuxi = String(lowerTrigram.Metadata.Order.Fuxi)
    const upperSym = TRIGRAM_SYMBOL[upperFuxi] ?? '◌'
    const lowerSym = TRIGRAM_SYMBOL[lowerFuxi] ?? '◌'

    const row1 = `#${wenwang} ${chinese}（${pinyin}）`
    const row2 = english
    const row3 = `${upperSym} ${upperTrigram.Name.Chinese.Traditional}`
    const row4 = `${lowerSym} ${lowerTrigram.Name.Chinese.Traditional}`

    const w1 = visualWidth(row1)
    const w2 = visualWidth(row2)
    const w3 = visualWidth(row3)
    const w4 = visualWidth(row4)

    if (w1 > maxRow1) {
      maxRow1 = w1
      maxRow1Hex = `#${wenwang} ${chinese} — ${row1}`
    }
    if (w2 > maxRow2) {
      maxRow2 = w2
      maxRow2Hex = `#${wenwang} ${chinese} — ${row2}`
    }
    if (w3 > maxRow3) {
      maxRow3 = w3
      maxRow3Hex = `#${wenwang} ${chinese} — ${row3}`
    }
    if (w4 > maxRow4) {
      maxRow4 = w4
      maxRow4Hex = `#${wenwang} ${chinese} — ${row4}`
    }
  }

  console.log('Worst-case identity-stack row widths:')
  console.log(`  row1 (#N Chinese（pinyin）): ${maxRow1} cols — ${maxRow1Hex}`)
  console.log(`  row2 (Wilhelm-Baynes EN):    ${maxRow2} cols — ${maxRow2Hex}`)
  console.log(`  row3 (upper trigram):        ${maxRow3} cols — ${maxRow3Hex}`)
  console.log(`  row4 (lower trigram):        ${maxRow4} cols — ${maxRow4Hex}`)
  const overallMax = Math.max(maxRow1, maxRow2, maxRow3, maxRow4)
  console.log(`Overall max identity-stack width: ${overallMax}`)
  const LINE_AREA = 2 + 1 + 2 + 9 + 2 + 11
  console.log(`Line-area width (chevron+value+bar+pos): ${LINE_AREA}`)
  console.log(
    `Recommended COLUMN_WIDTH = max(${overallMax}, ${LINE_AREA}) + 2 = ${Math.max(overallMax, LINE_AREA) + 2}`,
  )
}

measure()
