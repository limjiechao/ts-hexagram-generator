import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/casting.ts',
    './src/complete-casting.ts',
    './src/division.ts',
    './src/figure.ts',
    './src/hexagram.ts',
    './src/line-position.ts',
    './src/line-value.ts',
    './src/passage-reference.ts',
    './src/pick.ts',
    './src/remainder.ts',
    './src/resolution.ts',
    './src/round.ts',
    './src/set-aside.ts',
    './src/transformation.ts',
    './src/trigram.ts',
  ],
  platform: 'node',
})
