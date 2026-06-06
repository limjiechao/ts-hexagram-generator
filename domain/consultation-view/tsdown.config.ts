import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/build-view.ts',
    './src/diagram-template.ts',
    './src/ir.ts',
    './src/ledger-geometry.ts',
    './src/ledger-template.ts',
    './src/vocabulary.ts',
  ],
  platform: 'node',
})
