# ADR 0001: Template strategy and shared runner contract

- Status: proposed, pending validation
- Date: 2026-10-12
- Scope: `agents-workflow`

## Context

The workflow must be reusable across independent repositories and resumable between GitHub Actions and local OpenCode. GitHub is the durable source of truth; conversation history, Actions artifacts, and local session memory cannot be required for recovery. The frontier model must prioritize architecture, delegation, supervision, escalation, and final review rather than repeatedly implementing the same task.

## Decisions

### 1. Use a GitHub Template Repository, not a fork, for new projects

A generated project should have an independent history and issue tracker. Forking would couple project identity and history to the workflow repository and is not the intended default.

A template copies a starting point; it does not automatically distribute future improvements. Therefore, do not promise that template consumers receive upstream changes automatically. Workflow improvements must be versioned and brought into existing projects through an explicit, reviewable update mechanism. The exact update mechanism remains open until a disposable-repository experiment demonstrates its maintenance and permission properties.

Do not enable the template setting until the minimum portability tests and disposable-repository test pass.

### 2. Define one runner-independent task contract

Actions and OpenCode are adapters around one task lifecycle, not separate workflows. Both must read and update the same GitHub issue, branch/commits, pull request, checks, repository instructions, and append-only handoff schema. Runner-specific details may differ, but task semantics and recovery decisions must not.

Durable state is derived in this order: current GitHub issue/PR/check/commit state, applicable repository instructions and decisions, then handoffs as execution reports. A handoff is never authoritative over newer GitHub state.

### 3. Use delegation-first role boundaries

- Frontier planner/supervisor: resolve ambiguity, plan, decompose, route work, supervise, escalate, and perform required final review.
- Implementer: complete one bounded ticket, run checks, and report observed evidence.
- Independent reviewer: assess the actual proposed diff against acceptance criteria and regressions.
- Frontier final reviewer: inspect the actual diff, checks, review findings, and remaining risks before recommending merge.

Implementation by the frontier model is an exception, not the default. Permit no more than two failed attempts using the same approach. A retry must state what materially changed. After the budget is exhausted, stop, preserve evidence, and escalate or mark blocked. Never claim completion because code was generated or a PR was opened.

### 4. Keep handoffs append-only and subordinate to GitHub

Every execution writes a uniquely named JSON handoff using the versioned schema. It records the runner, run identifier, issue, start/end commits, changed paths, checks actually observed, checkpoint and next action. Do not use one shared mutable history file. Do not depend on artifacts or conversation transcripts for recovery.

### 5. Validate against a real, approved repository task

The deterministic vertical slice validates checkpoint mechanics but does not prove real task execution or runner interoperability. The next integration pilot should use a small, already-approved implementation ticket in `JonatanGarbuyo/user-service-platform`, follow that repository's `AGENTS.md` and project-local skills, and produce a draft PR with observed checks and independent review.

The pilot must not bypass the target repository's ticket lifecycle, branch isolation, required reviews, or merge/deployment boundaries. Select an implementation ticket only after confirming its current state, labels, dependencies, and instructions. Do not use the broad parent spec as a direct implementation ticket.

## Validation gates

1. CI passes deterministic fixture and fresh-process checkpoint tests.
2. A real Stage A checkpoint is committed by one Actions run and resumed by a fresh Actions run using the exact checkpoint SHA; stale or incomplete state fails closed.
3. The same task can be resumed Actions → OpenCode and OpenCode → Actions without translating its contract or relying on conversation memory.
4. A bounded approved ticket in a real repository reaches a draft PR, with tests and independent review evidence accurately recorded.
5. A disposable repository created from the template can run its bootstrap and validation path.
6. Only after these gates pass should the repository be marked as a GitHub Template Repository.

## Consequences

- The current runtime tests are useful but insufficient evidence for template readiness.
- A real PR is the right integration test, provided it uses an approved bounded ticket and does not replace the cross-runner tests.
- The update mechanism for distributing later workflow improvements remains an explicit open decision and must be tested rather than assumed.
- No agent may merge, deploy, change secrets, or weaken repository protections as a side effect of this workflow.
