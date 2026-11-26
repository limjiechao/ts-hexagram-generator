import process from 'node:process'

import { run } from '#src/commands/hexagram.js'
import { processIo, processPorts } from '#src/process-adapters.js'

process.exitCode = await run(
  process.argv.slice(2),
  processIo(process),
  processPorts(process),
)
