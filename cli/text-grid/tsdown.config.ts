import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/diagram-template.ts',
    './src/geometry.ts',
    './src/ledger-template.ts',
    './src/markdown.ts',
    './src/scroll-geometry.ts',
  ],
  platform: 'node',
})
