#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, lstat } from "node:fs/promises";
import { join } from "node:path";

const taskDir = process.env.TASK_WORKTREE ?? "task";
const taskBranch = process.env.TASK_BRANCH;
const expectedCheckpoint = process.env.EXPECTED_CHECKPOINT;
const issueUrl = process.env.TASK_ISSUE_URL ?? "https://github.com/JonatanGarbuyo/agents-workflow/issues/6";
const artifactPath = process.env.ATTESTATION_PATH;
const handoffDir = join(taskDir, "agent-handoffs/6");

assert.equal(taskBranch, "test/vertical-slice-6", "unexpected task branch");
assert.match(expectedCheckpoint ?? "", /^[0-9a-f]{40}$/, "expected checkpoint must be a full SHA");
assert.ok(artifactPath, "ATTESTATION_PATH is required");

for (const path of [join(taskDir, "agent-handoffs"), handoffDir]) {
  const stat = await lstat(path);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), `unsafe handoff directory: ${path}`);
}
const names = (await readdir(handoffDir)).filter((name) => name.endsWith(".json"));
assert.equal(names.length, 1, "expected exactly one Stage A JSON handoff");
const handoffPath = join(handoffDir, names[0]);
const handoffStat = await lstat(handoffPath);
assert.ok(handoffStat.isFile() && !handoffStat.isSymbolicLink(), "Stage A handoff must be a regular file");
const handoffBytes = await readFile(handoffPath);
const handoff = JSON.parse(handoffBytes.toString("utf8"));
const attestation = JSON.parse(await readFile(artifactPath, "utf8"));

assert.equal(attestation.schema_version, 1);
assert.equal(attestation.issue_url, issueUrl);
assert.equal(attestation.task_branch, taskBranch);
assert.match(attestation.run_id ?? "", /^[0-9]+$/);
assert.equal(attestation.handoff_file, names[0]);
assert.equal(attestation.handoff_sha256, createHash("sha256").update(handoffBytes).digest("hex"), "handoff bytes do not match the immutable Stage A artifact");
assert.equal(attestation.final_branch_sha, expectedCheckpoint, "Stage A artifact does not attest the supplied checkpoint SHA");
assert.match(attestation.stage_a_end_commit ?? "", /^[0-9a-f]{40}$/);
assert.equal(handoff.schema_version, 1);
assert.equal(handoff.stage, "A");
assert.equal(handoff.runner, "actions");
assert.equal(handoff.run_id, attestation.run_id);
assert.equal(handoff.issue_url, issueUrl);
assert.equal(handoff.outcome, "progress");
assert.equal(handoff.end_commit, attestation.stage_a_end_commit);
process.stdout.write(`Verified trusted Stage A attestation for run ${attestation.run_id} at ${expectedCheckpoint}.\n`);
