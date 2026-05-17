import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/interactive.ts', './src/random.ts'],
  platform: 'node',
})
