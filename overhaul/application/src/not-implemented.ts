/** Carries the inputs as the cause, so each signature keeps its names. */
export function notImplemented(...inputs: readonly unknown[]): never {
  throw new Error('Not implemented', { cause: inputs })
}
