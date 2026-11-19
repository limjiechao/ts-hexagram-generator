import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/citation.ts',
    './src/edition-id.ts',
    './src/reading-preference.ts',
    './src/work.ts',
  ],
  platform: 'node',
})
