import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/cli-interactive.ts',
    './src/cli-random.ts',
    './src/models/hexagrams.ts',
    './src/models/trigrams.ts',
  ],
  platform: 'node',
})
