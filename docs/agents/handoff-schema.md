# Handoff schema v1

The machine-readable execution record uses JSON so both GitHub Actions and OpenCode can validate the same fields without parsing free-form prose.

Required fields:

- `schema_version`: integer, currently `1`
- `issue_url`: GitHub issue URL
- `stage`: `A` or `B` for the deterministic vertical-slice test
- `runner`: `actions` or `opencode`
- `run_id`: unique identifier for this execution
- `started_at`: UTC ISO 8601 timestamp
- `outcome`: `progress`, `blocked`, or `complete`
- `start_commit` and `end_commit`: commit SHAs
- `changed_files`: list of changed paths
- `validation.command`: exact command attempted
- `validation.result`: `passed`, `failed`, or `not_run`
- `checkpoint_observed`: `none`, `stage-a-complete`, or `stage-b-complete`
- `next_action`: explicit next action, including a terminal statement when complete

Optional field: `pull_request_url`.

Each execution writes a new record; never overwrite an earlier handoff. Handoffs report execution evidence but do not replace current GitHub issue, PR, commit, or check state.

The JSON Schema lives at `schemas/agent-handoff.schema.json`. The deterministic validator should enforce these requirements even when no JSON Schema validation library is installed.
