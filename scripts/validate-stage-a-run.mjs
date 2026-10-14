#!/usr/bin/env node
import assert from "node:assert/strict";
import { appendFile } from "node:fs/promises";

export async function fetchStageARun({ apiUrl, repository, runId, token, fetchImpl = fetch }) {
  const response = await fetchImpl(`${apiUrl}/repos/${repository}/actions/runs/${runId}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
  if (!response.ok) {
    throw new Error(`GitHub Actions run lookup failed with HTTP ${response.status}`);
  }
  return response.json();
}

export function validateStageARun(run, {
  runId,
  repository,
  defaultBranch,
  trustedActor = "JonatanGarbuyo",
  workflowPath = ".github/workflows/vertical-slice-checkpoint.yml"
}) {
  assert.equal(String(run?.id), String(runId), "run ID must match the requested Stage A run");
  assert.equal(run?.status, "completed", "Stage A run must be completed");
  assert.equal(run?.conclusion, "success", "Stage A run must have succeeded");
  assert.equal(run?.event, "issue_comment", "artifact must originate from an issue_comment workflow run");
  assert.equal(run?.path, workflowPath, "artifact must originate from the trusted checkpoint workflow");
  assert.equal(run?.head_branch, defaultBranch, "trusted checkpoint workflow must run from the default branch");
  assert.equal(run?.head_repository?.full_name, repository, "run must originate from this repository, not a fork");
  assert.equal(run?.repository?.full_name, repository, "run repository must match the current repository");
  assert.equal(run?.actor?.login, trustedActor, "checkpoint run must have been triggered by the trusted owner");
  return true;
}

async function main() {
  const runId = process.env.STAGE_A_RUN_ID ?? "";
  const repository = process.env.GITHUB_REPOSITORY ?? "";
  const defaultBranch = process.env.DEFAULT_BRANCH ?? "";
  const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
  const token = process.env.GITHUB_TOKEN ?? "";
  const output = process.env.GITHUB_OUTPUT;

  assert.match(runId, /^[0-9]+$/, "Stage A run ID must be numeric");
  assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "GITHUB_REPOSITORY must be owner/repository");
  assert.ok(defaultBranch, "DEFAULT_BRANCH is required");
  assert.ok(token, "GITHUB_TOKEN is required to verify run provenance");
  assert.ok(output, "GITHUB_OUTPUT is required");

  const run = await fetchStageARun({ apiUrl, repository, runId, token });
  validateStageARun(run, { runId, repository, defaultBranch });
  await appendFile(output, `validated_run_id=${runId}\n`);
  process.stdout.write(`Verified Stage A run ${runId}: trusted workflow, default branch, trusted actor, successful conclusion.\n`);
}

if (process.env.STAGE_A_RUN_ID !== undefined) {
  await main();
}
