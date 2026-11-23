# AGENTS.md

A stand-in repo for signal 1's proof. Every path below is invented.

## Misses

The guide is `docs/missing.md`.
Run `pnpm tool --config docs/absent.md --quiet` first.
Both `docs/one.md` and `docs/two.md` are gone.
The command `pnpm drift
docs/wrapped.md` wraps onto the next line.
Double backticks: `` docs/double.md ``.
Wrong case: `docs/Notes/kept.md`.
Wrong-case root: `Docs/notes/kept.md`.
No glob match: `docs/**/*.yaml`.

## Twins

The kept note is `docs/notes/kept.md`.
Globs: `docs/notes/*.md`, `docs/n*` and `docs/{other,absent}.md`.
A template: `docs/<topic>.md`.
A link [to a note](docs/link-missing.md) and a bare docs/bare-missing.md.
Relative and absolute: `./docs/dot-missing.md`, `../docs/up-missing.md` and `/docs/slash-missing.md`.
No root: `nowhere/missing.md`.
Suffixes: `docs/other.md:12`, `docs/other.md:3-9`, `docs/other.md#a-heading` and `docs/notes/`.

```sh
cat `docs/fenced-missing.md`
```

Former root: `legacy/old/tool.ts` and `legacy/old/shim.ts`.
Planned: `docs/planned/guide.md`.
