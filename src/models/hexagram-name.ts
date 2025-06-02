import type { WenWangOrder } from './foundation.js'

export const HEXAGRAM_NAME = {
  1: {
    Chinese: {
      Traditional: '乾',
      Simplified: '乾',
    },
    English: {
      WilhelmBaynes: 'Ch’ien / The Creative',
      Legge: 'I. The Khien Hexagram',
    },
  },
  2: {
    Chinese: {
      Traditional: '坤',
      Simplified: '坤',
    },
    English: {
      WilhelmBaynes: 'K’un / The Receptive',
      Legge: 'II. The Khwăn Hexagram',
    },
  },
  3: {
    Chinese: {
      Traditional: '屯',
      Simplified: '屯',
    },
    English: {
      WilhelmBaynes: 'Chun / Difficulty at the Beginning',
      Legge: 'III. The Kun Hexagram',
    },
  },
  4: {
    Chinese: {
      Traditional: '蒙',
      Simplified: '蒙',
    },
    English: {
      WilhelmBaynes: 'Mêng / Youthful Folly',
      Legge: 'IV. The Măng Hexagram',
    },
  },
  5: {
    Chinese: {
      Traditional: '需',
      Simplified: '需',
    },
    English: {
      WilhelmBaynes: 'Hsü / Waiting (Nourishment)',
      Legge: 'V. The Hsü Hexagram',
    },
  },
  6: {
    Chinese: {
      Traditional: '訟',
      Simplified: '讼',
    },
    English: {
      WilhelmBaynes: 'Sung / Conflict',
      Legge: 'VI. The Sung Hexagram',
    },
  },
  7: {
    Chinese: {
      Traditional: '師',
      Simplified: '师',
    },
    English: {
      WilhelmBaynes: 'Shih / The Army',
      Legge: 'VII. The Sze Hexagram',
    },
  },
  8: {
    Chinese: {
      Traditional: '比',
      Simplified: '比',
    },
    English: {
      WilhelmBaynes: 'Pi / Holding Together [Union]',
      Legge: 'VIII. The Pî Hexagram',
    },
  },
  9: {
    Chinese: {
      Traditional: '小畜',
      Simplified: '小畜',
    },
    English: {
      WilhelmBaynes: 'Hsiao Ch’u / The Taming Power of the Small',
      Legge: 'IX. The Hsiâo Khû Hexagram',
    },
  },
  10: {
    Chinese: {
      Traditional: '履',
      Simplified: '履',
    },
    English: {
      WilhelmBaynes: 'Lü / Treading [Conduct]',
      Legge: 'X. The Lî Hexagram',
    },
  },
  11: {
    Chinese: {
      Traditional: '泰',
      Simplified: '泰',
    },
    English: {
      WilhelmBaynes: 'T’ai / Peace',
      Legge: 'XI. The Thâi Hexagram',
    },
  },
  12: {
    Chinese: {
      Traditional: '否',
      Simplified: '否',
    },
    English: {
      WilhelmBaynes: 'P’i / Standstill [Stagnation]',
      Legge: 'XII. The Phî Hexagram',
    },
  },
  13: {
    Chinese: {
      Traditional: '同人',
      Simplified: '同人',
    },
    English: {
      WilhelmBaynes: 'T’ung Jên / Fellowship with Men',
      Legge: 'XIII. The Thung Zăn',
    },
  },
  14: {
    Chinese: {
      Traditional: '大有',
      Simplified: '大有',
    },
    English: {
      WilhelmBaynes: 'Ta Yu / Posession in Great Measure',
      Legge: 'XIV. The Tâ Yû Hexagram',
    },
  },
  15: {
    Chinese: {
      Traditional: '謙',
      Simplified: '谦',
    },
    English: {
      WilhelmBaynes: 'Ch’ien / Modesty',
      Legge: 'XV. The Khien Hexagram',
    },
  },
  16: {
    Chinese: {
      Traditional: '豫',
      Simplified: '豫',
    },
    English: {
      WilhelmBaynes: 'Yü / Enthusiasm',
      Legge: 'XVI. The Yü Hexagram',
    },
  },
  17: {
    Chinese: {
      Traditional: '隨',
      Simplified: '随',
    },
    English: {
      WilhelmBaynes: 'Sui / Following',
      Legge: 'XVII. The Sui Hexagram',
    },
  },
  18: {
    Chinese: {
      Traditional: '蠱',
      Simplified: '蛊',
    },
    English: {
      WilhelmBaynes: 'Ku / Work on What Has Been Spoiled [Decay]',
      Legge: 'XVIII. The Kû Hexagram',
    },
  },
  19: {
    Chinese: {
      Traditional: '臨',
      Simplified: '临',
    },
    English: {
      WilhelmBaynes: 'Lin / Approach',
      Legge: 'XIX. The Lin Hexagram',
    },
  },
  20: {
    Chinese: {
      Traditional: '觀',
      Simplified: '观',
    },
    English: {
      WilhelmBaynes: 'Kuan / Contemplation (View)',
      Legge: 'XX. The Kwân Hexagram',
    },
  },
  21: {
    Chinese: {
      Traditional: '噬嗑',
      Simplified: '噬嗑',
    },
    English: {
      WilhelmBaynes: 'Shih Ho / Biting Through',
      Legge: 'XXI. The Shih Ho Hexagram',
    },
  },
  22: {
    Chinese: {
      Traditional: '賁',
      Simplified: '贲',
    },
    English: {
      WilhelmBaynes: 'Pi / Grace',
      Legge: 'XXII. The Pî Hexagram',
    },
  },
  23: {
    Chinese: {
      Traditional: '剝',
      Simplified: '剥',
    },
    English: {
      WilhelmBaynes: 'Po / Splitting Apart',
      Legge: 'XXIII. The Po Hexagram',
    },
  },
  24: {
    Chinese: {
      Traditional: '復',
      Simplified: '复',
    },
    English: {
      WilhelmBaynes: 'Fu / Return (The Turning Point)',
      Legge: 'XXIV. The Fû Hexagram',
    },
  },
  25: {
    Chinese: {
      Traditional: '無妄',
      Simplified: '无妄',
    },
    English: {
      WilhelmBaynes: 'Wu Wang / Innocence (The Unexpected)',
      Legge: 'XXV. The Wû Wang Hexagram',
    },
  },
  26: {
    Chinese: {
      Traditional: '大畜',
      Simplified: '大畜',
    },
    English: {
      WilhelmBaynes: 'Ta Ch’u / The Taming Power of the Great',
      Legge: 'XXVI. The Tâ Khû Hexagram',
    },
  },
  27: {
    Chinese: {
      Traditional: '頤',
      Simplified: '颐',
    },
    English: {
      WilhelmBaynes: 'I / The Corners of the Mouth',
      Legge: 'XXVII. The Î Hexagram',
    },
  },
  28: {
    Chinese: {
      Traditional: '大過',
      Simplified: '大过',
    },
    English: {
      WilhelmBaynes: 'Ta Kuo / Preponderance of the Great',
      Legge: 'XXVIII. The Tâ Kwo Hexagram',
    },
  },
  29: {
    Chinese: {
      Traditional: '坎',
      Simplified: '坎',
    },
    English: {
      WilhelmBaynes: 'K’an / The Abysmal (Water)',
      Legge: 'XXIX. The Khan Hexagram',
    },
  },
  30: {
    Chinese: {
      Traditional: '離',
      Simplified: '离',
    },
    English: {
      WilhelmBaynes: 'Li / The Clinging, Fire',
      Legge: 'XXX. The Lî Hexagram',
    },
  },
  31: {
    Chinese: {
      Traditional: '咸',
      Simplified: '咸',
    },
    English: {
      WilhelmBaynes: 'Hsien / Influence (Wooing)',
      Legge: 'XXXI. The Hsien Hexagram',
    },
  },
  32: {
    Chinese: {
      Traditional: '恆',
      Simplified: '恒',
    },
    English: {
      WilhelmBaynes: 'Hêng / Duration',
      Legge: 'XXXII. The Hăng Hexagram',
    },
  },
  33: {
    Chinese: {
      Traditional: '遯',
      Simplified: '遁',
    },
    English: {
      WilhelmBaynes: 'Tun / Retreat',
      Legge: 'XXXIII. The Thun Hexagram',
    },
  },
  34: {
    Chinese: {
      Traditional: '大壯',
      Simplified: '大壮',
    },
    English: {
      WilhelmBaynes: 'Ta Chuang / The Power of the Great',
      Legge: 'XXXIV. The Tâ Kwang Hexagram',
    },
  },
  35: {
    Chinese: {
      Traditional: '晉',
      Simplified: '晋',
    },
    English: {
      WilhelmBaynes: 'Chin / Progress',
      Legge: 'XXXV. The Žin Hexagram',
    },
  },
  36: {
    Chinese: {
      Traditional: '明夷',
      Simplified: '明夷',
    },
    English: {
      WilhelmBaynes: 'Ming I / Darkening of the Light',
      Legge: 'XXXVI. The Ming Î Hexagram',
    },
  },
  37: {
    Chinese: {
      Traditional: '家人',
      Simplified: '家人',
    },
    English: {
      WilhelmBaynes: 'Chia Jên / The Family [The Clan]',
      Legge: 'XXXVII. The Kiâ Zăn Hexagram',
    },
  },
  38: {
    Chinese: {
      Traditional: '睽',
      Simplified: '睽',
    },
    English: {
      WilhelmBaynes: 'K’uei / Opposition',
      Legge: 'XXXVIII. The Khwei Hexagram',
    },
  },
  39: {
    Chinese: {
      Traditional: '蹇',
      Simplified: '蹇',
    },
    English: {
      WilhelmBaynes: 'Chien / Obstruction',
      Legge: 'XXXIX. The Kien Hexagram',
    },
  },
  40: {
    Chinese: {
      Traditional: '解',
      Simplified: '解',
    },
    English: {
      WilhelmBaynes: 'Hsieh / Deliverance',
      Legge: 'XL. The Kieh Hexagram',
    },
  },
  41: {
    Chinese: {
      Traditional: '損',
      Simplified: '损',
    },
    English: {
      WilhelmBaynes: 'Sun / Decrease',
      Legge: 'XLI. The Sun Hexagram',
    },
  },
  42: {
    Chinese: {
      Traditional: '益',
      Simplified: '益',
    },
    English: {
      WilhelmBaynes: 'I / Increase',
      Legge: 'XLII. The Yî Hexagram',
    },
  },
  43: {
    Chinese: {
      Traditional: '夬',
      Simplified: '夬',
    },
    English: {
      WilhelmBaynes: 'Kuai / Break-through (Resoluteness)',
      Legge: 'XLIII. The Kwâi Hexagram',
    },
  },
  44: {
    Chinese: {
      Traditional: '姤',
      Simplified: '姤',
    },
    English: {
      WilhelmBaynes: 'Kou / Coming to Meet',
      Legge: 'XLIV. The Kâu Hexagram',
    },
  },
  45: {
    Chinese: {
      Traditional: '萃',
      Simplified: '萃',
    },
    English: {
      WilhelmBaynes: 'Ts’ui / Gathering Together [Massing]',
      Legge: 'XLV. The Žhui Hexagram',
    },
  },
  46: {
    Chinese: {
      Traditional: '升',
      Simplified: '升',
    },
    English: {
      WilhelmBaynes: 'Shêng / Pushing Upward',
      Legge: 'XLVI. The Shăng Hexagram',
    },
  },
  47: {
    Chinese: {
      Traditional: '困',
      Simplified: '困',
    },
    English: {
      WilhelmBaynes: 'K’un / Oppression (Exhaustion)',
      Legge: 'XLVII. The Khwăn Hexagram',
    },
  },
  48: {
    Chinese: {
      Traditional: '井',
      Simplified: '井',
    },
    English: {
      WilhelmBaynes: 'Ching / The Well',
      Legge: 'XLVIII. The Žing Hexagram',
    },
  },
  49: {
    Chinese: {
      Traditional: '革',
      Simplified: '革',
    },
    English: {
      WilhelmBaynes: 'Ko / Revolution (Molting)',
      Legge: 'XLIX. The Ko Hexagram',
    },
  },
  50: {
    Chinese: {
      Traditional: '鼎',
      Simplified: '鼎',
    },
    English: {
      WilhelmBaynes: 'Ting / The Caldron',
      Legge: 'L. The Ting Hexagram',
    },
  },
  51: {
    Chinese: {
      Traditional: '震',
      Simplified: '震',
    },
    English: {
      WilhelmBaynes: 'Chên / The Arousing (Shock, Thunder)',
      Legge: 'LI. The Kăn Hexagram',
    },
  },
  52: {
    Chinese: {
      Traditional: '艮',
      Simplified: '艮',
    },
    English: {
      WilhelmBaynes: 'Kên / Keeping Still, Mountain',
      Legge: 'LII. The Kăn Hexagram',
    },
  },
  53: {
    Chinese: {
      Traditional: '漸',
      Simplified: '渐',
    },
    English: {
      WilhelmBaynes: 'Chien / Development (Gradual Progress)',
      Legge: 'LIII. The Kien Hexagram',
    },
  },
  54: {
    Chinese: {
      Traditional: '歸妹',
      Simplified: '归妹',
    },
    English: {
      WilhelmBaynes: 'Kuei Mei / The Marrying Maiden',
      Legge: 'LIV. The Kwei Mei Hexagram',
    },
  },
  55: {
    Chinese: {
      Traditional: '豐',
      Simplified: '丰',
    },
    English: {
      WilhelmBaynes: 'Fêng / Abundance [Fullness]',
      Legge: 'LV. The Făng Hexagram',
    },
  },
  56: {
    Chinese: {
      Traditional: '旅',
      Simplified: '旅',
    },
    English: {
      WilhelmBaynes: 'Lü / The Wanderer',
      Legge: 'LVI. The Lü Hexagram',
    },
  },
  57: {
    Chinese: {
      Traditional: '巽',
      Simplified: '巽',
    },
    English: {
      WilhelmBaynes: 'Sun / The Gentle (Penetrating, Wind)',
      Legge: 'LVII. The Sun Hexagram',
    },
  },
  58: {
    Chinese: {
      Traditional: '兌',
      Simplified: '兑',
    },
    English: {
      WilhelmBaynes: 'Tui / The Joyous, Lake',
      Legge: 'LVIII. The Tui Hexagram',
    },
  },
  59: {
    Chinese: {
      Traditional: '渙',
      Simplified: '涣',
    },
    English: {
      WilhelmBaynes: 'Huan / Dispersion [Dissolution]',
      Legge: 'LIX. The Hwân Hexagram',
    },
  },
  60: {
    Chinese: {
      Traditional: '節',
      Simplified: '节',
    },
    English: {
      WilhelmBaynes: 'Chieh / Limitation',
      Legge: 'LX. The Kieh Hexagram',
    },
  },
  61: {
    Chinese: {
      Traditional: '中孚',
      Simplified: '中孚',
    },
    English: {
      WilhelmBaynes: 'Chung Fu / Inner Truth',
      Legge: 'LXI. The Kung Fû Hexagram',
    },
  },
  62: {
    Chinese: {
      Traditional: '小過',
      Simplified: '小过',
    },
    English: {
      WilhelmBaynes: 'Hsiao Kuo / Preponderance of the Small',
      Legge: 'LXII. The Hsiâo Kwo Hexagram',
    },
  },
  63: {
    Chinese: {
      Traditional: '既濟',
      Simplified: '既济',
    },
    English: {
      WilhelmBaynes: 'Chi Chi / After Completion',
      Legge: 'LXIII. The Kî Žî Hexagram',
    },
  },
  64: {
    Chinese: {
      Traditional: '未濟',
      Simplified: '未济',
    },
    English: {
      WilhelmBaynes: 'Wei Chi / Before Completion',
      Legge: 'LXIV. The Wei Žî Hexagram',
    },
  },
} as const

export type HexagramName<Order extends WenWangOrder = WenWangOrder> =
  (typeof HEXAGRAM_NAME)[Order]
