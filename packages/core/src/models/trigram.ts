// 乾，兌，離，震，巽，坎，艮，坤。
export const FUXI_ORDER = [1, 2, 3, 4, 5, 6, 7, 8] as const
type FuxiOrder = (typeof FUXI_ORDER)[number]

// 帝出乎震，齊乎巽，相見乎離，致役乎坤，説言乎兑，戰乎乾，勞乎坎，成言乎艮。
export const WEN_WANG_ORDER = {
  1: 4, // 乾 -> 4th in Wen Wang order
  2: 5, // 兌 -> 5th in Wen Wang order
  3: 3, // 離 -> 3rd in Wen Wang order
  4: 8, // 震 -> 8th in Wen Wang order
  5: 2, // 巽 -> 2nd in Wen Wang order
  6: 1, // 坎 -> 1st in Wen Wang order
  7: 6, // 艮 -> 6th in Wen Wang order
  8: 7, // 坤 -> 7th in Wen Wang order
} as const
type WenWangOrder<Order extends FuxiOrder> = (typeof WEN_WANG_ORDER)[Order]

// ============================================================================
// Trigram Key
// ============================================================================

export const TRIGRAM_KEYS = {
  1: 'T111',
  2: 'T112',
  3: 'T121',
  4: 'T122',
  5: 'T211',
  6: 'T212',
  7: 'T221',
  8: 'T222',
} as const

export type TrigramKey<Order extends FuxiOrder = FuxiOrder> =
  (typeof TRIGRAM_KEYS)[Order]

// ============================================================================
// Trigram Name
// ============================================================================

export const TRIGRAM_NAMES_CHINESE_TRADITIONAL = {
  1: '乾',
  2: '兌',
  3: '離',
  4: '震',
  5: '巽',
  6: '坎',
  7: '艮',
  8: '坤',
} as const
type TrigramNameChineseTraditional<Order extends FuxiOrder> =
  (typeof TRIGRAM_NAMES_CHINESE_TRADITIONAL)[Order]

export const TRIGRAM_NAMES_CHINESE_SIMPLIFIED = {
  1: '乾',
  2: '兑',
  3: '离',
  4: '震',
  5: '巽',
  6: '坎',
  7: '艮',
  8: '坤',
} as const
type TrigramNameChineseSimplified<Order extends FuxiOrder> =
  (typeof TRIGRAM_NAMES_CHINESE_SIMPLIFIED)[Order]

export const TRIGRAM_NAMES_ENGLISH_WILHELM_BAYNES = {
  1: 'Ch’ien / the Creative',
  2: 'Tui / the Joyous',
  3: 'Li / the Clinging',
  4: 'Chên / the Arousing',
  5: 'Sun / the Gentle',
  6: 'K’an / the Abysmal',
  7: 'Kên / Keeping Still',
  8: 'K’un / the Receptive',
} as const
type TrigramNameEnglishWilhelmBaynes<Order extends FuxiOrder> =
  (typeof TRIGRAM_NAMES_ENGLISH_WILHELM_BAYNES)[Order]

export const TRIGRAM_NAMES_ENGLISH_LEGGE = {
  1: 'khien',
  2: 'tui',
  3: 'lî',
  4: 'kăn',
  5: 'sun',
  6: 'khân',
  7: 'kân',
  8: 'khwăn',
} as const
type TrigramNameEnglishLegge<Order extends FuxiOrder> =
  (typeof TRIGRAM_NAMES_ENGLISH_LEGGE)[Order]

export type TrigramNames<Order extends FuxiOrder> = {
  Chinese: {
    Traditional: TrigramNameChineseTraditional<Order>
    Simplified: TrigramNameChineseSimplified<Order>
  }
  English: {
    WilhelmBaynes: TrigramNameEnglishWilhelmBaynes<Order>
    Legge: TrigramNameEnglishLegge<Order>
  }
}

// ============================================================================
// Trigram Imagery
// ============================================================================
export const TRIGRAM_IMAGERY_CHINESE_TRADITIONAL = {
  1: '天',
  2: '澤',
  3: '火',
  4: '雷',
  5: '風',
  6: '水',
  7: '山',
  8: '地',
} as const
type TrigramImageryChineseTraditional<Order extends FuxiOrder> =
  (typeof TRIGRAM_IMAGERY_CHINESE_TRADITIONAL)[Order]

export const TRIGRAM_IMAGERY_CHINESE_SIMPLIFIED = {
  1: '天',
  2: '泽',
  3: '火',
  4: '雷',
  5: '风',
  6: '水',
  7: '山',
  8: '地',
} as const
type TrigramImageryChineseSimplified<Order extends FuxiOrder> =
  (typeof TRIGRAM_IMAGERY_CHINESE_SIMPLIFIED)[Order]

