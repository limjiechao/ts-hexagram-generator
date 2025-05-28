import { main } from './random'

export function isDirectExecution(): boolean {
  return import.meta.url === import.meta.resolve('./cli-random.js')
}

if (isDirectExecution()) {
  main()
}
