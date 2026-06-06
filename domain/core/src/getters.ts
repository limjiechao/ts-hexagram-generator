import type { HexagramKey } from './models/foundation.js'
import type { GenericHexagramRecord } from './models/hexagram.js'
import { HEXAGRAM_RECORDS } from './models/hexagrams.js'
import type { GenericTrigramRecord, TrigramKey } from './models/trigram.js'
import { TRIGRAM_RECORDS } from './models/trigrams.js'
import type { Hexagram } from './types.js'

// Line vocabulary lives in line-semantics.ts.
const HexagramLineToKey = {
  6: 2,
  7: 1,
  8: 2,
  9: 1,
} as const

function getHexagramKey([
  line1,
  line2,
  line3,
  line4,
  line5,
  line6,
]: Hexagram): HexagramKey {
  return `H${HexagramLineToKey[line1]}${HexagramLineToKey[line2]}${HexagramLineToKey[line3]}${HexagramLineToKey[line4]}${HexagramLineToKey[line5]}${HexagramLineToKey[line6]}` as const
}

export function getTrigramRecord(trigram: TrigramKey): GenericTrigramRecord {
  return TRIGRAM_RECORDS[trigram]
}

export function getHexagramRecord(hexagram: Hexagram): GenericHexagramRecord {
  const hexagramKey = getHexagramKey(hexagram)

  return HEXAGRAM_RECORDS[hexagramKey]
}
