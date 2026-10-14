# Workflow principles

## Purpose

Build a reusable, provider-agnostic AI engineering workflow that can be started, paused, and resumed across GitHub Actions and local OpenCode.

## Source of truth

GitHub Issues, pull requests, commits, checks, and repository documents define durable project state. Conversation history and model memory are not required to resume work.

Each agent execution writes its own concise, append-only handoff record. Do not have concurrent agents append to one growing shared log. Handoffs summarize what happened; they do not override the current issue, PR, commit, or check state.

## Execution portability

Actions and OpenCode are interchangeable runners of the same workflow, not separate workflows. They must use the same task lifecycle, role contracts, acceptance criteria, handoff schema, and recovery rules. Any task should be resumable in either environment from committed repository state.

Keep runner-specific code behind thin adapters. Do not encode task state only in Actions artifacts, local session memory, or provider-specific conversation state.

## Delegation-first frontier model

The frontier model owns high-value reasoning: architecture, ambiguous decisions, planning, supervision, escalation, and final review. It should delegate routine implementation, test writing, and first-pass review to fit-for-purpose lower-cost agents.

The frontier model must not enter an open-ended implementation loop. Default to at most two failed attempts using the same approach. Every retry must state what materially changed and why it could work. After the budget is exhausted, preserve evidence and stop as blocked or escalate for a specific decision. Direct frontier implementation is an explicit exception when delegation is unavailable or disproportionate and the task is genuinely small.

Model and provider selection must be configurable by role. Avoid hard-coding any provider into the workflow contract.

## Roles

- **Frontier planner/supervisor:** resolve ambiguity, architecture, task decomposition, routing, supervision, escalation, and final review.
- **Implementer:** one bounded ticket, relevant checks, and exact observed evidence.
- **Independent reviewer:** evaluate the actual diff against acceptance criteria, correctness, security, regression, and test coverage.
- **Frontier final reviewer:** examine the actual diff, acceptance criteria, CI evidence, review findings, and unresolved risks before recommending merge.

A PR being opened or code being generated is not a completion condition.

## Quality and permissions

Implementation agents work against explicit acceptance criteria and report tests actually run. Review should be independent of implementation when practical. The final reviewer checks the diff, test evidence, risks, and acceptance criteria before merge.

Use least-privilege credentials. An agent must not change repository protections, secrets, merge policy, or deployment state as a side effect of implementing a task.

## Skills

Install and pin repository-local skills so local OpenCode can discover them after a clone. Start with Matt Pocock's setup and Wayfinder skills; add stack-specific skills such as better-typescript or shadcn only when relevant. Skill setup should be reproducible and documented, not dependent on one machine's global state.

## Template strategy

Use a GitHub Template Repository for new projects so each generated project has an independent history. A template does not automatically distribute future workflow improvements. Existing projects need an explicit, reviewable, versioned update mechanism; that mechanism remains open pending a disposable-repository experiment.

Do not enable the template setting until Actions fresh-run recovery, both Actions/OpenCode directions, a real approved-ticket pilot, and disposable-repository bootstrap have been demonstrated.

See [ADR 0001: Template strategy and shared runner contract](../adr/0001-template-and-runner-contract.md).

## Validation status

Fixture/schema checks and deterministic fresh-process checkpoint tests validate the initial contracts and runtime logic. They do not yet prove a remotely dispatched Actions checkpoint, cross-runner portability, successful real-ticket execution, or template bootstrap. Record each as unproven until actual repository evidence exists.

## References

- [Matt Pocock skills](https://github.com/mattpocock/skills/tree/main)
- [User service platform workflow example](https://github.com/JonatanGarbuyo/user-service-platform/)
- [better-typescript skill](https://github.com/JonatanGarbuyo/skills/tree/main/skills/engineering/better-typescript)
- [shadcn skills](https://ui.shadcn.com/docs/skills)
