import { hexagramIdentity } from '@hexagram/consultation-view/build-view'
import type { Hexagram } from '@hexagram/core/types'

// The four identity-stack rows are composed from the consultation-view IR's
// HexagramIdentity — the single authoritative extraction (same Name-Chinese +
// capitalized pinyin + capitalized English imagery the consultation
// transformation footer renders), so the playground and the consultation can
// never disagree about the identity strings.
export function identityRows(
  hexagram: Hexagram,
): readonly [string, string, string, string] {
  const id = hexagramIdentity(hexagram)
  return [
    `#${id.wenWang} ${id.chineseTraditional}（${id.pinyin}）`,
    id.englishWilhelmBaynes,
    `Upper: ${id.upperTrigramChinese} ${id.upperTrigramPinyin} (${id.upperTrigramEnglish})`,
    `Lower: ${id.lowerTrigramChinese} ${id.lowerTrigramPinyin} (${id.lowerTrigramEnglish})`,
  ] as const
}
