import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/build-view.ts', './src/ir.ts', './src/vocabulary.ts'],
  platform: 'node',
})
