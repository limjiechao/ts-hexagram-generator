// Architectural boundary guard: no domain/* package may import a cli/*
// package. domain/* is reusable, UI-free knowledge (consumable by a
// hypothetical Next.js app); cli/* is terminal-specific. The dependency
// arrow must always point cli -> domain, never the reverse.
//
// apps/* sits at the TOP of the DAG (the runnable bins) and may freely
// depend on both cli/* and domain/*; no rule forbids that. The cruised dirs
// (`domain cli apps` in the boundaries:check script) include apps only so the
// guard has coverage over the whole tree — the single forbidden edge below is
// still just domain -> cli.
//
// Today there are ZERO domain -> cli edges (core depends on nothing;
// consultation-file depends on core only), so this rule passes green on
// introduction. It is a DRIFT GUARD that fails the build the moment a
// future change inverts the arrow — not a detector of a current leak.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-domain-to-cli',
      comment:
        'A domain/* package imported a cli/* package. domain stays UI-free and ' +
        'reusable; dependencies must point cli -> domain, never domain -> cli.',
      severity: 'error',
      from: { path: '^domain/' },
      to: { path: '^cli/' },
    },
  ],
  options: {
    doNotFollow: { path: '(^|/)node_modules/' },
    exclude: {
      path: '(^|/)(node_modules|dist|tests|scripts)/',
    },
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      // Resolve @hexagram/* workspace imports via the `source` export
      // condition so the cruiser follows ./src/*.ts (no build needed),
      // matching how tsx/vitest resolve the workspace.
      conditionNames: ['source', 'import', 'require', 'node', 'default'],
      exportsFields: ['exports'],
    },
  },
}
