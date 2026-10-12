# Minimal portable workflow vertical slice

Status: proposed design. This is deliberately smaller than a general-purpose multi-agent framework.

## Objective

Prove that one task can be started, checkpointed, interrupted, and resumed by a fresh execution using only durable GitHub/repository state. The task must be resumable across GitHub Actions and OpenCode without changing its contract.

## Scenario

Use a disposable GitHub Issue with two acceptance criteria and a tiny text fixture.

- **Stage A:** read the issue and repository state; add the first marker to the fixture; run a deterministic check; commit the change and a unique handoff; stop before adding the second marker.
- **Stage B:** start with no Stage A conversation/session; read the issue, branch, commit, checks, and latest handoff; verify the first marker already exists; add the second marker; run the deterministic check; commit a new handoff and report completion.
- **Cross-runner test:** when both adapters exist, run A in Actions and B in OpenCode, then reverse the direction. A restart that discards the checkpoint and repeats Stage A is a failure.

Use a deterministic fixture first, not a live model API call. This isolates persistence and recovery from provider behavior. Model delegation and provider adapters come later.

## Components

1. **Issue contract:** objective, acceptance criteria, allowed paths, dependencies, and staged completion condition.
2. **Repository state:** branch and commits are the durable checkpoint. No Actions artifact or local session is required for progress.
3. **Handoff schema:** one small record per execution, committed with the relevant checkpoint; link issue, commit, checks, outcome, and next action.
4. **Shared validation:** one script/test verifies fixture stages and required handoff fields. Both runners invoke the same validation.
5. **Runner adapters:** minimal Actions entry point and documented OpenCode entry point. Triggers and environment setup may differ; task logic must not.

Do not build model routing, multi-agent graphs, provider layers, dashboards, or generalized queues in this slice.

## State flow

Ready issue -> Stage A starts from GitHub state -> partial change + handoff committed -> execution stops -> fresh Stage B reads issue/branch/commit/checks/handoff -> verifies checkpoint and continues -> completion + new handoff committed -> deterministic acceptance check passes.

A task is not complete until the final marker and checks pass. Handoffs are reports, not authoritative status; current issue, PR, commit, and check state wins if they disagree.

## Handoff

Create a unique file per execution under `agent-handoffs/<issue-number>/<UTC-timestamp>-<runner>-<run-id>.md`. Include issue URL, stage, runner/run ID, starting and ending commit, outcome, changed files, exact validation command/result, checkpoint observed at start, and next action. Never overwrite Stage A's record during Stage B.

## Concurrency and stale state

For the first slice, allow one active writer per task branch. Actions should use a concurrency group keyed by task ID and queue or cancel overlapping runs according to a documented policy. OpenCode must inspect the current branch/PR and latest commit before writing.

Before committing, verify the expected base commit is still the branch tip. If it changed, stop and reload issue, branch, PR, checks, and handoffs before reconciling. Do not reset or overwrite another execution's unobserved work. This is a lightweight guard, not a distributed-lock guarantee; document its limits.

## Minimum permissions

- Read issue, PR, branch, commit, and check state.
- Write only the task branch and handoff records; open/update a PR if needed.
- No permission to change repository rules, secrets, environments, or workflow permissions.
- No automatic merge in this slice.
- Do not expose provider secrets to untrusted PR code. The deterministic test requires no provider secret.

## Pass/fail criteria

Pass only if:

1. Stage A leaves the first marker, a commit, a unique handoff, and a passing deterministic check.
2. Stage B has no Stage A transcript and discovers the checkpoint from GitHub/repository state.
3. Stage B neither repeats nor erases Stage A's change and adds the second marker.
4. Both handoffs remain and reference real commits.
5. Final validation verifies both markers and required handoff fields.
6. A stale handoff cannot override newer branch/commit/check state.
7. An overlapping or stale-base run stops safely rather than overwriting progress.
8. Both cross-runner directions pass before portability is declared proven.

Until both runners are tested, cross-runner acceptance remains pending; unit tests alone do not prove portability.

## Out of scope

Live model invocation, multi-agent delegation execution, dynamic model routing/token accounting, generalized retry orchestration, multiple concurrent writers, automatic merging, and enabling GitHub Template Repository.

## Implementation order

1. Review and accept the task contract and scenario.
2. Define and validate the handoff schema with a fixture.
3. Implement shared deterministic checkpoint validation.
4. Add the smallest Actions adapter.
5. Document the equivalent OpenCode entry point using the same contract.
6. Run cross-runner tests and record evidence in GitHub.
7. Only after the slice passes, decide which orchestration capabilities are justified.