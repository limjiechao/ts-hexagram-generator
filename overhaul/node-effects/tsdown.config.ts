import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/crypto-random-source.ts', './src/system-clock.ts'],
  platform: 'node',
})
