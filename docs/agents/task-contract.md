# Task execution contract

Status: proposed v1. This contract is runner- and provider-independent. GitHub Actions and local OpenCode must follow the same rules.

## 1. Durable task state

A task is identified by a GitHub Issue. Its current state is derived from these durable sources:

| Source | Authority |
| --- | --- |
| GitHub Issue | Objective, acceptance criteria, constraints, dependencies, coordination status |
| Branch and commits | Actual implementation and checkpoints |
| Pull request | Proposed diff, review discussion, merge status |
| CI/check runs | Verification evidence |
| Per-execution handoff | What one execution did, observed, and recommends next |

A handoff is a report, not a competing status database. If it conflicts with newer issue, PR, commit, or check data, use the current GitHub state and record the discrepancy in the next handoff.

Do not require Actions artifacts, a local session, provider conversation history, or uncommitted files to recover a task.

## 2. Required inputs before work starts

The runner must load and inspect:

- The full issue, including acceptance criteria, constraints, and linked dependencies.
- Current issue state, labels, assignee, and recent comments relevant to the task.
- The repository's current default branch and working branch/PR, if one exists.
- Latest commits and relevant CI/check results.
- Recent handoff records for this issue, if any.
- Applicable repository instructions, skills, and security/permission boundaries.

If acceptance criteria or required decisions are missing, do not guess silently. Ask for clarification or return a blocked status with the specific decision required.

## 3. Task lifecycle

Use these conceptual states; the current GitHub issue/PR remains the durable coordination surface.

1. **Ready** — issue is actionable, dependencies are satisfied, acceptance criteria are explicit.
2. **In progress** — one execution owns a bounded attempt on a branch.
3. **Review** — proposed change is available as a PR with verification evidence.
4. **Blocked** — missing decision, dependency, permission, or repeated failure prevents safe progress.
5. **Done** — acceptance criteria are met, required checks/reviews pass, and the change is merged or the issue's stated completion condition is otherwise satisfied.

A runner must not mark work done merely because code was generated or a PR was opened.

## 4. Role and delegation contract

- **Frontier planner/supervisor:** architecture, ambiguity resolution, task decomposition, assignment/routing, escalation, and final review. Delegate implementation and routine test/review work by default.
- **Implementer:** makes the smallest change satisfying the issue, runs relevant checks, and reports exact evidence. It does not change repository protections, secrets, or merge policy.
- **Independent reviewer:** evaluates the diff against acceptance criteria and looks for correctness, regression, security, and test gaps. It should not assume the implementer's claims are verified.
- **Frontier final reviewer:** for changes designated to require it, checks the actual diff, acceptance criteria, CI evidence, review findings, and unresolved risks before recommending merge.

Every delegated task must have a bounded objective, acceptance criteria, relevant context/links, allowed scope, expected deliverable, and a stop condition. A delegation request is not complete until the receiving agent's result is checked.

## 5. Retry and escalation policy

Default behavior:

- Delegate routine implementation rather than having the frontier model implement it directly.
- Allow at most **two failed implementation attempts using the same approach** before stopping that approach.
- After repeated failure, preserve the failing command/output, current commit, attempted fixes, and unresolved hypothesis. Mark the task blocked or request a specific architecture/requirements decision.
- Do not repeat an unchanged action after a failure. A retry must state what changed and why it could plausibly succeed.
- The frontier model may directly implement only when delegation is unavailable or disproportionate, the change is genuinely small, and it explicitly records why this exception is justified.
- Do not keep retrying because a task is unfinished. Stop when the budget is exhausted, credentials are unavailable, requirements conflict, or further action risks destructive changes.

Projects may tighten these limits. Raising them requires an explicit, recorded reason.

## 6. Required outputs from every execution

Every execution must leave durable, concise evidence of one of these outcomes:

- **Progress:** commit(s), changed files, checks run and results, remaining work, next action.
- **Review:** reviewed commit/PR, findings by severity with file/line references, checks/evidence examined, recommendation.
- **Blocked:** exact blocker, evidence, decision or permission needed, and safe next action.
- **Complete:** completion condition, merged commit/PR or other durable result, acceptance criteria checked, verification evidence.

Do not claim tests passed unless they were actually run and their result was observed. Separate tests not run from tests that failed.

## 7. Handoff format and location

Use JSON for execution handoffs so shared validation can check required fields without parsing free-form prose. The schema is [agent-handoff.schema.json](../../schemas/agent-handoff.schema.json), version 1.

Write one new file per execution; do not append to a shared growing log.

Suggested path:

`agent-handoffs/<issue-number>/<UTC-timestamp>-<runner>-<run-id>.json`

Required fields are defined in the schema and include issue URL, stage (for the vertical-slice test), runner, unique run ID, UTC timestamp, outcome, starting and ending commit, changed files, validation command/result, observed checkpoint, and next action. A pull request URL is optional.

Use a unique filename and never overwrite a previous execution record. Keep each handoff short; link to issues, PRs, commits, logs, and check runs instead of copying large outputs.

The handoff directory is an execution journal. The issue and PR must still be updated when task status, blockers, acceptance criteria, or review outcomes change.

## 8. Resume algorithm

Any runner resuming a task must:

1. Read the issue and linked PR; inspect current status and acceptance criteria.
2. Inspect the current branch, latest commit, CI/checks, review comments, and dependencies.
3. Read the latest handoff records for context, treating them as reports that may be stale.
4. Reconcile any discrepancies in favor of current GitHub state and note them.
5. Choose exactly one next action: implement a bounded change, review, ask for a decision, retry with a materially different approach within budget, or stop as blocked.
6. Record the execution outcome in a new handoff and update GitHub's coordination state as appropriate.

If the branch or commit referenced by a handoff no longer exists, do not recreate work blindly. Inspect the current PR and history first.

## 9. Minimum acceptance test for portability

A task contract implementation is portable only when:

- An execution can stop after committing a partial change and writing a handoff.
- A fresh runner with no access to the previous conversation can recover the issue, branch, commit, checks, and next action from the repository and GitHub.
- The fresh runner can continue using either Actions or OpenCode without translating task state.
- A deliberately stale handoff does not override newer GitHub state.
- Repeated failure reaches a bounded stop/escalation outcome rather than an unbounded implementation loop.
