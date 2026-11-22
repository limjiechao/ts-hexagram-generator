// `pnpm drift:oracle-subpaths` (R-179): lists every `application` subpath of
// the real `overhaul/` as loads or free, with the chain to Oracle code for
// each that loads (R-178). It exits 1 only when the analysis fails (R-180).

import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { analyseOracleSubpaths } from './oracle-subpaths.js'

const result = await analyseOracleSubpaths(
  fileURLToPath(new URL('../../overhaul/', import.meta.url)),
)
if (!result.ok) {
  console.error(
    `drift:oracle-subpaths cannot analyse ${result.file}: ${result.message} (${result.specifier})`,
  )
  process.exit(1)
}
for (const [subpath, verdict] of Object.entries(result.subpaths)) {
  if (verdict.verdict === 'free') console.info(`free   ${subpath}`)
  else console.info(`loads  ${subpath}: ${verdict.chain.join(' -> ')}`)
}
