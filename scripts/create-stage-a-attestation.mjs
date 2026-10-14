#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const taskDir = process.env.TASK_WORKTREE ?? "task";
const taskBranch = process.env.TASK_BRANCH;
const runId = process.env.GITHUB_RUN_ID;
const issueUrl = process.env.TASK_ISSUE_URL ?? "https://github.com/JonatanGarbuyo/agents-workflow/issues/6";
const output = process.env.ATTESTATION_OUTPUT;
const handoffDir = join(taskDir, "agent-handoffs/6");

assert.ok(taskBranch === "test/vertical-slice-6", "unexpected task branch");
assert.match(runId ?? "", /^[0-9]+$/, "GITHUB_RUN_ID must be numeric");
assert.ok(output, "ATTESTATION_OUTPUT is required");

const names = (await readdir(handoffDir)).filter((name) => name.endsWith(".json"));
assert.equal(names.length, 1, "Stage A must produce exactly one JSON handoff");
const handoffPath = join(handoffDir, names[0]);
const handoffBytes = await readFile(handoffPath);
const handoff = JSON.parse(handoffBytes.toString("utf8"));
assert.equal(handoff.schema_version, 1);
assert.equal(handoff.stage, "A");
assert.equal(handoff.runner, "actions");
assert.equal(handoff.run_id, String(runId));
assert.equal(handoff.issue_url, issueUrl);
assert.equal(handoff.outcome, "progress");
assert.match(handoff.end_commit, /^[0-9a-f]{40}$/);

const finalBranchSha = execFileSync("git", ["-C", taskDir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
assert.match(finalBranchSha, /^[0-9a-f]{40}$/);
const attestation = {
  schema_version: 1,
  issue_url: issueUrl,
  task_branch: taskBranch,
  run_id: String(runId),
  stage_a_end_commit: handoff.end_commit,
  final_branch_sha: finalBranchSha,
  handoff_file: names[0],
  handoff_sha256: createHash("sha256").update(handoffBytes).digest("hex")
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(attestation, null, 2)}\n`, { flag: "wx" });
process.stdout.write(`Created trusted Stage A attestation for ${taskBranch} at ${finalBranchSha}.\n`);
