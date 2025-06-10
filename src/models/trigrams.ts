import {
  TRIGRAM_BINARIES,
  TRIGRAM_IMAGERY_CHINESE_SIMPLIFIED,
  TRIGRAM_IMAGERY_CHINESE_TRADITIONAL,
  TRIGRAM_IMAGERY_ENGLISH_LEGGE,
  TRIGRAM_IMAGERY_ENGLISH_WILHELM_BAYNES,
  TRIGRAM_KEYS,
  TRIGRAM_NAMES_CHINESE_SIMPLIFIED,
  TRIGRAM_NAMES_CHINESE_TRADITIONAL,
  TRIGRAM_NAMES_ENGLISH_LEGGE,
  TRIGRAM_NAMES_ENGLISH_WILHELM_BAYNES,
  TRIGRAM_PRONUNCIATION_PINYIN,
  TRIGRAM_PRONUNCIATION_ZHUYIN,
  TRIGRAM_UNICODE_CHARACTERS,
  TRIGRAM_UNICODE_DECIMAL_CODEPOINT,
  TRIGRAM_UNICODE_DECIMAL_UTF8,
  TRIGRAM_UNICODE_HEX_CODEPOINT,
  TRIGRAM_UNICODE_HEX_UTF8,
  TRIGRAM_UNICODE_NAMES,
  WEN_WANG_ORDER,
  type GenericTrigramRecord,
  type TrigramKey,
} from './trigram'

export type TrigramRecords = Record<TrigramKey, GenericTrigramRecord>

