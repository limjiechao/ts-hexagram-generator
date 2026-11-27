import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/bundled-scripture-catalogue.ts'],
  platform: 'node',
})
