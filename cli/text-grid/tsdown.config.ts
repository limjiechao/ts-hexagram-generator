import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/markdown.ts'],
  platform: 'node',
})
