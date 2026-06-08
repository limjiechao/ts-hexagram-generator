import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/consultation-readout.tsx',
    './src/output-composers.ts',
    './src/serialize-ansi.ts',
    './src/standing-line-color.ts',
  ],
  platform: 'node',
})
