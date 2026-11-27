import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/parse-legacy.ts'],
  platform: 'node',
})
