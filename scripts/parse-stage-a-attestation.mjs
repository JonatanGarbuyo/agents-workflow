#!/usr/bin/env node
import assert from "node:assert/strict";
import { appendFile, readFile, readdir, lstat } from "node:fs/promises";
import { join } from "node:path";

const taskDir = process.env.TASK_WORKTREE ?? "task";
const output = process.env.GITHUB_OUTPUT;
const issueUrl = process.env.TASK_ISSUE_URL ?? "https://github.com/JonatanGarbuyo/agents-workflow/issues/6";
const handoffDir = join(taskDir, "agent-handoffs/6");

assert.ok(output, "GITHUB_OUTPUT is required");
for (const path of [join(taskDir, "agent-handoffs"), handoffDir]) {
  const stat = await lstat(path);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), `unsafe handoff directory: ${path}`);
}
const names = (await readdir(handoffDir)).filter((name) => name.endsWith(".json"));
assert.equal(names.length, 1, "expected exactly one Stage A handoff");
const handoffPath = join(handoffDir, names[0]);
const stat = await lstat(handoffPath);
assert.ok(stat.isFile() && !stat.isSymbolicLink(), "Stage A handoff must be a regular file");
const handoff = JSON.parse(await readFile(handoffPath, "utf8"));
assert.equal(handoff.schema_version, 1);
assert.equal(handoff.stage, "A");
assert.equal(handoff.runner, "actions");
assert.equal(handoff.issue_url, issueUrl);
assert.equal(handoff.outcome, "progress");
assert.match(String(handoff.run_id ?? ""), /^[0-9]+$/);
assert.match(handoff.end_commit ?? "", /^[0-9a-f]{40}$/);
await appendFile(output, `stage_a_run_id=${handoff.run_id}\nstage_a_handoff_file=${names[0]}\n`);
process.stdout.write(`Parsed Stage A artifact reference for run ${handoff.run_id}.\n`);
