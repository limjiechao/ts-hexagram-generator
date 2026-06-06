# Consultations directory anchoring

Status: Accepted
Date: 2026-06-06

Saved consultations must land in `<repo-root>/consultations` regardless of the
directory a bin is invoked from. The app computes that path once at the shell
edge (`workspaceConsultationsDir()`, derived from `pnpm-workspace.yaml`) and
threads it as an explicit `consultationsDir`/`dir` to the save and history APIs.
No bin mutates `process.cwd()`.

## Considered options

- **Global `process.chdir(workspaceRoot())` at bin entry.** Rejected: a
  process-wide mutation to avoid threading one value; it changes resolution of
  every relative path for the process lifetime and hid the save dir from the
  call signature.
- **Thread an explicit dir (chosen).** The side effect (path resolution) stays
  at the shell edge; the save path is a pure function of its argument.

## Consequences

- `defaultConsultationsDir()` (cwd-based) stays the domain default; the app's
  answer is always the threaded `workspaceConsultationsDir()`.
- A new save-producing bin must compute and pass the dir.

## Where it's enforced

- `apps/cli/src/workspace-root.ts` — `workspaceConsultationsDir` (pure).
- `apps/cli/src/{random,manual,interactive,hexagram}.ts` — compute + thread.
- `cli/casting-ui/src/{viewer.tsx,log-and-save.ts}` — accept `dir`, pass to save.
- `domain/consultation-file/src/file.ts` — `saveConsultationFile({ dir })`.
