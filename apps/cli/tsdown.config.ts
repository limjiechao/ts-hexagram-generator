import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/history.ts', './src/interactive.ts', './src/random.ts'],
  platform: 'node',
})
