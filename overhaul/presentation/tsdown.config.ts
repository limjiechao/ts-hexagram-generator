import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/readout.ts', './src/build-readout.ts'],
  platform: 'node',
})
