# agents-workflow

A reusable, provider-agnostic workflow for AI-assisted engineering projects. The intended output is a GitHub Template Repository that can bootstrap a new project with consistent agent roles, task tracking, skills, and recovery conventions.

## Core principles

- **One workflow, interchangeable runners:** GitHub Actions and local OpenCode share the same task lifecycle and repository state. Work can resume in either environment.
- **GitHub is the source of truth:** issues, pull requests, commits, checks, decisions, and handoff records make work resumable without relying on conversation history.
- **Delegate by default:** frontier models focus on architecture, planning, supervision, escalation, and final review. Lower-cost agents handle bounded implementation and routine reviews.
- **Bound retries:** repeated failure becomes a recorded blocker and escalation, not an indefinite frontier-model implementation loop.
- **Append-only handoffs:** each execution creates its own concise handoff record rather than extending one shared log.
- **Reproducible local setup:** skills are installed and versioned in the repository so OpenCode can discover them after a clone.

## Start here

1. Read [workflow principles](docs/agents/workflow-principles.md).
2. Review the proposed [task execution contract](docs/agents/task-contract.md), including inputs, outputs, recovery, and escalation rules.
3. Review the [minimal portable vertical slice](docs/agents/vertical-slice.md) and its [tracking issue](https://github.com/JonatanGarbuyo/agents-workflow/issues/4).
4. Follow the [Wayfinder map issue](https://github.com/JonatanGarbuyo/agents-workflow/issues/1) for architectural decisions and implementation planning.

## Status

Bootstrap and architectural discovery. The task contract and vertical slice are proposals, not yet implemented or validated by an end-to-end runner. This repository is not yet marked as a GitHub Template Repository; that should happen after the workflow is implemented and validated by creating a disposable repository from the template.

## References

- [Matt Pocock skills](https://github.com/mattpocock/skills/tree/main)
- [User service platform](https://github.com/JonatanGarbuyo/user-service-platform/)
- [better-typescript skill](https://github.com/JonatanGarbuyo/skills/tree/main/skills/engineering/better-typescript)
- [shadcn skills](https://ui.shadcn.com/docs/skills)
