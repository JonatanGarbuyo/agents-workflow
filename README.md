# agents-workflow

A reusable, provider-agnostic workflow for AI-assisted engineering projects. The intended output is a GitHub Template Repository that can bootstrap a new project with consistent agent roles, task tracking, skills, and recovery conventions.

## Core principles

- **One workflow, interchangeable runners:** GitHub Actions and local OpenCode share the same task lifecycle and repository state. Work can resume in either environment.
- **GitHub is the source of truth:** issues, pull requests, commits, checks, decisions, and handoff records make work resumable without relying on conversation history.
- **Delegate by default:** frontier models focus on architecture, planning, supervision, escalation, and final review. Lower-cost agents handle bounded implementation and routine reviews.
- **Bound retries:** repeated failure becomes a recorded blocker and escalation, not an indefinite frontier-model implementation loop.
- **Append-only handoffs:** each execution creates its own concise handoff record rather than extending one shared log.
- **Reproducible local setup:** skills are installed and versioned in the repository so OpenCode can discover them after cloning.

## Start here

1. Read [workflow principles](docs/agents/workflow-principles.md).
2. Review the [task execution contract](docs/agents/task-contract.md).
3. Review the [portable vertical slice](docs/agents/vertical-slice.md).
4. Inspect the [handoff schema](schemas/agent-handoff.schema.json) and examples under `examples/vertical-slice/`.
5. The [fixture validation workflow](.github/workflows/validate-agent-workflow.yml) runs the deterministic checks on pushes and pull requests. The same validator can be invoked from any compatible Node.js environment with `node scripts/validate-vertical-slice.mjs --self-test`.
6. Follow the [Wayfinder map issue](https://github.com/JonatanGarbuyo/agents-workflow/issues/1) and [vertical-slice issue](https://github.com/JonatanGarbuyo/agents-workflow/issues/4) for decisions and follow-up work.

## Status

Bootstrap and architectural discovery. The handoff schema, fixtures, validator, and CI check are initial building blocks, not a working agent runner. Cross-runner portability remains unproven until the task is resumed across Actions and OpenCode in both directions. This repository is not yet marked as a GitHub Template Repository; enable that only after the workflow passes a disposable-repository test.

## References

- [Matt Pocock skills](https://github.com/mattpocock/skills/tree/main)
- [User service platform](https://github.com/JonatanGarbuyo/user-service-platform/)
- [better-typescript skill](https://github.com/JonatanGarbuyo/skills/tree/main/skills/engineering/better-typescript)
- [shadcn skills](https://ui.shadcn.com/docs/skills)
