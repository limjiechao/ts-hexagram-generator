# Doc-truth exceptions

Signal 1 of `drift:check` reports a path that a source document names but
that does not exist (ADR-0042, R-195). Each row excepts every miss of one
exact name in one file, for the reason given; a row that excepts no miss is
reported as D4 (R-254). The owner ratifies every row.

| File                                         | Name                  | Reason                                                      |
| -------------------------------------------- | --------------------- | ----------------------------------------------------------- |
| `docs/adr/0042-how-the-overhaul-is-built.md` | `docs/manual/cli.md`  | planned, written and ratified before the CLI phase          |
| `docs/adr/0042-how-the-overhaul-is-built.md` | `docs/manual/rest.md` | planned, written and ratified before the REST phase (R-008) |
| `docs/adr/0019-domain-cli-boundary.md`       | `cli/cli`             | a former location the ADR names as history                  |

## Former roots

Paths under these former top-level folders are not checked, but are counted
in the summary (R-201).

- `packages/`
