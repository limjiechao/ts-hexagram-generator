import { sxzz } from '@sxzz/eslint-config'
import oxlint from 'eslint-plugin-oxlint'

export default sxzz().append(
  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
)
