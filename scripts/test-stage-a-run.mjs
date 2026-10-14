#!/usr/bin/env node
import assert from "node:assert/strict";
import { fetchStageARun, validateStageARun } from "./validate-stage-a-run.mjs";

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

const requestOptions = {
  apiUrl: "https://api.github.com",
  repository: expected.repository,
  runId: expected.runId,
  token: "test-token"
};
let capturedUrl;
let capturedHeaders;
const loadedRun = await fetchStageARun({
  ...requestOptions,
  fetchImpl: async (url, options) => {
    capturedUrl = url;
    capturedHeaders = options.headers;
    return { ok: true, json: async () => base };
  }
});
assert.equal(capturedUrl, "https://api.github.com/repos/JonatanGarbuyo/agents-workflow/actions/runs/123456789");
assert.equal(capturedHeaders.Authorization, "Bearer test-token");
assert.equal(capturedHeaders.Accept, "application/vnd.github+json");
assert.deepEqual(loadedRun, base, "API lookup should return the response run metadata");

await assert.rejects(
  fetchStageARun({
    ...requestOptions,
    fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({}) })
  }),
  /lookup failed with HTTP 404/,
  "missing or inaccessible Stage A run must fail closed"
);
await assert.rejects(
  fetchStageARun({
    ...requestOptions,
    fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({}) })
  }),
  /lookup failed with HTTP 403/,
  "API permission errors must fail closed"
);

process.stdout.write("Stage A provenance tests passed: trusted metadata accepted; invalid metadata, incorrect API request, HTTP 404 and HTTP 403 rejected.\n");
