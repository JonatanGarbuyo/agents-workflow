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
5. The [validation workflow](.github/workflows/validate-agent-workflow.yml) runs fixture/schema checks plus runtime checkpoint tests on pushes and pull requests. Run them locally with `node scripts/validate-vertical-slice.mjs --self-test` and `node scripts/test-runtime-checkpoint.mjs`. The runtime tests use temporary Git repositories and do not need provider credentials.
6. Read [ADR 0001: Template strategy and shared runner contract](docs/adr/0001-template-and-runner-contract.md) and follow the [Wayfinder map issue](https://github.com/JonatanGarbuyo/agents-workflow/issues/1), [vertical-slice issue](https://github.com/JonatanGarbuyo/agents-workflow/issues/4), [remote checkpoint issue](https://github.com/JonatanGarbuyo/agents-workflow/issues/6), and [real-repository pilot](https://github.com/JonatanGarbuyo/agents-workflow/issues/7).

## Status

Bootstrap and architectural discovery. The handoff schema, fixtures, validators, and runtime-runner tests are initial building blocks, not a production agent runner. The deterministic runtime tests pass in CI, but the manually dispatched remote checkpoint experiment and cross-runner portability remain unproven until the task is resumed across Actions and OpenCode in both directions. This repository is not yet marked as a GitHub Template Repository; enable that only after the workflow passes a disposable-repository test.

## References

- [Matt Pocock skills](https://github.com/mattpocock/skills/tree/main)
- [User service platform](https://github.com/JonatanGarbuyo/user-service-platform/)
- [better-typescript skill](https://github.com/JonatanGarbuyo/skills/tree/main/skills/engineering/better-typescript)
- [shadcn skills](https://ui.shadcn.com/docs/skills)
