# Runtime checkpoint test

This test exercises durable recovery without calling a model API. It deliberately uses a fresh GitHub Actions run for Stage B; no Stage A process memory or artifact is read.

## Current limitation

The privileged controller is intentionally unavailable until its workflow file is on the repository's default branch. The controller uses `issue_comment` so the caller cannot select an untrusted workflow ref. Review and merge of the workflow infrastructure is a prerequisite to the Actions-to-Actions experiment; that merge alone must not be described as proof of portability. Keep the repository template disabled.

## Run procedure\n\nThe privileged checkpoint is triggered by a comment on issue #6. This event uses the workflow version from the repository default branch; do not reintroduce a privileged `workflow_dispatch` entry point.

1. After the checkpoint workflow is available from the default branch, create a disposable branch named `test/vertical-slice-6` from the bootstrap branch's tested head. It must contain the pristine `examples/vertical-slice/runtime-fixture.txt` with no stage markers and no `agent-handoffs/6/*.json` records.
2. Add the exact comment `/checkpoint stage=A branch=test/vertical-slice-6` to issue #6. For this initial pilot, only the explicitly allowlisted repository owner account `JonatanGarbuyo` can trigger the privileged job. Do not broaden this allowlist without a separate authorization design. The workflow is loaded from the default branch; the task branch is parsed and validated as data.
3. Wait for Stage A to finish. Copy the exact **Final checkpoint SHA** printed at the end of the successful run. Stage A creates a fixture commit, then a separate append-only handoff commit, and pushes both.
4. Add a new comment to issue #6 with `/checkpoint stage=B branch=test/vertical-slice-6 expected=SHA`, replacing `SHA` with the exact 40-character checkpoint from Stage A.
5. Stage B verifies that the branch tip still equals the supplied checkpoint, that Stage A's marker and exactly one Stage A handoff exist, and that Stage B has not already completed. It then adds its own marker and unique handoff, validates both handoffs against real Git commits, and pushes.
6. Inspect the final branch history and `agent-handoffs/6/`. There must be two stage commits plus two separate handoff commits, two unique JSON handoffs, and both fixture markers exactly once.

## Failure cases

- Stage B with no SHA, a stale SHA, or a branch that moved since the checkpoint must fail closed.
- Stage B must fail if Stage A's marker or handoff is absent, or if Stage B already ran.
- Stage A must fail if the fixture is not pristine.
- The workflow serializes writes by branch using a concurrency group. This is a single-writer safeguard, not a general distributed lock.
- The privileged workflow uses `issue_comment`, which runs the workflow from the repository default branch. It accepts commands only on issue #6 from the explicitly allowlisted owner account `JonatanGarbuyo`. It parses the comment into constrained outputs before checking out the task branch. The runner and validator are loaded from the default branch; the task branch is a separate checkout and is only the target of fixture/handoff writes. Branch-name checks are defense in depth, not the trust boundary.

## Validation scope of each handoff

The `validation` field in each stage handoff records only that stage runner's precondition checks and the generated handoff's metadata self-check. It explicitly does **not** claim that the final runtime state was validated. Stage B's workflow runs `validate-runtime-checkpoint.mjs` as a separate gate before pushing; that validator checks both markers and both handoffs. Stage A cannot pass the final-state validator because Stage B has not run yet.

## What this proves—and what it does not

A successful run proves **Actions → fresh Actions run** recovery from committed Git state. It does not prove either Actions/OpenCode direction. OpenCode must later use the same issue, branch, schema, markers, and recovery rules without relying on this Actions process or any conversation transcript. Do not close the parent portability issue or enable the template until both cross-runner directions have evidence.
