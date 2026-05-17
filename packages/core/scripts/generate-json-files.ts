import fs from 'node:fs/promises'

import { HEXAGRAM_RECORDS } from '../src/models/hexagrams'
import { TRIGRAM_RECORDS } from '../src/models/trigrams.js'

 
await Promise.all([
  fs.writeFile(
    './src/models/hexagrams.json',
    JSON.stringify(HEXAGRAM_RECORDS, null, 2),
  ),
  fs.writeFile(
    './src/models/trigrams.json',
    JSON.stringify(TRIGRAM_RECORDS, null, 2),
  ),
])
