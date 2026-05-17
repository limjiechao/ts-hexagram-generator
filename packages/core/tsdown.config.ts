import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/random.ts',
    './src/getters.ts',
    './src/models/hexagrams.ts',
    './src/models/trigrams.ts',
  ],
  platform: 'node',
})
