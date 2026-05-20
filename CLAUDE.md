@AGENTS.md

## Task execution

- Use the TodoWrite tool at the start of any multi-step task
- Update todo status as you progress (in_progress → completed)
- Never batch completions — mark items done as you finish them
- For single trivial edits, skip the todo list

## Agent skills

### Issue tracker

Issues and PRDs are tracked as GitHub issues in `limjiechao/ts-hexagram-generator`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical triage vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
