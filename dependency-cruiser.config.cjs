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
// Today there are ZERO domain -> cli edges: every domain package depends only
// on other domain packages (core/text-layout are leaves; consultation-view ->
// {core, text-layout}; consultation-file -> {core, consultation-view,
// text-layout}). So this rule passes green on introduction. It is a DRIFT
// GUARD that fails the build the moment a future change inverts the arrow —
// not a detector of a current leak.
//
// A SECOND forbidden rule, `no-raw-string-width`, gives rendered-width
// measurement one home: every cli/* package must import width through
// @hexagram/viewer-core's ANSI-aware `terminalWidth` (and the truncate/pad
// chrome helpers), never the `string-width` package directly. cli/viewer-core
// itself IS that wrapper, so it is the sole exemption. This is distinct BY
// DESIGN from domain/text-layout's `visualWidth`, which measures raw
// (un-ANSI'd) diagram text: the two width homes serve different layers —
// ANSI-aware chrome width vs. medium-neutral diagram geometry — and must not
// be conflated.
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
    {
      name: 'no-raw-string-width',
      comment:
        'Import rendered-string width via @hexagram/viewer-core (terminalWidth ' +
        'and the truncate/pad helpers), not the string-width package directly, ' +
        'so the CLI layer has one ANSI-aware width home. viewer-core itself is ' +
        'the wrapper and is exempt.',
      severity: 'error',
      from: { pathNot: '^cli/viewer-core/' },
      to: { path: 'node_modules/string-width' },
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
