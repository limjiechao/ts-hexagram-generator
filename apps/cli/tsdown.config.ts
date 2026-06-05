import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/hexagram.ts',
    './src/history.ts',
    './src/interactive.ts',
    './src/manual.ts',
    './src/playground.ts',
    './src/random.ts',
  ],
  platform: 'node',
})
