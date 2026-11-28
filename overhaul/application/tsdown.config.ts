import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/begin-casting.ts',
    './src/browse-consultations.ts',
    './src/clock.ts',
    './src/consultation-readout.ts',
    './src/consultation-store.ts',
    './src/delete-consultation.ts',
    './src/divide.ts',
    './src/draw-automatic-pick.ts',
    './src/export-consultations.ts',
    './src/import-legacy-files.ts',
    './src/keep-cast-consultation.ts',
    './src/look-up-catalogue.ts',
    './src/merge-journals.ts',
    './src/next-round.ts',
    './src/open-consultation.ts',
    './src/random-source.ts',
    './src/record-consultation.ts',
    './src/resolve-transformation.ts',
    './src/scripture-catalogue.ts',
    './src/transcribe.ts',
  ],
  platform: 'node',
})
