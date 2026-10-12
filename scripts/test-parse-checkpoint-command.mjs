#!/usr/bin/env node
import assert from "node:assert/strict";
import { parseCheckpointCommand } from "./parse-checkpoint-command.mjs";

const stageA = parseCheckpointCommand("/checkpoint stage=A branch=test/vertical-slice-6");
assert.deepEqual(stageA, {
  stage: "A",
  taskBranch: "test/vertical-slice-6",
  expectedCheckpoint: ""
});

const sha = "a".repeat(40);
const stageB = parseCheckpointCommand(`/checkpoint stage=B branch=test/vertical-slice-6 expected=${sha}`);
assert.deepEqual(stageB, {
  stage: "B",
  taskBranch: "test/vertical-slice-6",
  expectedCheckpoint: sha
});

for (const invalid of [
  "/checkpoint stage=A branch=main",
  "/checkpoint stage=A branch=test/vertical-slice-6 expected=" + sha,
  "/checkpoint stage=B branch=test/vertical-slice-6",
  "/checkpoint stage=B branch=test/vertical-slice-6 expected=deadbeef",
  "/checkpoint stage=A branch=test/vertical-slice-../../main",
  "/checkpoint stage=A branch=test/vertical-slice-foo..bar",
  "/checkpoint stage=A branch=test/vertical-slice-foo//bar",
  "/checkpoint stage=A branch=test/vertical-slice-foo.lock"
]) {
  assert.throws(() => parseCheckpointCommand(invalid), undefined, `must reject: ${invalid}`);
}

process.stdout.write("Checkpoint command parser passed positive and negative cases.\n");
