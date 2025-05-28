#!/usr/bin/env node

import { main } from './interactive'

export function isDirectExecution(): boolean {
  return import.meta.url === import.meta.resolve('./cli-interactive.js')
}

if (isDirectExecution()) {
  main()
}
