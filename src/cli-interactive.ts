import { main } from './interactive'

export function isDirectExecution(): boolean {
  return import.meta.url === import.meta.resolve('./cli-interactive.ts')
}

if (isDirectExecution()) {
  main()
}
