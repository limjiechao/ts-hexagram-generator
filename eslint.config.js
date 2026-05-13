import { sxzz } from '@sxzz/eslint-config'
import oxlint from 'eslint-plugin-oxlint'

export default sxzz().append(
  {
    rules: { 'prettier/prettier': 'off', 'perfectionist/sort-imports': 'off' },
  },
  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
)
