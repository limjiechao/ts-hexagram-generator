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

## Symbols

Missing camelCase: `castWithoutCode`.
Missing PascalCase: `ReadingWithoutCode`.
Two on one line: `lostHelper` and `LostRecord`.
Forms: `missingCall()` and `PresentRecord.missingField`.
Wrong case: `PresentHelper`.
Whole word only: `presentHelp`.
Named only in docs: `docOnlyName`.
The call `run
lostAcrossLines()` wraps.
A camelCase path: `docs/missingCamelFile.md`.

Present: `presentHelper`, `PresentRecord`, `presentHelper()` and `PresentRecord.presentField`.
Only in JSON: `jsonOnlyKey`.
Only in legacy-style code: `legacyOnlyName`.
Only in a comment: `commentedName`.
Not symbols: `keep`, `Casting`, `ID`, `URL`, `ETag`, `snake_case_name` and `SCREAMING_NAME`.
A former root in the wrong case: `Legacy/old/caseTool.ts`.
Planned: `plannedName`.
A template: `use<Name>`.

```sh
echo `fencedMissing`
```
A link [to the helper](linkedMissing) and a bare bareMissing.

Only under skipped folders: `nodeModulesName`, `distName`, `dotFolderName` and `consultationsName`.

Hump at the start: `xLost` and `iMissing`.
