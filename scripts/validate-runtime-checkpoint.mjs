#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const fixture = await readFile("examples/vertical-slice/runtime-fixture.txt", "utf8");
assert.ok(fixture.includes("stage-a-complete"), "Stage A marker is required");
assert.ok(fixture.includes("stage-b-complete"), "Stage B marker is required");
assert.equal(fixture.split("stage-a-complete").length - 1, 1, "Stage A marker must occur exactly once");
assert.equal(fixture.split("stage-b-complete").length - 1, 1, "Stage B marker must occur exactly once");

const names = (await readdir("agent-handoffs/6")).filter((name) => name.endsWith(".json"));
const records = await Promise.all(names.map(async (name) => ({
  name,
  record: JSON.parse(await readFile(join("agent-handoffs/6", name), "utf8"))
})));
assert.equal(records.length, 2, "Exactly two append-only handoff records are expected");
assert.deepEqual(records.map(({ record }) => record.stage).sort(), ["A", "B"]);
for (const { name, record } of records) {
  assert.equal(record.schema_version, 1, `${name}: schema version`);
  assert.equal(record.runner, "actions", `${name}: runner`);
  assert.ok(record.run_id, `${name}: run id`);
  assert.ok(record.issue_url.endsWith("/issues/6"), `${name}: issue URL`);
  assert.ok(["progress", "complete"].includes(record.outcome), `${name}: outcome`);
  assert.match(record.start_commit, /^[0-9a-f]{40}$/);
  assert.match(record.end_commit, /^[0-9a-f]{40}$/);
  execFileSync("git", ["cat-file", "-e", `${record.start_commit}^{commit}`]);
  execFileSync("git", ["cat-file", "-e", `${record.end_commit}^{commit}`]);
}
assert.equal(records.find(({ record }) => record.stage === "A").record.outcome, "progress");
assert.equal(records.find(({ record }) => record.stage === "B").record.outcome, "complete");
assert.equal(records.find(({ record }) => record.stage === "B").record.checkpoint_observed, "stage-a-complete");
process.stdout.write("Runtime checkpoint passed: both markers and unique handoffs exist, and each handoff references real commits.\n");
