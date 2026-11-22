// The fixed expected list for drift signal 3's prover: each fixture under
// `plants/` maps to the one boundary rule (B1 to B12) that must report it,
// and each under `twins/` to null, meaning no B1 to B12 report at all.
// Reports from rules outside B1 to B12 are ignored on both. Each fixture
// names, on its first line (a `"//"` key in a manifest), the `overhaul/` path
// it is linted as.
//
// Every B1 to B12 appears below, so a deleted plant fails the prover.
//
// Stated limit, with no plant: B2 does not follow aliases of `Math` or
// `Date`, so `const m = Math; m.random()` passes lint and is left to review.

export type BoundaryRule =
  | 'B1'
  | 'B2'
  | 'B3'
  | 'B4'
  | 'B5'
  | 'B6'
  | 'B7'
  | 'B8'
  | 'B9'
  | 'B10'
  | 'B11'
  | 'B12'

export const expected: Readonly<Record<string, BoundaryRule | null>> = {
  'plants/b1-dynamic-node-fs.ts': 'B1',
  'plants/b1-static-node-fs.ts': 'B1',
  'plants/b1-type-only-node-fs.ts': 'B1',
  'plants/b1-unprefixed-fs.ts': 'B1',
  'plants/b2-clear-immediate.ts': 'B2',
  'plants/b2-clear-interval.ts': 'B2',
  'plants/b2-clear-timeout.ts': 'B2',
  'plants/b2-crypto.ts': 'B2',
  'plants/b2-date-call.ts': 'B2',
  'plants/b2-date-now.ts': 'B2',
  'plants/b2-fetch.ts': 'B2',
  'plants/b2-globalthis-math-random.ts': 'B2',
  'plants/b2-math-random.ts': 'B2',
  'plants/b2-new-date.ts': 'B2',
  'plants/b2-performance.ts': 'B2',
  'plants/b2-process.ts': 'B2',
  'plants/b2-queue-microtask.ts': 'B2',
  'plants/b2-set-immediate.ts': 'B2',
  'plants/b2-set-interval.ts': 'B2',
  'plants/b2-set-timeout.ts': 'B2',
  'plants/b3-imports-application.ts': 'B3',
  'plants/b3-legacy-package.ts': 'B3',
  'plants/b3-test-imports-journal.test.ts': 'B3',
  'plants/b4-inline-type-specifier.ts': 'B4',
  'plants/b4-policy-imports-journal.ts': 'B4',
  'plants/b4-relative-leaves-package.ts': 'B4',
  'plants/b4-test-imports-catalogue.test.ts': 'B4',
  'plants/b4-type-position-import.ts': 'B4',
  'plants/b4-value-import-oracle.ts': 'B4',
  'plants/b5-imports-application.ts': 'B5',
  'plants/b5-journal-beyond-divined-at.ts': 'B5',
  'plants/b6-imports-adapter.ts': 'B6',
  'plants/b6-legacy-package.ts': 'B6',
  'plants/b7-dynamic-import-oracle.ts': 'B7',
  'plants/b7-imports-catalogue.ts': 'B7',
  'plants/b8-test-imports-oracle.test.ts': 'B8',
  'plants/b9-dev-arrow-in-dependencies.package.json': 'B9',
  'plants/b9-extra-dependency.package.json': 'B9',
  'plants/b9-missing-dependency.package.json': 'B9',
  'plants/b10-dynamic-import.ts': 'B10',
  'plants/b10-static-import.ts': 'B10',
  'plants/b11-angle-bracket.ts': 'B11',
  'plants/b11-as-in-tests.test.ts': 'B11',
  'plants/b11-as.ts': 'B11',
  'plants/b11-definite-field.ts': 'B11',
  'plants/b11-definite-let.ts': 'B11',
  'plants/b11-non-null.ts': 'B11',
  'plants/b12-argument.ts': 'B12',
  'plants/b12-assignment-in-tests.test.ts': 'B12',
  'plants/b12-assignment.ts': 'B12',
  'plants/b12-return.ts': 'B12',
  'twins/adapter-node-and-clock.ts': null,
  'twins/adapter-tests-import-catalogue.test.ts': null,
  'twins/application-imports-domain.ts': null,
  'twins/as-const-satisfies-expect-error.ts': null,
  'twins/catalogue-imports-divined-at.ts': null,
  'twins/cli-adapter.package.json': null,
  'twins/journal-value-imports-oracle.ts': null,
  'twins/oracle-imports-own-guard.test.ts': null,
  'twins/policy-type-imports-oracle.ts': null,
  'twins/pure-date-console-math.ts': null,
  'twins/pure-tests-node-and-random.test.ts': null,
  'twins/scripture-catalogue.package.json': null,
  'twins/unknown-json-parse.ts': null,
}
