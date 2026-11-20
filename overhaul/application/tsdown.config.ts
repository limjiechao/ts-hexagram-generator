import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/begin-casting.ts',
    './src/browse-consultations.ts',
    './src/clock.ts',
    './src/consultation-store.ts',
    './src/delete-consultation.ts',
    './src/divide.ts',
    './src/keep-cast-consultation.ts',
    './src/look-up-catalogue.ts',
    './src/next-round.ts',
    './src/random-source.ts',
    './src/record-consultation.ts',
    './src/scripture-catalogue.ts',
    './src/transcribe.ts',
  ],
  platform: 'node',
})
