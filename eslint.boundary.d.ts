// Hand-authored types for eslint.boundary.js (a plain ESM module consumed both
// by the flat config and by domain/core/tests/eslint-domain-boundary.test.ts).
export declare const cliPackageNames: string[]
export declare const cliBoundaryBans: {
  paths: Array<{ name: string; message: string }>
  patterns: Array<{ group: string[]; message: string }>
}
