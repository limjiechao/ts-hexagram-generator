import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/cast-consultation.ts',
    './src/consultation.ts',
    './src/consultation-id.ts',
    './src/divined-at.ts',
    './src/division-method.ts',
    './src/query.ts',
    './src/recorded-consultation.ts',
  ],
  platform: 'node',
})
