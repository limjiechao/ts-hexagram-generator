import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/clock.ts',
    './src/consultation-store.ts',
    './src/random-source.ts',
  ],
  platform: 'node',
})
