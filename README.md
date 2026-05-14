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

---

## Install globally from local source

The package exposes two CLI bins via the [`bin` field in `package.json`](./package.json):

- `hexagram-random` — generate a random hexagram
- `hexagram-interactive` — drive the yarrow stalk method by entering each split index

Both CLIs present the reading in a full-screen tabbed viewer by default (Casting / Transformation / Originating / Resultant tabs), opening on the Casting tab — a record of the eighteen stalk divisions that produced the hexagram. Pass `--plain` (or `--no-ui`) for the classic scrolling console output; non-interactive (piped) runs fall back to plain output automatically. Either mode saves the reading as a timestamped `.txt` under `consultations/`.

In the tabbed viewer, content hard-wraps at 120 columns by default; pass `--wrap-width <n>` (e.g. `hexagram-random --wrap-width 100`) to change the cap. It is capped to the terminal width on narrower terminals and floored so the fixed-width hexagram diagrams are never broken; `--wrap-width` has no effect in plain mode.

Until the package is published to npm, you can still install it globally from your local clone. Three options, in order of how closely they mirror a published install.

### Option 1 — `pnpm link --global` (live development)

Creates a symlink from the global pnpm bin directory to your local `dist/`. Edits picked up by `pnpm build` (or `pnpm dev`) appear immediately — no reinstall.

```bash
pnpm install
pnpm build
pnpm link --global

hexagram-random
hexagram-interactive

# When you're done:
pnpm uninstall --global ts-hexagram-generator
```

### Option 2 — `pnpm add -g <path>` (install a copy)

Copies the built package into the global pnpm store. Re-run after every change.

```bash
pnpm install
pnpm build
pnpm add -g "$PWD"

hexagram-random
```

### Option 3 — `pnpm pack` + global install (closest to publishing)

`pnpm pack` honors the `files` field, so the resulting tarball is byte-identical to what an `npm publish` consumer would receive. Best for verifying the published package will actually work.

```bash
pnpm install
pnpm build
pnpm pack                                    # → ts-hexagram-generator-0.0.0.tgz
pnpm add -g "$PWD/ts-hexagram-generator-0.0.0.tgz"

hexagram-random
```

### npm equivalents

If you'd rather use npm:

```bash
npm link                          # in the package directory → global symlink
npm install -g "$PWD"             # install a copy from a path
npm install -g ./ts-hexagram-generator-0.0.0.tgz   # install from a packed tarball
```

### Verify & troubleshoot

- Confirm the bin directory is on your `PATH`: `pnpm bin -g` (or `npm bin -g`).
- Confirm the symlink resolves: `which hexagram-random && ls -l "$(which hexagram-random)"`.
- The CLI files require Node `>=24.6.0` (see `engines` in `package.json`); older Node versions may refuse to install with `--engine-strict`.
- Always `pnpm build` first — the `bin` entries point at `./dist/*.mjs`, which don't exist until the build runs.

---

## Tech Stack

Scaffolded with [sxzz/ts-starter](https://github.com/sxzz/ts-starter)

- Package manager [pnpm](https://pnpm.js.org/), safe and fast
- Bundle with blazing fast [tsdown](https://github.com/sxzz/tsdown)
- Test with [Vitest](https://vitest.dev)