export const TRIGRAM_RECORDS: TrigramRecords = {
  T111: {
    Key: TRIGRAM_KEYS[1],
    Name: {
      Chinese: {
        Traditional: TRIGRAM_NAMES_CHINESE_TRADITIONAL[1],
        Simplified: TRIGRAM_NAMES_CHINESE_SIMPLIFIED[1],
      },
      English: {
        WilhelmBaynes: TRIGRAM_NAMES_ENGLISH_WILHELM_BAYNES[1],
        Legge: TRIGRAM_NAMES_ENGLISH_LEGGE[1],
      },
    },
    Imagery: {
      Chinese: {
        Traditional: TRIGRAM_IMAGERY_CHINESE_TRADITIONAL[1],
        Simplified: TRIGRAM_IMAGERY_CHINESE_SIMPLIFIED[1],
      },
      English: {
        WilhelmBaynes: TRIGRAM_IMAGERY_ENGLISH_WILHELM_BAYNES[1],
        Legge: TRIGRAM_IMAGERY_ENGLISH_LEGGE[1],
      },
    },
    Metadata: {
      Order: {
        Fuxi: 1,
        WenWang: WEN_WANG_ORDER[1],
      },
      Binary: TRIGRAM_BINARIES[1],
      Pronunciation: {
        Pinyin: TRIGRAM_PRONUNCIATION_PINYIN[1],
        Zhuyin: TRIGRAM_PRONUNCIATION_ZHUYIN[1],
      },
      Unicode: {
        Character: TRIGRAM_UNICODE_CHARACTERS[1],
        Name: TRIGRAM_UNICODE_NAMES[1],
        Decimal: {
          CodePoint: TRIGRAM_UNICODE_DECIMAL_CODEPOINT[1],
          UTF8: TRIGRAM_UNICODE_DECIMAL_UTF8[1],
        },
        Hex: {
          CodePoint: TRIGRAM_UNICODE_HEX_CODEPOINT[1],
          UTF8: TRIGRAM_UNICODE_HEX_UTF8[1],
        },
      },
    },
  } as const satisfies GenericTrigramRecord<1>,
  T112: {
    Key: TRIGRAM_KEYS[2],
    Name: {
      Chinese: {
        Traditional: TRIGRAM_NAMES_CHINESE_TRADITIONAL[2],
        Simplified: TRIGRAM_NAMES_CHINESE_SIMPLIFIED[2],
      },
      English: {
        WilhelmBaynes: TRIGRAM_NAMES_ENGLISH_WILHELM_BAYNES[2],
        Legge: TRIGRAM_NAMES_ENGLISH_LEGGE[2],
      },
    },
    Imagery: {
      Chinese: {
        Traditional: TRIGRAM_IMAGERY_CHINESE_TRADITIONAL[2],
        Simplified: TRIGRAM_IMAGERY_CHINESE_SIMPLIFIED[2],
      },
      English: {
        WilhelmBaynes: TRIGRAM_IMAGERY_ENGLISH_WILHELM_BAYNES[2],
        Legge: TRIGRAM_IMAGERY_ENGLISH_LEGGE[2],
      },
    },
    Metadata: {
      Order: {
        Fuxi: 2,
        WenWang: WEN_WANG_ORDER[2],
      },
      Binary: TRIGRAM_BINARIES[2],
      Pronunciation: {
        Pinyin: TRIGRAM_PRONUNCIATION_PINYIN[2],
        Zhuyin: TRIGRAM_PRONUNCIATION_ZHUYIN[2],
      },
      Unicode: {
        Character: TRIGRAM_UNICODE_CHARACTERS[2],
        Name: TRIGRAM_UNICODE_NAMES[2],
        Decimal: {
          CodePoint: TRIGRAM_UNICODE_DECIMAL_CODEPOINT[2],
          UTF8: TRIGRAM_UNICODE_DECIMAL_UTF8[2],
        },
        Hex: {
          CodePoint: TRIGRAM_UNICODE_HEX_CODEPOINT[2],
          UTF8: TRIGRAM_UNICODE_HEX_UTF8[2],
        },
      },
    },
  } as const satisfies GenericTrigramRecord<2>,
  T121: {
    Key: TRIGRAM_KEYS[3],
    Name: {
      Chinese: {
        Traditional: TRIGRAM_NAMES_CHINESE_TRADITIONAL[3],
        Simplified: TRIGRAM_NAMES_CHINESE_SIMPLIFIED[3],
      },
      English: {
        WilhelmBaynes: TRIGRAM_NAMES_ENGLISH_WILHELM_BAYNES[3],
        Legge: TRIGRAM_NAMES_ENGLISH_LEGGE[3],
      },
    },
    Imagery: {
      Chinese: {
        Traditional: TRIGRAM_IMAGERY_CHINESE_TRADITIONAL[3],
        Simplified: TRIGRAM_IMAGERY_CHINESE_SIMPLIFIED[3],
      },
      English: {
        WilhelmBaynes: TRIGRAM_IMAGERY_ENGLISH_WILHELM_BAYNES[3],
        Legge: TRIGRAM_IMAGERY_ENGLISH_LEGGE[3],
      },
    },
    Metadata: {
      Order: {
        Fuxi: 3,
        WenWang: WEN_WANG_ORDER[3],
      },
      Binary: TRIGRAM_BINARIES[3],
      Pronunciation: {
        Pinyin: TRIGRAM_PRONUNCIATION_PINYIN[3],
        Zhuyin: TRIGRAM_PRONUNCIATION_ZHUYIN[3],
      },
      Unicode: {
        Character: TRIGRAM_UNICODE_CHARACTERS[3],
        Name: TRIGRAM_UNICODE_NAMES[3],
        Decimal: {
          CodePoint: TRIGRAM_UNICODE_DECIMAL_CODEPOINT[3],
          UTF8: TRIGRAM_UNICODE_DECIMAL_UTF8[3],
        },
        Hex: {
          CodePoint: TRIGRAM_UNICODE_HEX_CODEPOINT[3],
          UTF8: TRIGRAM_UNICODE_HEX_UTF8[3],
        },
      },
    },
  } as const satisfies GenericTrigramRecord<3>,
  T122: {
    Key: TRIGRAM_KEYS[4],
    Name: {
      Chinese: {
        Traditional: TRIGRAM_NAMES_CHINESE_TRADITIONAL[4],
        Simplified: TRIGRAM_NAMES_CHINESE_SIMPLIFIED[4],
      },
      English: {
        WilhelmBaynes: TRIGRAM_NAMES_ENGLISH_WILHELM_BAYNES[4],
        Legge: TRIGRAM_NAMES_ENGLISH_LEGGE[4],
      },
    },
    Imagery: {
      Chinese: {
        Traditional: TRIGRAM_IMAGERY_CHINESE_TRADITIONAL[4],
        Simplified: TRIGRAM_IMAGERY_CHINESE_SIMPLIFIED[4],
      },
      English: {
        WilhelmBaynes: TRIGRAM_IMAGERY_ENGLISH_WILHELM_BAYNES[4],
        Legge: TRIGRAM_IMAGERY_ENGLISH_LEGGE[4],
      },
    },
    Metadata: {
      Order: {
        Fuxi: 4,
        WenWang: WEN_WANG_ORDER[4],
      },
      Binary: TRIGRAM_BINARIES[4],
      Pronunciation: {
        Pinyin: TRIGRAM_PRONUNCIATION_PINYIN[4],
        Zhuyin: TRIGRAM_PRONUNCIATION_ZHUYIN[4],
      },
      Unicode: {
        Character: TRIGRAM_UNICODE_CHARACTERS[4],
        Name: TRIGRAM_UNICODE_NAMES[4],
        Decimal: {
          CodePoint: TRIGRAM_UNICODE_DECIMAL_CODEPOINT[4],
          UTF8: TRIGRAM_UNICODE_DECIMAL_UTF8[4],
        },
        Hex: {
          CodePoint: TRIGRAM_UNICODE_HEX_CODEPOINT[4],
          UTF8: TRIGRAM_UNICODE_HEX_UTF8[4],
        },
      },
    },
  } as const satisfies GenericTrigramRecord<4>,
  T211: {
    Key: TRIGRAM_KEYS[5],
    Name: {
      Chinese: {
        Traditional: TRIGRAM_NAMES_CHINESE_TRADITIONAL[5],
        Simplified: TRIGRAM_NAMES_CHINESE_SIMPLIFIED[5],
      },
      English: {
        WilhelmBaynes: TRIGRAM_NAMES_ENGLISH_WILHELM_BAYNES[5],
        Legge: TRIGRAM_NAMES_ENGLISH_LEGGE[5],
      },
    },
    Imagery: {
      Chinese: {
        Traditional: TRIGRAM_IMAGERY_CHINESE_TRADITIONAL[5],
        Simplified: TRIGRAM_IMAGERY_CHINESE_SIMPLIFIED[5],
      },
      English: {
        WilhelmBaynes: TRIGRAM_IMAGERY_ENGLISH_WILHELM_BAYNES[5],
        Legge: TRIGRAM_IMAGERY_ENGLISH_LEGGE[5],
      },
    },
    Metadata: {
      Order: {
        Fuxi: 5,
        WenWang: WEN_WANG_ORDER[5],
      },
      Binary: TRIGRAM_BINARIES[5],
      Pronunciation: {
        Pinyin: TRIGRAM_PRONUNCIATION_PINYIN[5],
        Zhuyin: TRIGRAM_PRONUNCIATION_ZHUYIN[5],
      },
      Unicode: {
        Character: TRIGRAM_UNICODE_CHARACTERS[5],
        Name: TRIGRAM_UNICODE_NAMES[5],
        Decimal: {
          CodePoint: TRIGRAM_UNICODE_DECIMAL_CODEPOINT[5],
          UTF8: TRIGRAM_UNICODE_DECIMAL_UTF8[5],
        },
        Hex: {
          CodePoint: TRIGRAM_UNICODE_HEX_CODEPOINT[5],
          UTF8: TRIGRAM_UNICODE_HEX_UTF8[5],
        },
      },
    },
  } as const satisfies GenericTrigramRecord<5>,
  T212: {
    Key: TRIGRAM_KEYS[6],
    Name: {
      Chinese: {
        Traditional: TRIGRAM_NAMES_CHINESE_TRADITIONAL[6],
        Simplified: TRIGRAM_NAMES_CHINESE_SIMPLIFIED[6],
      },
      English: {
        WilhelmBaynes: TRIGRAM_NAMES_ENGLISH_WILHELM_BAYNES[6],
        Legge: TRIGRAM_NAMES_ENGLISH_LEGGE[6],
      },
    },
    Imagery: {
      Chinese: {
        Traditional: TRIGRAM_IMAGERY_CHINESE_TRADITIONAL[6],
        Simplified: TRIGRAM_IMAGERY_CHINESE_SIMPLIFIED[6],
      },
      English: {
        WilhelmBaynes: TRIGRAM_IMAGERY_ENGLISH_WILHELM_BAYNES[6],
        Legge: TRIGRAM_IMAGERY_ENGLISH_LEGGE[6],
      },
    },
    Metadata: {
      Order: {
        Fuxi: 6,
        WenWang: WEN_WANG_ORDER[6],
      },
      Binary: TRIGRAM_BINARIES[6],
      Pronunciation: {
        Pinyin: TRIGRAM_PRONUNCIATION_PINYIN[6],
        Zhuyin: TRIGRAM_PRONUNCIATION_ZHUYIN[6],
      },
      Unicode: {
        Character: TRIGRAM_UNICODE_CHARACTERS[6],
        Name: TRIGRAM_UNICODE_NAMES[6],
        Decimal: {
          CodePoint: TRIGRAM_UNICODE_DECIMAL_CODEPOINT[6],
          UTF8: TRIGRAM_UNICODE_DECIMAL_UTF8[6],
        },
        Hex: {
          CodePoint: TRIGRAM_UNICODE_HEX_CODEPOINT[6],
          UTF8: TRIGRAM_UNICODE_HEX_UTF8[6],
        },
      },
    },
  } as const satisfies GenericTrigramRecord<6>,
  T221: {
    Key: TRIGRAM_KEYS[7],
    Name: {
      Chinese: {
        Traditional: TRIGRAM_NAMES_CHINESE_TRADITIONAL[7],
        Simplified: TRIGRAM_NAMES_CHINESE_SIMPLIFIED[7],
      },
      English: {
        WilhelmBaynes: TRIGRAM_NAMES_ENGLISH_WILHELM_BAYNES[7],
        Legge: TRIGRAM_NAMES_ENGLISH_LEGGE[7],
      },
    },
    Imagery: {
      Chinese: {
        Traditional: TRIGRAM_IMAGERY_CHINESE_TRADITIONAL[7],
        Simplified: TRIGRAM_IMAGERY_CHINESE_SIMPLIFIED[7],
      },
      English: {
        WilhelmBaynes: TRIGRAM_IMAGERY_ENGLISH_WILHELM_BAYNES[7],
        Legge: TRIGRAM_IMAGERY_ENGLISH_LEGGE[7],
      },
    },
    Metadata: {
      Order: {
        Fuxi: 7,
        WenWang: WEN_WANG_ORDER[7],
      },
      Binary: TRIGRAM_BINARIES[7],
      Pronunciation: {
        Pinyin: TRIGRAM_PRONUNCIATION_PINYIN[7],
        Zhuyin: TRIGRAM_PRONUNCIATION_ZHUYIN[7],
      },
      Unicode: {
        Character: TRIGRAM_UNICODE_CHARACTERS[7],
        Name: TRIGRAM_UNICODE_NAMES[7],
        Decimal: {
          CodePoint: TRIGRAM_UNICODE_DECIMAL_CODEPOINT[7],
          UTF8: TRIGRAM_UNICODE_DECIMAL_UTF8[7],
        },
        Hex: {
          CodePoint: TRIGRAM_UNICODE_HEX_CODEPOINT[7],
          UTF8: TRIGRAM_UNICODE_HEX_UTF8[7],
        },
      },
    },
  } as const satisfies GenericTrigramRecord<7>,
  T222: {
    Key: TRIGRAM_KEYS[8],
    Name: {
      Chinese: {
        Traditional: TRIGRAM_NAMES_CHINESE_TRADITIONAL[8],
        Simplified: TRIGRAM_NAMES_CHINESE_SIMPLIFIED[8],
      },
      English: {
        WilhelmBaynes: TRIGRAM_NAMES_ENGLISH_WILHELM_BAYNES[8],
        Legge: TRIGRAM_NAMES_ENGLISH_LEGGE[8],
      },
    },
    Imagery: {
      Chinese: {
        Traditional: TRIGRAM_IMAGERY_CHINESE_TRADITIONAL[8],
        Simplified: TRIGRAM_IMAGERY_CHINESE_SIMPLIFIED[8],
      },
      English: {
        WilhelmBaynes: TRIGRAM_IMAGERY_ENGLISH_WILHELM_BAYNES[8],
        Legge: TRIGRAM_IMAGERY_ENGLISH_LEGGE[8],
      },
    },
    Metadata: {
      Order: {
        Fuxi: 8,
        WenWang: WEN_WANG_ORDER[8],
      },
      Binary: TRIGRAM_BINARIES[8],
      Pronunciation: {
        Pinyin: TRIGRAM_PRONUNCIATION_PINYIN[8],
        Zhuyin: TRIGRAM_PRONUNCIATION_ZHUYIN[8],
      },
      Unicode: {
        Character: TRIGRAM_UNICODE_CHARACTERS[8],
        Name: TRIGRAM_UNICODE_NAMES[8],
        Decimal: {
          CodePoint: TRIGRAM_UNICODE_DECIMAL_CODEPOINT[8],
          UTF8: TRIGRAM_UNICODE_DECIMAL_UTF8[8],
        },
        Hex: {
          CodePoint: TRIGRAM_UNICODE_HEX_CODEPOINT[8],
          UTF8: TRIGRAM_UNICODE_HEX_UTF8[8],
        },
      },
    },
  } as const satisfies GenericTrigramRecord<8>,
}
