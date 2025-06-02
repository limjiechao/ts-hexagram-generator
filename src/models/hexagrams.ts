import { HEXAGRAM_METADATA } from './hexagram-metadata'
import { HEXAGRAM_NAME } from './hexagram-name'
import { HEXAGRAM_TEXT_CHINESE_SIMPLIFIED } from './hexagram-text-chinese-simplified'
import { HEXAGRAM_TEXT_CHINESE_TRADITIONAL } from './hexagram-text-chinese-traditional'
import { HEXAGRAM_TEXT_ENGLISH_LEGGE } from './hexagram-text-english-legge'
import { HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES } from './hexagram-text-english-wilhelm-baynes'
import type { HexagramKey } from './foundation'
import type { GenericHexagramRecord } from './hexagram'

// A lookup of all 64 hexagrams
export type HexagramRecords = Record<HexagramKey, GenericHexagramRecord>

export const HEXAGRAM_RECORDS: HexagramRecords = {
  H111111: {
    Key: 'H111111',
    Name: HEXAGRAM_NAME[1],
    Metadata: HEXAGRAM_METADATA[1],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[1],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[1],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[1],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[1],
      },
    },
  } as const satisfies GenericHexagramRecord<1>,
  H222222: {
    Key: 'H222222',
    Name: HEXAGRAM_NAME[2],
    Metadata: HEXAGRAM_METADATA[2],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[2],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[2],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[2],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[2],
      },
    },
  } as const satisfies GenericHexagramRecord<2>,
  H122212: {
    Key: 'H122212',
    Name: HEXAGRAM_NAME[3],
    Metadata: HEXAGRAM_METADATA[3],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[3],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[3],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[3],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[3],
      },
    },
  } as const satisfies GenericHexagramRecord<3>,
  H212221: {
    Key: 'H212221',
    Name: HEXAGRAM_NAME[4],
    Metadata: HEXAGRAM_METADATA[4],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[4],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[4],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[4],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[4],
      },
    },
  } as const satisfies GenericHexagramRecord<4>,
  H111212: {
    Key: 'H111212',
    Name: HEXAGRAM_NAME[5],
    Metadata: HEXAGRAM_METADATA[5],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[5],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[5],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[5],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[5],
      },
    },
  } as const satisfies GenericHexagramRecord<5>,
  H212111: {
    Key: 'H212111',
    Name: HEXAGRAM_NAME[6],
    Metadata: HEXAGRAM_METADATA[6],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[6],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[6],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[6],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[6],
      },
    },
  } as const satisfies GenericHexagramRecord<6>,
  H212222: {
    Key: 'H212222',
    Name: HEXAGRAM_NAME[7],
    Metadata: HEXAGRAM_METADATA[7],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[7],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[7],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[7],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[7],
      },
    },
  } as const satisfies GenericHexagramRecord<7>,
  H222212: {
    Key: 'H222212',
    Name: HEXAGRAM_NAME[8],
    Metadata: HEXAGRAM_METADATA[8],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[8],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[8],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[8],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[8],
      },
    },
  } as const satisfies GenericHexagramRecord<8>,
  H111211: {
    Key: 'H111211',
    Name: HEXAGRAM_NAME[9],
    Metadata: HEXAGRAM_METADATA[9],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[9],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[9],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[9],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[9],
      },
    },
  } as const satisfies GenericHexagramRecord<9>,
  H112111: {
    Key: 'H112111',
    Name: HEXAGRAM_NAME[10],
    Metadata: HEXAGRAM_METADATA[10],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[10],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[10],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[10],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[10],
      },
    },
  } as const satisfies GenericHexagramRecord<10>,
  H111222: {
    Key: 'H111222',
    Name: HEXAGRAM_NAME[11],
    Metadata: HEXAGRAM_METADATA[11],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[11],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[11],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[11],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[11],
      },
    },
  } as const satisfies GenericHexagramRecord<11>,
  H222111: {
    Key: 'H222111',
    Name: HEXAGRAM_NAME[12],
    Metadata: HEXAGRAM_METADATA[12],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[12],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[12],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[12],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[12],
      },
    },
  } as const satisfies GenericHexagramRecord<12>,
  H121111: {
    Key: 'H121111',
    Name: HEXAGRAM_NAME[13],
    Metadata: HEXAGRAM_METADATA[13],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[13],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[13],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[13],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[13],
      },
    },
  } as const satisfies GenericHexagramRecord<13>,
  H111121: {
    Key: 'H111121',
    Name: HEXAGRAM_NAME[14],
    Metadata: HEXAGRAM_METADATA[14],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[14],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[14],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[14],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[14],
      },
    },
  } as const satisfies GenericHexagramRecord<14>,
  H221222: {
    Key: 'H221222',
    Name: HEXAGRAM_NAME[15],
    Metadata: HEXAGRAM_METADATA[15],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[15],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[15],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[15],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[15],
      },
    },
  } as const satisfies GenericHexagramRecord<15>,
  H222122: {
    Key: 'H222122',
    Name: HEXAGRAM_NAME[16],
    Metadata: HEXAGRAM_METADATA[16],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[16],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[16],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[16],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[16],
      },
    },
  } as const satisfies GenericHexagramRecord<16>,
  H122112: {
    Key: 'H122112',
    Name: HEXAGRAM_NAME[17],
    Metadata: HEXAGRAM_METADATA[17],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[17],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[17],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[17],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[17],
      },
    },
  } as const satisfies GenericHexagramRecord<17>,
  H211221: {
    Key: 'H211221',
    Name: HEXAGRAM_NAME[18],
    Metadata: HEXAGRAM_METADATA[18],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[18],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[18],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[18],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[18],
      },
    },
  } as const satisfies GenericHexagramRecord<18>,
  H112222: {
    Key: 'H112222',
    Name: HEXAGRAM_NAME[19],
    Metadata: HEXAGRAM_METADATA[19],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[19],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[19],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[19],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[19],
      },
    },
  } as const satisfies GenericHexagramRecord<19>,
  H222211: {
    Key: 'H222211',
    Name: HEXAGRAM_NAME[20],
    Metadata: HEXAGRAM_METADATA[20],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[20],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[20],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[20],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[20],
      },
    },
  } as const satisfies GenericHexagramRecord<20>,
  H122121: {
    Key: 'H122121',
    Name: HEXAGRAM_NAME[21],
    Metadata: HEXAGRAM_METADATA[21],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[21],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[21],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[21],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[21],
      },
    },
  } as const satisfies GenericHexagramRecord<21>,
  H121221: {
    Key: 'H121221',
    Name: HEXAGRAM_NAME[22],
    Metadata: HEXAGRAM_METADATA[22],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[22],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[22],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[22],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[22],
      },
    },
  } as const satisfies GenericHexagramRecord<22>,
  H222221: {
    Key: 'H222221',
    Name: HEXAGRAM_NAME[23],
    Metadata: HEXAGRAM_METADATA[23],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[23],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[23],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[23],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[23],
      },
    },
  } as const satisfies GenericHexagramRecord<23>,
  H122222: {
    Key: 'H122222',
    Name: HEXAGRAM_NAME[24],
    Metadata: HEXAGRAM_METADATA[24],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[24],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[24],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[24],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[24],
      },
    },
  } as const satisfies GenericHexagramRecord<24>,
  H122111: {
    Key: 'H122111',
    Name: HEXAGRAM_NAME[25],
    Metadata: HEXAGRAM_METADATA[25],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[25],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[25],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[25],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[25],
      },
    },
  } as const satisfies GenericHexagramRecord<25>,
  H111221: {
    Key: 'H111221',
    Name: HEXAGRAM_NAME[26],
    Metadata: HEXAGRAM_METADATA[26],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[26],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[26],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[26],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[26],
      },
    },
  } as const satisfies GenericHexagramRecord<26>,
  H122221: {
    Key: 'H122221',
    Name: HEXAGRAM_NAME[27],
    Metadata: HEXAGRAM_METADATA[27],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[27],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[27],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[27],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[27],
      },
    },
  } as const satisfies GenericHexagramRecord<27>,
  H211112: {
    Key: 'H211112',
    Name: HEXAGRAM_NAME[28],
    Metadata: HEXAGRAM_METADATA[28],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[28],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[28],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[28],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[28],
      },
    },
  } as const satisfies GenericHexagramRecord<28>,
  H212212: {
    Key: 'H212212',
    Name: HEXAGRAM_NAME[29],
    Metadata: HEXAGRAM_METADATA[29],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[29],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[29],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[29],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[29],
      },
    },
  } as const satisfies GenericHexagramRecord<29>,
  H121121: {
    Key: 'H121121',
    Name: HEXAGRAM_NAME[30],
    Metadata: HEXAGRAM_METADATA[30],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[30],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[30],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[30],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[30],
      },
    },
  } as const satisfies GenericHexagramRecord<30>,
  H221112: {
    Key: 'H221112',
    Name: HEXAGRAM_NAME[31],
    Metadata: HEXAGRAM_METADATA[31],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[31],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[31],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[31],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[31],
      },
    },
  } as const satisfies GenericHexagramRecord<31>,
  H211122: {
    Key: 'H211122',
    Name: HEXAGRAM_NAME[32],
    Metadata: HEXAGRAM_METADATA[32],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[32],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[32],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[32],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[32],
      },
    },
  } as const satisfies GenericHexagramRecord<32>,
  H221111: {
    Key: 'H221111',
    Name: HEXAGRAM_NAME[33],
    Metadata: HEXAGRAM_METADATA[33],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[33],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[33],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[33],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[33],
      },
    },
  } as const satisfies GenericHexagramRecord<33>,
  H111122: {
    Key: 'H111122',
    Name: HEXAGRAM_NAME[34],
    Metadata: HEXAGRAM_METADATA[34],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[34],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[34],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[34],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[34],
      },
    },
  } as const satisfies GenericHexagramRecord<34>,
  H222121: {
    Key: 'H222121',
    Name: HEXAGRAM_NAME[35],
    Metadata: HEXAGRAM_METADATA[35],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[35],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[35],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[35],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[35],
      },
    },
  } as const satisfies GenericHexagramRecord<35>,
  H121222: {
    Key: 'H121222',
    Name: HEXAGRAM_NAME[36],
    Metadata: HEXAGRAM_METADATA[36],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[36],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[36],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[36],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[36],
      },
    },
  } as const satisfies GenericHexagramRecord<36>,
  H121211: {
    Key: 'H121211',
    Name: HEXAGRAM_NAME[37],
    Metadata: HEXAGRAM_METADATA[37],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[37],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[37],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[37],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[37],
      },
    },
  } as const satisfies GenericHexagramRecord<37>,
  H112121: {
    Key: 'H112121',
    Name: HEXAGRAM_NAME[38],
    Metadata: HEXAGRAM_METADATA[38],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[38],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[38],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[38],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[38],
      },
    },
  } as const satisfies GenericHexagramRecord<38>,
  H221212: {
    Key: 'H221212',
    Name: HEXAGRAM_NAME[39],
    Metadata: HEXAGRAM_METADATA[39],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[39],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[39],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[39],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[39],
      },
    },
  } as const satisfies GenericHexagramRecord<39>,
  H212122: {
    Key: 'H212122',
    Name: HEXAGRAM_NAME[40],
    Metadata: HEXAGRAM_METADATA[40],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[40],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[40],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[40],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[40],
      },
    },
  } as const satisfies GenericHexagramRecord<40>,
  H112221: {
    Key: 'H112221',
    Name: HEXAGRAM_NAME[41],
    Metadata: HEXAGRAM_METADATA[41],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[41],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[41],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[41],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[41],
      },
    },
  } as const satisfies GenericHexagramRecord<41>,
  H122211: {
    Key: 'H122211',
    Name: HEXAGRAM_NAME[42],
    Metadata: HEXAGRAM_METADATA[42],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[42],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[42],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[42],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[42],
      },
    },
  } as const satisfies GenericHexagramRecord<42>,
  H111112: {
    Key: 'H111112',
    Name: HEXAGRAM_NAME[43],
    Metadata: HEXAGRAM_METADATA[43],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[43],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[43],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[43],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[43],
      },
    },
  } as const satisfies GenericHexagramRecord<43>,
  H211111: {
    Key: 'H211111',
    Name: HEXAGRAM_NAME[44],
    Metadata: HEXAGRAM_METADATA[44],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[44],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[44],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[44],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[44],
      },
    },
  } as const satisfies GenericHexagramRecord<44>,
  H222112: {
    Key: 'H222112',
    Name: HEXAGRAM_NAME[45],
    Metadata: HEXAGRAM_METADATA[45],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[45],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[45],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[45],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[45],
      },
    },
  } as const satisfies GenericHexagramRecord<45>,
  H211222: {
    Key: 'H211222',
    Name: HEXAGRAM_NAME[46],
    Metadata: HEXAGRAM_METADATA[46],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[46],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[46],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[46],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[46],
      },
    },
  } as const satisfies GenericHexagramRecord<46>,
  H212112: {
    Key: 'H212112',
    Name: HEXAGRAM_NAME[47],
    Metadata: HEXAGRAM_METADATA[47],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[47],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[47],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[47],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[47],
      },
    },
  } as const satisfies GenericHexagramRecord<47>,
  H211212: {
    Key: 'H211212',
    Name: HEXAGRAM_NAME[48],
    Metadata: HEXAGRAM_METADATA[48],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[48],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[48],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[48],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[48],
      },
    },
  } as const satisfies GenericHexagramRecord<48>,
  H121112: {
    Key: 'H121112',
    Name: HEXAGRAM_NAME[49],
    Metadata: HEXAGRAM_METADATA[49],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[49],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[49],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[49],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[49],
      },
    },
  } as const satisfies GenericHexagramRecord<49>,
  H211121: {
    Key: 'H211121',
    Name: HEXAGRAM_NAME[50],
    Metadata: HEXAGRAM_METADATA[50],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[50],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[50],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[50],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[50],
      },
    },
  } as const satisfies GenericHexagramRecord<50>,
  H122122: {
    Key: 'H122122',
    Name: HEXAGRAM_NAME[51],
    Metadata: HEXAGRAM_METADATA[51],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[51],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[51],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[51],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[51],
      },
    },
  } as const satisfies GenericHexagramRecord<51>,
  H221221: {
    Key: 'H221221',
    Name: HEXAGRAM_NAME[52],
    Metadata: HEXAGRAM_METADATA[52],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[52],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[52],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[52],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[52],
      },
    },
  } as const satisfies GenericHexagramRecord<52>,
  H221211: {
    Key: 'H221211',
    Name: HEXAGRAM_NAME[53],
    Metadata: HEXAGRAM_METADATA[53],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[53],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[53],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[53],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[53],
      },
    },
  } as const satisfies GenericHexagramRecord<53>,
  H112122: {
    Key: 'H112122',
    Name: HEXAGRAM_NAME[54],
    Metadata: HEXAGRAM_METADATA[54],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[54],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[54],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[54],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[54],
      },
    },
  } as const satisfies GenericHexagramRecord<54>,
  H121122: {
    Key: 'H121122',
    Name: HEXAGRAM_NAME[55],
    Metadata: HEXAGRAM_METADATA[55],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[55],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[55],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[55],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[55],
      },
    },
  } as const satisfies GenericHexagramRecord<55>,
  H221121: {
    Key: 'H221121',
    Name: HEXAGRAM_NAME[56],
    Metadata: HEXAGRAM_METADATA[56],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[56],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[56],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[56],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[56],
      },
    },
  } as const satisfies GenericHexagramRecord<56>,
  H211211: {
    Key: 'H211211',
    Name: HEXAGRAM_NAME[57],
    Metadata: HEXAGRAM_METADATA[57],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[57],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[57],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[57],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[57],
      },
    },
  } as const satisfies GenericHexagramRecord<57>,
  H112112: {
    Key: 'H112112',
    Name: HEXAGRAM_NAME[58],
    Metadata: HEXAGRAM_METADATA[58],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[58],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[58],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[58],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[58],
      },
    },
  } as const satisfies GenericHexagramRecord<58>,
  H212211: {
    Key: 'H212211',
    Name: HEXAGRAM_NAME[59],
    Metadata: HEXAGRAM_METADATA[59],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[59],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[59],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[59],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[59],
      },
    },
  } as const satisfies GenericHexagramRecord<59>,
  H112212: {
    Key: 'H112212',
    Name: HEXAGRAM_NAME[60],
    Metadata: HEXAGRAM_METADATA[60],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[60],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[60],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[60],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[60],
      },
    },
  } as const satisfies GenericHexagramRecord<60>,
  H112211: {
    Key: 'H112211',
    Name: HEXAGRAM_NAME[61],
    Metadata: HEXAGRAM_METADATA[61],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[61],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[61],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[61],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[61],
      },
    },
  } as const satisfies GenericHexagramRecord<61>,
  H221122: {
    Key: 'H221122',
    Name: HEXAGRAM_NAME[62],
    Metadata: HEXAGRAM_METADATA[62],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[62],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[62],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[62],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[62],
      },
    },
  } as const satisfies GenericHexagramRecord<62>,
  H121212: {
    Key: 'H121212',
    Name: HEXAGRAM_NAME[63],
    Metadata: HEXAGRAM_METADATA[63],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[63],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[63],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[63],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[63],
      },
    },
  } as const satisfies GenericHexagramRecord<63>,
  H212121: {
    Key: 'H212121',
    Name: HEXAGRAM_NAME[64],
    Metadata: HEXAGRAM_METADATA[64],
    Text: {
      Chinese: {
        Traditional: HEXAGRAM_TEXT_CHINESE_TRADITIONAL[64],
        Simplified: HEXAGRAM_TEXT_CHINESE_SIMPLIFIED[64],
      },
      English: {
        WilhelmBaynes: HEXAGRAM_TEXT_ENGLISH_WILHELM_BAYNES[64],
        Legge: HEXAGRAM_TEXT_ENGLISH_LEGGE[64],
      },
    },
  } as const satisfies GenericHexagramRecord<64>,
}
