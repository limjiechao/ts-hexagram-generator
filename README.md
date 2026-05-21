# ts-hexagram-generator

[![Unit Test](https://github.com/limjiechao/ts-hexagram-generator/actions/workflows/unit-test.yml/badge.svg)](https://github.com/limjiechao/ts-hexagram-generator/actions/workflows/unit-test.yml)

A TypeScript library that implements the Yarrow Stalk Method for generating I Ching (Yijing) hexagrams. It provides a pipeline-style implementation that models the traditional Chinese divination method using 49 yarrow stalks.

## Features

- Accurate simulation of the yarrow stalk method
- A random hexagram generation in CLI
- An interactive hexagram generation in CLI
- A full-screen tabbed terminal UI for reading the consultation (with a `--plain` fallback)
- A casting record of all eighteen stalk divisions, shown in the UI and the saved reading
- Unit test to validate the statistical analysis of line distributions
- Type-safe implementation in TypeScript

## Monorepo layout

The repo is a **Turborepo + pnpm-workspaces** monorepo. The root is private; published packages live under `packages/*` and CLI bins under `apps/*`.

| Package                     | Description                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@hexagram/types`           | Public type definitions for the hexagram + casting domain (`Line`, `Hexagram`, `CastingRecord`, `LineGeneratorResult`, plus runtime assertions). |
| `@hexagram/core`            | Yarrow-stalk algorithm, RNG-driven generators, hexagram/trigram lookups, and the canonical 64-hexagram + 8-trigram records.                      |
| `@hexagram/viewer-ui`       | Terminal UI: Ink-based tabbed viewer, Inquirer fallback flow, formatted output sections.                                                         |
| `@hexagram/bin` _(private)_ | The CLI bins (`hexagram`, `hexagram-random`, `hexagram-interactive`, `hexagram-history`) — dogfoods every published package.                     |

Every library package publishes via `package.json#exports` only — no `main` / `module` / `types`. Each subpath exposes `source` (for `tsx`/`vitest`), `types` (`.d.mts`), and `import` (`.mjs`) conditions.

---

## Library usage

Once published, consumers can reach into the library at these subpaths:

```ts
// Algorithm + types in one import (core re-exports types).
import {
  makeLineGenerator,
  stalksBeforeParting,
  type Hexagram,
  type Line,
} from '@hexagram/core'

// RNG-driven generators.
import {
  generateRandomConsultation,
  generateRandomHexagram,
  generateRandomHexagrams,
} from '@hexagram/core/random'

// Hexagram / trigram record lookup.
import {
  getEmergingHexagram,
  getHexagramRecord,
  getTrigramRecord,
} from '@hexagram/core/getters'

// Direct access to the data tables (typed).
import { HEXAGRAM_RECORDS } from '@hexagram/core/hexagrams'
import { TRIGRAM_RECORDS } from '@hexagram/core/trigrams'

// Type-only re-exports also live at the foundation package.
import type {
  CastingRecord,
  LineGeneratorResult,
  SplitRecord,
} from '@hexagram/types'

// Terminal UI (viewer + Inquirer flow + formatters), if you want to embed
// the CLI experience in your own host.
import {
  getHexagramViaInteraction,
  logAndSaveConsultationOutput,
  runConsultationViewer,
} from '@hexagram/viewer-ui'
```

## Install globally from local source

The CLI bins are exposed by the `@hexagram/bin` workspace package. Until publishing lands you can install them globally from your local clone.

Both CLIs present the reading in a full-screen tabbed viewer by default (Casting / Transformation / Standing Hexagram / Emerging Hexagram tabs), opening on the Casting tab — a record of the eighteen stalk divisions that produced the hexagram. Pass `--plain` (or `--no-ui`) for the classic scrolling console output; non-interactive (piped) runs fall back to plain output automatically. Either mode saves the reading as a timestamped `.txt` under `consultations/`.

In the tabbed viewer, content hard-wraps at 120 columns by default; pass `--wrap-width <n>` (e.g. `hexagram-random --wrap-width 100`) to change the cap. It is capped to the terminal width on narrower terminals and floored so the fixed-width hexagram diagrams are never broken; `--wrap-width` has no effect in plain mode.

Pass `--slider-sweep-ms <n>` (default 1800) to set the end-to-end sweep duration of the interactive bouncing slider; the per-cast tick is derived so each sweep takes the same time regardless of stalk count.

### Option 1 — `pnpm link --global` from `apps/cli` (live development)

Creates a symlink from the global pnpm bin directory to `apps/cli/dist/`. Edits in any workspace package are picked up by the next `pnpm build` — no reinstall.

```bash
pnpm install
pnpm build                            # turbo builds all packages in topological order
pnpm --filter @hexagram/bin link --global

hexagram-random
hexagram-interactive

# When you're done:
pnpm --filter @hexagram/bin uninstall --global
```

### Option 2 — `pnpm add -g` against the workspace path

Copies the built `@hexagram/bin` package (plus its workspace dependencies) into the global pnpm store. Re-run after every change.

```bash
pnpm install
pnpm build
pnpm add -g "$PWD/apps/cli"

hexagram-random
```

### Option 3 — `pnpm pack` per package + global install (closest to publishing)

`pnpm pack` honors each package's `files` field, so the resulting tarballs are byte-identical to what an `npm publish` consumer would receive. Best for verifying the published package will actually work.

```bash
pnpm install
pnpm build

# Pack the three library packages (workspace deps) and the CLI.
pnpm --filter @hexagram/types     pack
pnpm --filter @hexagram/core      pack
pnpm --filter @hexagram/viewer-ui pack
pnpm --filter @hexagram/bin       pack

# Install the CLI tarball globally; pnpm resolves the workspace deps from
# the same store (or use --offline against the just-packed tarballs).
pnpm add -g ./apps/cli/hexagram-cli-0.0.0.tgz

hexagram-random
```

### npm equivalents

If you'd rather use npm:

```bash
npm link                                 # in any workspace package → global symlink
npm install -g ./apps/cli                # install a copy from the workspace path
npm install -g ./apps/cli/hexagram-cli-0.0.0.tgz   # install from a packed tarball
```

### Verify & troubleshoot

- Confirm the bin directory is on your `PATH`: `pnpm bin -g` (or `npm bin -g`).
- Confirm the symlink resolves: `which hexagram-random && ls -l "$(which hexagram-random)"`.
- The CLI files require Node `>=24.6.0` (see `engines` in the root `package.json`); older Node versions may refuse to install with `--engine-strict`.
- Always `pnpm build` first — the `bin` entries point at `./dist/*.mjs`, which don't exist until the build runs.

---

## Tech Stack

Scaffolded from [sxzz/ts-starter](https://github.com/sxzz/ts-starter); migrated to a Turborepo + pnpm-workspaces monorepo.

- Package manager [pnpm](https://pnpm.js.org/), safe and fast
- Monorepo orchestration with [Turborepo](https://turbo.build/repo)
- Bundle each package with blazing fast [tsdown](https://github.com/sxzz/tsdown)
- Test with [Vitest](https://vitest.dev)