export const TRIGRAM_IMAGERY_ENGLISH_WILHELM_BAYNES = {
  1: 'heaven',
  2: 'lake',
  3: 'fire',
  4: 'thunder',
  5: 'wind, wood',
  6: 'water',
  7: 'mountain',
  8: 'earth',
} as const
type TrigramImageryEnglishWilhelmBaynes<Order extends FuxiOrder> =
  (typeof TRIGRAM_IMAGERY_ENGLISH_WILHELM_BAYNES)[Order]

export const TRIGRAM_IMAGERY_ENGLISH_LEGGE = {
  1: 'Heaven, the Sky',
  2: 'Water, collected as in a marsh or lake',
  3: 'Fire, as in lightning; the sun',
  4: 'Thunder',
  5: 'The wind, wood',
  6: 'Water, as in rain, clouds, springs, streams and defiles. The moon',
  7: 'Hills, or mountains',
  8: 'The earth',
} as const
type TrigramImageryEnglishLegge<Order extends FuxiOrder> =
  (typeof TRIGRAM_IMAGERY_ENGLISH_LEGGE)[Order]

export type TrigramImagery<Order extends FuxiOrder> = {
  Chinese: {
    Traditional: TrigramImageryChineseTraditional<Order>
    Simplified: TrigramImageryChineseSimplified<Order>
  }
  English: {
    WilhelmBaynes: TrigramImageryEnglishWilhelmBaynes<Order>
    Legge: TrigramImageryEnglishLegge<Order>
  }
}

// ============================================================================
// Trigram Binary
// ============================================================================

// Use Fuxi sequence for binary representation.
export const TRIGRAM_BINARIES = {
  1: '0b111', // 乾 (Heaven)
  2: '0b110', // 兌 (Lake)
  3: '0b101', // 離 (Fire)
  4: '0b100', // 震 (Thunder)
  5: '0b011', // 巽 (Wind)
  6: '0b010', // 坎 (Water)
  7: '0b001', // 艮 (Mountain)
  8: '0b000', // 坤 (Earth)
} as const

export type TrigramBinary<Order extends FuxiOrder> =
  (typeof TRIGRAM_BINARIES)[Order]

// ============================================================================
// Trigram Pronunciation
// ============================================================================

export const TRIGRAM_PRONUNCIATION_PINYIN = {
  1: 'qián', // 乾
  2: 'duì', // 兌
  3: 'lí', // 離
  4: 'zhèn', // 震
  5: 'xùn', // 巽
  6: 'kǎn', // 坎
  7: 'gèn', // 艮
  8: 'kūn', // 坤
} as const

type TrigramPronunciationPinyin<Order extends FuxiOrder> =
  (typeof TRIGRAM_PRONUNCIATION_PINYIN)[Order]

export const TRIGRAM_PRONUNCIATION_ZHUYIN = {
  1: 'ㄑㄧㄢˊ', // 乾
  2: 'ㄉㄨㄟˋ', // 兌
  3: 'ㄌㄧˊ', // 離
  4: 'ㄓㄣˋ', // 震
  5: 'ㄒㄩㄣˋ', // 巽
  6: 'ㄎㄢˇ', // 坎
  7: 'ㄍㄣˋ', // 艮
  8: 'ㄎㄨㄣ', // 坤
} as const

type TrigramPronunciationZhuyin<Order extends FuxiOrder> =
  (typeof TRIGRAM_PRONUNCIATION_ZHUYIN)[Order]

// ============================================================================
// Trigram Unicode
// ============================================================================

export const TRIGRAM_UNICODE_CHARACTERS = {
  1: '☰', // 乾 (Heaven)
  2: '☱', // 兌 (Lake)
  3: '☲', // 離 (Fire)
  4: '☳', // 震 (Thunder)
  5: '☴', // 巽 (Wind)
  6: '☵', // 坎 (Water)
  7: '☶', // 艮 (Mountain)
  8: '☷', // 坤 (Earth)
} as const

type TrigramUnicodeCharacter<Order extends FuxiOrder> =
  (typeof TRIGRAM_UNICODE_CHARACTERS)[Order]

export const TRIGRAM_UNICODE_NAMES = {
  1: 'Trigram For Heaven', // 乾
  2: 'Trigram For Lake', // 兌
  3: 'Trigram For Fire', // 離
  4: 'Trigram For Thunder', // 震
  5: 'Trigram For Wind', // 巽
  6: 'Trigram For Water', // 坎
  7: 'Trigram For Mountain', // 艮
  8: 'Trigram For Earth', // 坤
} as const

