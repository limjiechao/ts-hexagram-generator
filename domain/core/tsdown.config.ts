import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/casting-derivation.ts',
    './src/crypto-random.ts',
    './src/getters.ts',
    './src/models/hexagrams.ts',
    './src/random-casting.ts',
    './src/models/trigrams.ts',
    './src/types.ts',
  ],
  platform: 'node',
})
