import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/citation.ts',
    './src/default-reading-preference.ts',
    './src/edition-id.ts',
    './src/edition.ts',
    './src/hexagram-name.ts',
    './src/passage-text.ts',
    './src/reading-preference.ts',
    './src/received-sequence-number.ts',
    './src/trigram-name.ts',
    './src/work.ts',
  ],
  platform: 'node',
})
