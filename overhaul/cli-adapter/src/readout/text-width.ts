/*
 * Column arithmetic for the monospace grids (ADR-0022): a Chinese character
 * or fullwidth form takes two terminal columns, a combining mark none, and
 * anything else one. Only text without escape codes is measured.
 */

/** Code point ranges a terminal draws two columns wide (East Asian Wide and Fullwidth). */
const wideRanges: readonly (readonly [number, number])[] = [
  [0x11_00, 0x11_5f],
  [0x2e_80, 0x30_3e],
  [0x30_41, 0x33_ff],
  [0x34_00, 0x4d_bf],
  [0x4e_00, 0x9f_ff],
  [0xa0_00, 0xa4_cf],
  [0xac_00, 0xd7_a3],
  [0xf9_00, 0xfa_ff],
  [0xfe_10, 0xfe_19],
  [0xfe_30, 0xfe_6f],
  [0xff_00, 0xff_60],
  [0xff_e0, 0xff_e6],
  [0x2_00_00, 0x3_ff_fd],
]

const combiningMark = /\p{M}/u

function charWidth(char: string): number {
  if (combiningMark.test(char)) return 0
  const point = char.codePointAt(0) ?? 0
  return wideRanges.some(([low, high]) => point >= low && point <= high) ? 2 : 1
}

export function textWidth(text: string): number {
  let width = 0
  for (const char of text) width += charWidth(char)
  return width
}

/** `text` followed by spaces to `column`, and never fewer than `minGap`. */
export function padToColumn(text: string, column: number, minGap = 1): string {
  return text + ' '.repeat(Math.max(minGap, column - textWidth(text)))
}

/** `text` right-aligned in `width` columns. */
export function padStart(text: string, width: number): string {
  return ' '.repeat(Math.max(0, width - textWidth(text))) + text
}

/** `text` centred in `width` columns, any odd space on the right. */
export function centre(text: string, width: number): string {
  const spare = Math.max(0, width - textWidth(text))
  const left = Math.floor(spare / 2)
  return ' '.repeat(left) + text + ' '.repeat(spare - left)
}
