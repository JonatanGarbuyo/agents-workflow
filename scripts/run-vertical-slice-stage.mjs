#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [stage, expectedCheckpoint = ""] = process.argv.slice(2);
const runId = process.env.GITHUB_RUN_ID;
const issueUrl = process.env.TASK_ISSUE_URL ?? "https://github.com/JonatanGarbuyo/agents-workflow/issues/6";
const branchName = process.env.GITHUB_REF_NAME;
const fixturePath = "examples/vertical-slice/runtime-fixture.txt";
const handoffDir = "agent-handoffs/6";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}
function fail(message) {
  process.stderr.write(`Checkpoint rejected: ${message}\n`);
  process.exit(1);
}
function handoffs() {
  return readdir(handoffDir).then((names) => names.filter((name) => name.endsWith(".json")));
}

if (!["A", "B"].includes(stage) || !runId || !branchName) {
  fail("expected stage A|B, GITHUB_RUN_ID, and a named task branch");
}
if (branchName === "main" || branchName === "bootstrap/reusable-agent-workflow") {
  fail("refusing to write to a protected/shared development branch; use a dedicated task branch");
}

const head = git("rev-parse", "HEAD");
if (stage === "A") {
  const names = await handoffs().catch(() => []);
  const fixture = await readFile(fixturePath, "utf8");
  if (names.length || fixture.includes("stage-a-complete") || fixture.includes("stage-b-complete")) {
    fail("Stage A requires a pristine fixture and no prior handoffs");
  }
} else {
  if (!/^[0-9a-f]{40}$/.test(expectedCheckpoint)) fail("Stage B requires --expected-checkpoint with a full 40-character SHA");
  if (head !== expectedCheckpoint) fail(`branch HEAD ${head} does not equal expected checkpoint ${expectedCheckpoint}`);
  const fixture = await readFile(fixturePath, "utf8");
  if (!fixture.includes("stage-a-complete")) fail("Stage A marker is missing; refusing to restart from scratch");
  if (fixture.includes("stage-b-complete")) fail("Stage B is already complete");
  const names = await handoffs();
  const stageAHandoffs = [];
  for (const name of names) {
    const record = JSON.parse(await readFile(join(handoffDir, name), "utf8"));
    if (record.stage === "A") stageAHandoffs.push(record);
  }
  if (stageAHandoffs.length !== 1) fail(`expected exactly one Stage A handoff, found ${stageAHandoffs.length}`);
  const prior = stageAHandoffs[0];
  if (prior.outcome !== "progress" || prior.end_commit !== git("log", "-1", "--format=%H", prior.end_commit)) {
    fail("Stage A handoff does not reference a real commit");
  }
}

const startCommit = head;
let fixture = await readFile(fixturePath, "utf8");
const marker = stage === "A" ? "stage-a-complete" : "stage-b-complete";
fixture += `${marker}\n`;
await writeFile(fixturePath, fixture);
git("add", fixturePath);
git("commit", "-m", `test(vertical-slice): complete stage ${stage}`);
const endCommit = git("rev-parse", "HEAD");

await mkdir(handoffDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const handoff = {
  schema_version: 1,
  issue_url: issueUrl,
  stage,
  runner: "actions",
  run_id: String(runId),
  started_at: new Date().toISOString(),
  outcome: stage === "A" ? "progress" : "complete",
  start_commit: startCommit,
  end_commit: endCommit,
  changed_files: [fixturePath],
  validation: { command: `node scripts/run-vertical-slice-stage.mjs ${stage}`, result: "passed" },
  checkpoint_observed: stage === "A" ? "none" : "stage-a-complete",
  next_action: stage === "A" ? "Dispatch a fresh Stage B run with this run's final branch commit SHA as expected_checkpoint." : "Review the two handoffs and confirm cross-runner testing separately."
};
const handoffPath = join(handoffDir, `${timestamp}-actions-${runId}.json`);
await writeFile(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`);
git("add", handoffPath);
git("commit", "-m", `test(vertical-slice): record stage ${stage} handoff`);
process.stdout.write(`Stage ${stage} checkpoint fixture commit: ${endCommit}\n`);
process.stdout.write(`Handoff committed: ${handoffPath}\n`);
process.stdout.write(`Final branch commit (use as Stage B checkpoint when Stage A completes): ${git("rev-parse", "HEAD")}\n`);
