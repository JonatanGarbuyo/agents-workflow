#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const required = [
  "schema_version", "issue_url", "stage", "runner", "run_id", "started_at",
  "outcome", "start_commit", "end_commit", "changed_files", "validation",
  "checkpoint_observed", "next_action",
];

function validateHandoff(handoff, stage, fixtureText) {
  const errors = [];
  for (const key of required) {
    if (!(key in handoff)) errors.push(`missing required field: ${key}`);
  }

  if (handoff.schema_version !== 1) errors.push("schema_version must be 1");
  if (!/^https:\/\/github\.com\/.+\/issues\/\d+$/.test(handoff.issue_url ?? "")) {
    errors.push("issue_url must be a GitHub issue URL");
  }
  if (handoff.stage !== stage) errors.push(`handoff stage must be ${stage}`);
  if (!["actions", "opencode"].includes(handoff.runner)) errors.push("runner must be actions or opencode");
  if (typeof handoff.run_id !== "string" || !handoff.run_id.trim()) errors.push("run_id must be non-empty");
  if (Number.isNaN(Date.parse(handoff.started_at))) errors.push("started_at must be a date-time");
  if (!["progress", "blocked", "complete"].includes(handoff.outcome)) errors.push("invalid outcome");
  if (!/^[0-9a-f]{7,40}$/.test(handoff.start_commit ?? "")) errors.push("invalid start_commit");
  if (!/^[0-9a-f]{7,40}$/.test(handoff.end_commit ?? "")) errors.push("invalid end_commit");
  if (!Array.isArray(handoff.changed_files) || handoff.changed_files.some((path) => typeof path !== "string" || !path.trim())) {
    errors.push("changed_files must be an array of non-empty paths");
  }
  if (!handoff.validation || typeof handoff.validation.command !== "string" ||
      !["passed", "failed", "not_run"].includes(handoff.validation.result)) {
    errors.push("validation must contain command and a valid result");
  }
  if (typeof handoff.next_action !== "string" || !handoff.next_action.trim()) {
    errors.push("next_action must be non-empty");
  }

  const hasA = fixtureText.includes("stage-a-complete");
  const hasB = fixtureText.includes("stage-b-complete");
  if (stage === "A") {
    if (!hasA || hasB) errors.push("stage A fixture must contain only the stage A marker");
    if (handoff.outcome !== "progress") errors.push("stage A outcome must be progress");
    if (handoff.checkpoint_observed !== "none") errors.push("stage A must start without a prior checkpoint");
  } else if (stage === "B") {
    if (!hasA || !hasB) errors.push("stage B fixture must contain both stage markers");
    if (handoff.outcome !== "complete") errors.push("stage B outcome must be complete");
    if (handoff.checkpoint_observed !== "stage-a-complete") errors.push("stage B must report observing stage A checkpoint");
  } else {
    errors.push("stage must be A or B");
  }

  return errors;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) {
    const a = await readFile(resolve(root, "examples/vertical-slice/fixture-stage-a.txt"), "utf8");
    const b = await readFile(resolve(root, "examples/vertical-slice/fixture-stage-b.txt"), "utf8");
    const handoffA = await readJson("examples/vertical-slice/handoff-stage-a.json");
    const handoffB = await readJson("examples/vertical-slice/handoff-stage-b.json");

    assert.deepEqual(validateHandoff(handoffA, "A", a), [], "valid stage A fixture should pass");
    assert.deepEqual(validateHandoff(handoffB, "B", b), [], "valid stage B fixture should pass");

    const missingField = { ...handoffA };
    delete missingField.next_action;
    assert.ok(validateHandoff(missingField, "A", a).some((error) => error.includes("next_action")));

    assert.ok(validateHandoff(handoffA, "B", a).length > 0, "stale stage A handoff must fail as stage B");
    assert.ok(validateHandoff(handoffB, "B", a).some((error) => error.includes("both stage markers")));

    process.stdout.write("Self-test passed: valid stages accepted; missing fields and stale/incomplete checkpoints rejected.\n");
    return;
  }

  const stageIndex = args.indexOf("--stage");
  const stage = stageIndex >= 0 ? args[stageIndex + 1] : undefined;
  if (!["A", "B"].includes(stage)) {
    process.stderr.write("Usage: node scripts/validate-vertical-slice.mjs --stage A|B [--self-test]\n");
    process.exitCode = 2;
    return;
  }

  const fixturePath = `examples/vertical-slice/fixture-stage-${stage.toLowerCase()}.txt`;
  const handoffPath = `examples/vertical-slice/handoff-stage-${stage.toLowerCase()}.json`;
  const fixtureText = await readFile(resolve(root, fixturePath), "utf8");
  const handoff = await readJson(handoffPath);
  const errors = validateHandoff(handoff, stage, fixtureText);

  if (errors.length) {
    process.stderr.write(errors.map((error) => `- ${error}`).join("\n") + "\n");
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`Stage ${stage} fixture and handoff are valid.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
