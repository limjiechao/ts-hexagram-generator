import fs from 'node:fs/promises'
import { HEXAGRAM_RECORDS } from './hexagrams'

await fs.writeFile(
  './src/models/hexagrams.json',
  JSON.stringify(HEXAGRAM_RECORDS, null, 2),
)
