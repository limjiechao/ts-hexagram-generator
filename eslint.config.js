import { sxzz } from '@sxzz/eslint-config'
import oxlint from 'eslint-plugin-oxlint'

export default sxzz().append(
  {
    // Planning docs under docs/ contain illustrative TypeScript snippets
    // (often partial/incomplete) that should not be held to source-grade
    // lint rules.
    ignores: ['docs/**/*.md'],
  },
  {
    rules: {
      'prettier/prettier': 'off',
      'perfectionist/sort-imports': 'off',
      // baseline-js targets cross-browser Baseline features; irrelevant in
      // this Node 24+ CLI project (top-level await is supported natively).
      'baseline-js/use-baseline': 'off',
    },
  },
  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
)
