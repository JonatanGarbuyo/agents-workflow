# Runtime checkpoint test

This test exercises durable recovery without calling a model API. It deliberately uses a fresh GitHub Actions run for Stage B; no Stage A process memory or artifact is read.

## Current limitation

GitHub exposes `workflow_dispatch` only after the workflow file exists on the repository's default branch. Therefore this workflow cannot be executed while it exists only on the bootstrap PR branch. Review and merge of the workflow infrastructure is a prerequisite to running the Actions-to-Actions experiment; that merge alone must not be described as proof of portability. Keep the repository template disabled.

## Run procedure\n\nThe privileged checkpoint is triggered by a comment on issue #6. This event uses the workflow version from the repository default branch; do not reintroduce a privileged `workflow_dispatch` entry point.

1. After the checkpoint workflow is available from the default branch, create a disposable branch named `test/vertical-slice-6` from the bootstrap branch's tested head. It must contain the pristine `examples/vertical-slice/runtime-fixture.txt` with no stage markers and no `agent-handoffs/6/*.json` records.
2. Add the exact comment `/checkpoint stage=A branch=test/vertical-slice-6` to issue #6. Only repository owners, members, or collaborators can trigger the privileged job. The workflow is loaded from the default branch; the task branch is parsed and validated as data.
3. Wait for Stage A to finish. Copy the exact **Final checkpoint SHA** printed at the end of the successful run. Stage A creates a fixture commit, then a separate append-only handoff commit, and pushes both.
4. Add a new comment to issue #6 with `/checkpoint stage=B branch=test/vertical-slice-6 expected=SHA`, replacing `SHA` with the exact 40-character checkpoint from Stage A.
5. Stage B verifies that the branch tip still equals the supplied checkpoint, that Stage A's marker and exactly one Stage A handoff exist, and that Stage B has not already completed. It then adds its own marker and unique handoff, validates both handoffs against real Git commits, and pushes.
6. Inspect the final branch history and `agent-handoffs/6/`. There must be two stage commits plus two separate handoff commits, two unique JSON handoffs, and both fixture markers exactly once.

## Failure cases

- Stage B with no SHA, a stale SHA, or a branch that moved since the checkpoint must fail closed.
- Stage B must fail if Stage A's marker or handoff is absent, or if Stage B already ran.
- Stage A must fail if the fixture is not pristine.
- The workflow serializes writes by branch using a concurrency group. This is a single-writer safeguard, not a general distributed lock.
- The privileged workflow uses `issue_comment`, which runs the workflow from the repository default branch. It accepts commands only on issue #6 from an owner, member, or collaborator. It parses the comment into constrained outputs before checking out the task branch. The runner and validator are loaded from the default branch; the task branch is a separate checkout and is only the target of fixture/handoff writes. Branch-name checks are defense in depth, not the trust boundary.

## What this proves—and what it does not

A successful run proves **Actions → fresh Actions run** recovery from committed Git state. It does not prove either Actions/OpenCode direction. OpenCode must later use the same issue, branch, schema, markers, and recovery rules without relying on this Actions process or any conversation transcript. Do not close the parent portability issue or enable the template until both cross-runner directions have evidence.