type TrigramUnicodeName<Order extends FuxiOrder> =
  (typeof TRIGRAM_UNICODE_NAMES)[Order]

export const TRIGRAM_UNICODE_DECIMAL_CODEPOINT = {
  1: 9776, // 乾 (Heaven)
  2: 9777, // 兌 (Lake)
  3: 9778, // 離 (Fire)
  4: 9779, // 震 (Thunder)
  5: 9780, // 巽 (Wind)
  6: 9781, // 坎 (Water)
  7: 9782, // 艮 (Mountain)
  8: 9783, // 坤 (Earth)
} as const

type TrigramUnicodeDecimalCodePoint<Order extends FuxiOrder> =
  (typeof TRIGRAM_UNICODE_DECIMAL_CODEPOINT)[Order]

export const TRIGRAM_UNICODE_DECIMAL_UTF8 = {
  1: [226, 152, 176], // ☰ 乾 (Heaven)
  2: [226, 152, 177], // ☱ 兌 (Lake)
  3: [226, 152, 178], // ☲ 離 (Fire)
  4: [226, 152, 179], // ☳ 震 (Thunder)
  5: [226, 152, 180], // ☴ 巽 (Wind)
  6: [226, 152, 181], // ☵ 坎 (Water)
  7: [226, 152, 182], // ☶ 艮 (Mountain)
  8: [226, 152, 183], // ☷ 坤 (Earth)
} as const

type TrigramUnicodeDecimalUtf8<Order extends FuxiOrder> =
  (typeof TRIGRAM_UNICODE_DECIMAL_UTF8)[Order]

export const TRIGRAM_UNICODE_HEX_CODEPOINT = {
  1: 'U+2630', // 乾 (Heaven)
  2: 'U+2631', // 兌 (Lake)
  3: 'U+2632', // 離 (Fire)
  4: 'U+2633', // 震 (Thunder)
  5: 'U+2634', // 巽 (Wind)
  6: 'U+2635', // 坎 (Water)
  7: 'U+2636', // 艮 (Mountain)
  8: 'U+2637', // 坤 (Earth)
} as const

type TrigramUnicodeHexCodePoint<Order extends FuxiOrder> =
  (typeof TRIGRAM_UNICODE_HEX_CODEPOINT)[Order]

export const TRIGRAM_UNICODE_HEX_UTF8 = {
  1: '0xe298b0', // 乾 (Heaven)
  2: '0xe29801', // 兌 (Lake)
  3: '0xe29802', // 離 (Fire)
  4: '0xe29803', // 震 (Thunder)
  5: '0xe29804', // 巽 (Wind)
  6: '0xe29805', // 坎 (Water)
  7: '0xe29806', // 艮 (Mountain)
  8: '0xe29807', // 坤 (Earth)
} as const

type TrigramUnicodeHexUtf8<Order extends FuxiOrder> =
  (typeof TRIGRAM_UNICODE_HEX_UTF8)[Order]

// ============================================================================
// Trigram Metadata
// ============================================================================

export type TrigramMetadata<Order extends FuxiOrder> = {
  Order: {
    Fuxi: Extract<FuxiOrder, Order>
    WenWang: WenWangOrder<Order>
  } // 文王卦序、伏羲卦序
  Binary: TrigramBinary<Order> // 二进制卦象
  Pronunciation: {
    Pinyin: TrigramPronunciationPinyin<Order>
    Zhuyin: TrigramPronunciationZhuyin<Order>
  } // 拼音、注音
  Unicode: {
    Character: TrigramUnicodeCharacter<Order> // 卦符
    Name: TrigramUnicodeName<Order> // 卦名
    Decimal: {
      CodePoint: TrigramUnicodeDecimalCodePoint<Order> // 十进制码点
      UTF8: TrigramUnicodeDecimalUtf8<Order> // 十进制UTF-8编码
    }
    Hex: {
      CodePoint: TrigramUnicodeHexCodePoint<Order> // 十六进制码点
      UTF8: TrigramUnicodeHexUtf8<Order> // 十六进制UTF-8编码
    }
  }
}

// ============================================================================
// Generic Trigram Record
// ============================================================================

export type GenericTrigramRecord<Order extends FuxiOrder = FuxiOrder> = {
  Key: TrigramKey<Order>
  Name: TrigramNames<Order>
  Imagery: TrigramImagery<Order>
  Metadata: TrigramMetadata<Order>
}
