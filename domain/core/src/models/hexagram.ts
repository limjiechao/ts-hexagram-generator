import type {
  FuxiOrder,
  HexagramBinary,
  HexagramKey,
  HexagramNameChineseSimplified,
  HexagramNameChineseTraditional,
  HexagramNameEnglishLegge,
  HexagramNameEnglishWilhelmBaynes,
  HexagramPronunciationPinyin,
  HexagramPronunciationZhuyin,
  HexagramUnicodeCharacter,
  HexagramUnicodeDecimalCodePoint,
  HexagramUnicodeDecimalUtf8,
  HexagramUnicodeHexCodePoint,
  HexagramUnicodeHexUtf8,
  HexagramUnicodeName,
  LineTexts,
  LowerTrigramKey,
  UpperTrigramKey,
  WenWangOrder,
} from './foundation'
import type { HexagramTextChineseSimplified } from './hexagram-text-chinese-simplified'
import type { HexagramTextChineseTraditional } from './hexagram-text-chinese-traditional'
import type { HexagramTextEnglishLegge } from './hexagram-text-english-legge'
import type { HexagramTextEnglishWilhelmBaynes } from './hexagram-text-english-wilhelm-baynes'

// ============================================================================
// Metadata
// ============================================================================
export type HexagramMetadata<Order extends WenWangOrder = WenWangOrder> = {
  Order: {
    WenWang: Extract<WenWangOrder, Order>
    Fuxi: FuxiOrder<Order>
  } // 文王卦序、伏羲卦序
  Trigram: { Lower: LowerTrigramKey<Order>; Upper: UpperTrigramKey<Order> } // 下卦、上卦
  Binary: HexagramBinary<Order> // 二进制卦象
  Pronunciation: {
    Pinyin: HexagramPronunciationPinyin<Order>
    Zhuyin: HexagramPronunciationZhuyin<Order>
  } // 拼音、注音
  Unicode: {
    Character: HexagramUnicodeCharacter<Order> // 卦符
    Name: HexagramUnicodeName<Order> // 卦名
    Decimal: {
      CodePoint: HexagramUnicodeDecimalCodePoint<Order> // 十进制码点
      UTF8: HexagramUnicodeDecimalUtf8<Order> // 十进制UTF-8编码
    }
    Hex: {
      CodePoint: HexagramUnicodeHexCodePoint<Order> // 十六进制码点
      UTF8: HexagramUnicodeHexUtf8<Order> // 十六进制UTF-8编码
    }
  }
}

// ============================================================================
// Name
// ============================================================================
export type HexagramNames<Order extends WenWangOrder = WenWangOrder> = {
  Chinese: {
    Traditional: HexagramNameChineseTraditional<Order>
    Simplified: HexagramNameChineseSimplified<Order>
  } // 中文
  English: {
    WilhelmBaynes: HexagramNameEnglishWilhelmBaynes<Order>
    Legge: HexagramNameEnglishLegge<Order>
  } // 英文譯名
}

// ============================================================================
// Text
// ============================================================================

export type HexagramTextScripture = {
  // 卦辭
  Hexagram: string
  // 爻辭
  Lines: LineTexts
}

export type HexagramTextExegesis = {
  // 彖辭
  Judgment: string
  // 象傳
  Imagery: {
    // 大象、卦象
    Hexagram: string
    // 小象、爻象
    Lines: LineTexts
  }
}

export type HexagramText = {
  // 《周易》文本
  Scripture: HexagramTextScripture
  // 《易传》文本
  Exegesis: HexagramTextExegesis
}

export type HexagramTexts<Order extends WenWangOrder = WenWangOrder> = {
  Chinese: {
    Traditional: HexagramTextChineseTraditional<Order>
    Simplified: HexagramTextChineseSimplified<Order>
  }
  English: {
    WilhelmBaynes: HexagramTextEnglishWilhelmBaynes<Order>
    Legge: HexagramTextEnglishLegge<Order>
  }
}

// ============================================================================
// Hexagram Record
// ============================================================================
export type GenericHexagramRecord<Order extends WenWangOrder = WenWangOrder> = {
  Key: HexagramKey<Order>
  Name: HexagramNames<Order>
  Metadata: HexagramMetadata<Order>
  Text: HexagramTexts<Order>
}
