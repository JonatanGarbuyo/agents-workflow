# Runtime checkpoint test

This test exercises durable recovery without calling a model API. It deliberately uses a fresh GitHub Actions run for Stage B; no Stage A process memory or artifact is read.

## Current limitation

GitHub exposes `workflow_dispatch` only after the workflow file exists on the repository's default branch. Therefore this workflow cannot be executed while it exists only on the bootstrap PR branch. Review and merge of the workflow infrastructure is a prerequisite to running the Actions-to-Actions experiment; that merge alone must not be described as proof of portability. Keep the repository template disabled.

## Run procedure

1. After the checkpoint workflow is available from the default branch, create a disposable branch named `test/vertical-slice-6` from the bootstrap branch's tested head. It must contain the pristine `examples/vertical-slice/runtime-fixture.txt` with no stage markers and no `agent-handoffs/6/*.json` records.
2. Open **Actions → Run portable vertical-slice checkpoint → Run workflow**. Select branch `test/vertical-slice-6` and stage `A`; leave `expected_checkpoint` empty.
3. Wait for Stage A to finish. Copy the exact **Final checkpoint SHA** printed at the end of the successful run. Stage A creates a fixture commit, then a separate append-only handoff commit, and pushes both.
4. Start a **new workflow run** on the same branch, select stage `B`, and paste that exact SHA into `expected_checkpoint`.
5. Stage B verifies that the branch tip still equals the supplied checkpoint, that Stage A's marker and exactly one Stage A handoff exist, and that Stage B has not already completed. It then adds its own marker and unique handoff, validates both handoffs against real Git commits, and pushes.
6. Inspect the final branch history and `agent-handoffs/6/`. There must be two stage commits plus two separate handoff commits, two unique JSON handoffs, and both fixture markers exactly once.

## Failure cases

- Stage B with no SHA, a stale SHA, or a branch that moved since the checkpoint must fail closed.
- Stage B must fail if Stage A's marker or handoff is absent, or if Stage B already ran.
- Stage A must fail if the fixture is not pristine.
- The workflow serializes writes by branch using a concurrency group. This is a single-writer safeguard, not a general distributed lock.
- Never dispatch this workflow against `main` or the bootstrap branch. Its job runs only on `test/vertical-slice-*` branches, and the runner also refuses shared development branches.

## What this proves—and what it does not

A successful run proves **Actions → fresh Actions run** recovery from committed Git state. It does not prove either Actions/OpenCode direction. OpenCode must later use the same issue, branch, schema, markers, and recovery rules without relying on this Actions process or any conversation transcript. Do not close the parent portability issue or enable the template until both cross-runner directions have evidence.
