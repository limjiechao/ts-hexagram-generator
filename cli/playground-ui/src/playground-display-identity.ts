import { getHexagramRecord, getTrigramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/core/types'

import { capitalizeFirst } from './playground-display-text.js'

export function identityRows(
  hexagram: Hexagram,
): readonly [string, string, string, string] {
  const record = getHexagramRecord(hexagram)
  // The template-literal types on `WenWang`, `Chinese.Traditional`, and
  // `Pinyin` produce a 64-way union when composed inside a single template;
  // `String(...)` collapses each to `string` and keeps tsc's checker tractable.
  const wenwang = String(record.Metadata.Order.WenWang)
  const chinese = String(record.Name.Chinese.Traditional)
  const pinyin = String(record.Metadata.Pronunciation.Pinyin)
  const english = String(record.Name.English.WilhelmBaynes)
  const upperTrigram = getTrigramRecord(record.Metadata.Trigram.Upper)
  const lowerTrigram = getTrigramRecord(record.Metadata.Trigram.Lower)
  const upperChinese = String(upperTrigram.Name.Chinese.Traditional)
  const lowerChinese = String(lowerTrigram.Name.Chinese.Traditional)
  const upperPinyin = capitalizeFirst(
    String(upperTrigram.Metadata.Pronunciation.Pinyin),
  )
  const lowerPinyin = capitalizeFirst(
    String(lowerTrigram.Metadata.Pronunciation.Pinyin),
  )
  const upperEnglish = capitalizeFirst(
    String(upperTrigram.Imagery.English.WilhelmBaynes),
  )
  const lowerEnglish = capitalizeFirst(
    String(lowerTrigram.Imagery.English.WilhelmBaynes),
  )
  return [
    `#${wenwang} ${chinese}（${pinyin}）`,
    english,
    `Upper: ${upperChinese} ${upperPinyin} (${upperEnglish})`,
    `Lower: ${lowerChinese} ${lowerPinyin} (${lowerEnglish})`,
  ] as const
}
