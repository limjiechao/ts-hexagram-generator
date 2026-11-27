import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/markdown-consultation-store.ts'],
  platform: 'node',
})
