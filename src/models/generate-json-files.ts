import fs from 'node:fs/promises'

import { HEXAGRAM_RECORDS } from './hexagrams'
import { TRIGRAM_RECORDS } from './trigrams.js'

// eslint-disable-next-line baseline-js/use-baseline
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
