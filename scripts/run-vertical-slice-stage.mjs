#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [stage, expectedCheckpoint = ""] = process.argv.slice(2);
const runId = process.env.GITHUB_RUN_ID;
const issueUrl = process.env.TASK_ISSUE_URL ?? "https://github.com/JonatanGarbuyo/agents-workflow/issues/6";
const branchName = process.env.TASK_BRANCH ?? process.env.GITHUB_REF_NAME;
const fixturePath = "examples/vertical-slice/runtime-fixture.txt";
const handoffDir = "agent-handoffs/6";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}
function fail(message) {
  process.stderr.write(`Checkpoint rejected: ${message}\n`);
  process.exit(1);
}
async function requirePathType(path, type) {
  let stat;
  try {
    stat = await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
  if (stat.isSymbolicLink() || (type === "directory" ? !stat.isDirectory() : !stat.isFile())) {
    fail(`expected a non-symlink ${type}: ${path}`);
  }
  return true;
}
async function handoffs() {
  const names = await readdir(handoffDir).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  for (const name of names.filter((entry) => entry.endsWith(".json"))) {
    await requirePathType(join(handoffDir, name), "file");
  }
  return names.filter((name) => name.endsWith(".json"));
}

if (!(await requirePathType("examples", "directory"))) fail("required examples directory is missing");
if (!(await requirePathType("examples/vertical-slice", "directory"))) fail("required vertical-slice directory is missing");
if (!(await requirePathType(fixturePath, "file"))) fail("required runtime fixture is missing");
const handoffRootExists = await requirePathType("agent-handoffs", "directory");
if (handoffRootExists) await requirePathType(handoffDir, "directory");

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
    let record;
    try {
      record = JSON.parse(await readFile(join(handoffDir, name), "utf8"));
    } catch {
      fail(`handoff ${name} is not valid JSON`);
    }
    if (record.stage === "A") stageAHandoffs.push({ name, record });
  }
  if (stageAHandoffs.length !== 1) fail(`expected exactly one Stage A handoff, found ${stageAHandoffs.length}`);
  const { name, record: prior } = stageAHandoffs[0];
  if (
    prior.schema_version !== 1 ||
    prior.runner !== "actions" ||
    prior.issue_url !== issueUrl ||
    prior.outcome !== "progress" ||
    !prior.run_id ||
    String(prior.run_id) === String(runId) ||
    !/^[0-9a-f]{40}$/.test(prior.end_commit)
  ) {
    fail(`Stage A handoff ${name} has inconsistent metadata`);
  }
  try {
    git("cat-file", "-e", `${prior.end_commit}^{commit}`);
    git("merge-base", "--is-ancestor", prior.end_commit, head);
  } catch {
    fail("Stage A handoff must reference a real commit in the current checkpoint history");
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
  validation: { command: "checkpoint stage runner and handoff metadata checks", result: "passed" },
  checkpoint_observed: stage === "A" ? "none" : "stage-a-complete",
  next_action: stage === "A" ? "Dispatch a fresh Stage B run with this run's final branch commit SHA as expected_checkpoint." : "Review the two handoffs and confirm cross-runner testing separately."
};
const handoffPath = join(handoffDir, `${timestamp}-actions-${runId}.json`);
await writeFile(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`, { flag: "wx" });
const persistedHandoff = JSON.parse(await readFile(handoffPath, "utf8"));
if (
  persistedHandoff.schema_version !== 1 ||
  persistedHandoff.stage !== stage ||
  persistedHandoff.runner !== "actions" ||
  persistedHandoff.issue_url !== issueUrl ||
  persistedHandoff.run_id !== String(runId) ||
  persistedHandoff.start_commit !== startCommit ||
  persistedHandoff.end_commit !== endCommit ||
  persistedHandoff.validation?.result !== "passed" ||
  !persistedHandoff.next_action
) {
  fail("generated handoff failed its metadata validation");
}
git("add", handoffPath);
git("commit", "-m", `test(vertical-slice): record stage ${stage} handoff`);
process.stdout.write(`Stage ${stage} checkpoint fixture commit: ${endCommit}\n`);
process.stdout.write(`Handoff committed: ${handoffPath}\n`);
process.stdout.write(`Final branch commit (use as Stage B checkpoint when Stage A completes): ${git("rev-parse", "HEAD")}\n`);
