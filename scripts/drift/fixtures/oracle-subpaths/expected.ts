// Oracle-subpath analysis (R-151): the fixed expected list for its proof
// (R-184, R-189). It is not a B13 key. Each folder beside this file is one
// fixture tree, a stand-in for `overhaul/`; `main` holds the plants and twins,
// and each `error-*` tree holds one error case (R-183).
//
// Keys are `<tree>:<subpath>`, the subpath being the fake `application`
// package's export key. A plant maps to 'loads', a twin to 'free'. An error
// maps to the file and specifier the analysis must name (R-180), the file
// relative to the tree, with `/` separators.
//
// Twin T11 has no key: `main`'s `./package.json` export must be neither
// listed nor an error (R-182), so the two-way check fails if it appears.

export interface ExpectedError {
  readonly verdict: 'error'
  readonly file: string
  readonly specifier: string
}

export type ExpectedVerdict = 'loads' | 'free' | ExpectedError

export const expected: Readonly<Record<string, ExpectedVerdict>> = {
  'main:./p01-value-import': 'loads',
  'main:./p02-inline-type-specifier': 'loads',
  'main:./p03-default-with-inline-type': 'loads',
  'main:./p04-side-effect': 'loads',
  'main:./p05-named-reexport': 'loads',
  'main:./p06-export-star': 'loads',
  'main:./p07-export-inline-type': 'loads',
  'main:./p08-literal-dynamic-import': 'loads',
  'main:./p09-through-alias': 'loads',
  'main:./p10-through-two-aliases': 'loads',
  'main:./p11-through-journal': 'loads',
  'main:./p12-through-journal-alias': 'loads',
  'main:./p13-relative-into-oracle': 'loads',
  'main:./p14-cycle-reaches-oracle': 'loads',
  'main:./p15-value-import-of-types-only-file': 'loads',
  'main:./t01-import-type': 'free',
  'main:./t02-export-type': 'free',
  'main:./t03-export-type-star': 'free',
  'main:./t04-type-position-import': 'free',
  'main:./t05-through-types-only-policy': 'free',
  'main:./t06-alias-helper-type-only': 'free',
  'main:./t07-cycle-without-oracle': 'free',
  'main:./t08-unexported-sibling-loads': 'free',
  'main:./t09-oracle-text-in-comment-and-string': 'free',
  'main:./t10-missing-dist-target': 'free',
  'error-unresolvable:./e1-unresolvable': {
    verdict: 'error',
    file: 'application/src/e1-unresolvable.ts',
    specifier: '#src/missing.js',
  },
  'error-dynamic-name:./e2-dynamic-name': {
    verdict: 'error',
    file: 'application/src/e2-dynamic-name.ts',
    specifier: 'name',
  },
  'error-wildcard:./*': {
    verdict: 'error',
    file: 'application/package.json',
    specifier: './*',
  },
}
