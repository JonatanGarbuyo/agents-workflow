# Minimal portable workflow vertical slice

Status: proposed design with deterministic fixtures and a starter validator.

## Objective

Prove a task can be checkpointed and resumed by a fresh execution using durable GitHub/repository state, with the same contract across GitHub Actions and OpenCode.

## Scenario

- **Stage A:** add the first marker to a tiny fixture, validate it, commit the change and a unique handoff, then stop before completion.
- **Stage B:** start without Stage A conversation/session; read issue, branch, commit, checks, and handoff; confirm the checkpoint; add the second marker; validate and record a new handoff.
- **Cross-runner acceptance:** run A in Actions and B in OpenCode, then reverse the direction. Restarting from scratch and ignoring Stage A's checkpoint is a failure.

The first test is deterministic and does not call a model API. This separates state recovery from provider behavior.

## Components

1. Issue: objective, acceptance criteria, allowed paths, and staged completion condition.
2. Branch and commits: durable checkpoint; no Actions-only artifact or local session is required.
3. Handoff: [JSON Schema v1](../../schemas/agent-handoff.schema.json); example records live in `examples/vertical-slice/`.
4. Shared validation: `node scripts/validate-vertical-slice.mjs --stage A`, `--stage B`, or `--self-test`.
5. Runner adapters: thin Actions and OpenCode entry points call the same validation and task procedure.

The validator uses Node.js built-ins only. It checks the example handoff fields and stage markers; it is not yet a complete JSON Schema validator or proof of cross-runner portability.

## Handoff and recovery

Write a unique JSON file per execution under `agent-handoffs/<issue-number>/<UTC-timestamp>-<runner>-<run-id>.json`. Never overwrite earlier handoffs. Handoffs are reports, not authoritative status; current issue, PR, commit, and check state wins.

Before committing, confirm the expected base commit is still the branch tip. If it changed, stop and reload the issue, PR, checks, and handoffs before reconciling. Actions should use a concurrency group keyed by task ID. The first slice permits one active writer per task branch and does not claim to provide a distributed lock.

## Minimum permissions

- Read issue, PR, branch, commit, and check state.
- Write only the task branch and handoff records; open/update a PR if needed.
- No ability to change repository protections, secrets, environments, or workflow permissions.
- No automatic merge. The deterministic test needs no provider secret.

## Pass/fail criteria

1. Stage A leaves its marker, commit, handoff, and passing deterministic check.
2. A fresh Stage B execution discovers the checkpoint without the previous transcript.
3. Stage B preserves Stage A's work and adds the second marker.
4. Both handoffs remain and reference real commits.
5. Validation accepts valid fixtures and rejects missing fields, stale handoffs, and incomplete final state.
6. Stale-base or overlapping runs stop safely rather than overwriting progress.
7. Both cross-runner directions pass before portability is declared proven.

Until Actions/OpenCode cross-runner tests run, portability remains unproven.

## Out of scope

Live model calls, multi-agent execution, dynamic model routing/token accounting, generalized retry orchestration, multiple concurrent writers, automatic merging, and enabling GitHub Template Repository.

## Implementation order

1. Review the task contract and this scenario.
2. Review the handoff schema and run `node scripts/validate-vertical-slice.mjs --self-test`.
3. Add the smallest Actions adapter.
4. Document the equivalent OpenCode entry point.
5. Test both cross-runner directions and record evidence.
6. Decide which further orchestration features are justified only after the slice passes.
