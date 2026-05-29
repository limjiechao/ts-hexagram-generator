import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/types.ts',
    './src/random-casting.ts',
    './src/crypto-random.ts',
    './src/getters.ts',
    './src/models/hexagrams.ts',
    './src/models/trigrams.ts',
  ],
  platform: 'node',
})
