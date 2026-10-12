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

The frontier model must not enter an open-ended implementation loop. Before acting directly, it should identify why delegation is unsuitable. Define explicit retry budgets, stop conditions, and escalation triggers. On repeated failure, preserve evidence, record a blocker, and return control to the supervisor rather than silently retrying.

Model and provider selection must be configurable by role. Avoid hard-coding Gemini or any other provider into the workflow contract.

## Quality and permissions

Implementation agents work against explicit acceptance criteria and report tests actually run. Review should be independent of implementation when practical. The final reviewer checks the diff, test evidence, risks, and acceptance criteria before merge.

Use least-privilege credentials. An agent should not change repository protections, secrets, or merge policy as a side effect of implementing a task.

## Skills

Install and pin repository-local skills so local OpenCode can discover them after a clone. Start with Matt Pocock's setup and Wayfinder skills; add stack-specific skills such as better-typescript or shadcn only when relevant. Skill setup should be reproducible and documented, not dependent on one machine's global state.

## Decisions still open

Use Wayfinder to resolve, document, and convert these into dependency-aware issues before broad implementation:

1. Template strategy and how workflow improvements are propagated to repositories generated from the template.
2. Canonical task lifecycle and task/agent contract shared by Actions and OpenCode.
3. Role definitions, delegation rules, model routing, retry budgets, and escalation.
4. Handoff file schema, unique naming, retention, and recovery semantics.
5. Issue labels, tracker setup, and repository bootstrap.
6. CI gates, independent review, final review, and merge permissions.
7. Skill version pinning and stack-conditional skill installation.
8. The smallest end-to-end vertical slice that proves portability.

## References

- [Matt Pocock skills](https://github.com/mattpocock/skills/tree/main)
- [User service platform workflow example](https://github.com/JonatanGarbuyo/user-service-platform/)
- [better-typescript skill](https://github.com/JonatanGarbuyo/skills/tree/main/skills/engineering/better-typescript)
- [shadcn skills](https://ui.shadcn.com/docs/skills)
