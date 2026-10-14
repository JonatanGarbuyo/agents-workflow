#!/usr/bin/env node
import assert from "node:assert/strict";
import { validateStageARun } from "./validate-stage-a-run.mjs";

const base = {
  id: 123456789,
  status: "completed",
  conclusion: "success",
  event: "issue_comment",
  path: ".github/workflows/vertical-slice-checkpoint.yml",
  head_branch: "main",
  head_repository: { full_name: "JonatanGarbuyo/agents-workflow" },
  repository: { full_name: "JonatanGarbuyo/agents-workflow" },
  actor: { login: "JonatanGarbuyo" }
};
const expected = {
  runId: "123456789",
  repository: "JonatanGarbuyo/agents-workflow",
  defaultBranch: "main"
};

assert.equal(validateStageARun(base, expected), true, "trusted successful Stage A run should pass");

const rejected = [
  ["wrong run ID", { id: 987654321 }],
  ["in-progress run", { status: "in_progress", conclusion: null }],
  ["failed run", { conclusion: "failure" }],
  ["different event", { event: "pull_request" }],
  ["different workflow path", { path: ".github/workflows/untrusted.yml" }],
  ["non-default branch", { head_branch: "attacker-branch" }],
  ["fork source", { head_repository: { full_name: "attacker/fork" } }],
  ["different repository", { repository: { full_name: "attacker/repo" } }],
  ["different actor", { actor: { login: "attacker" } }]
];

for (const [label, patch] of rejected) {
  assert.throws(
    () => validateStageARun({ ...base, ...patch }, expected),
    undefined,
    `${label} must be rejected`
  );
}

process.stdout.write("Stage A run provenance tests passed: trusted run accepted; wrong ID, status, conclusion, event, workflow, branch, repository, fork, and actor rejected.\n");
