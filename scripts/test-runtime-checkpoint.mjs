#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile, readdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const runnerSource = await readFile(join(repoRoot, "scripts/run-vertical-slice-stage.mjs"), "utf8");
const validatorSource = await readFile(join(repoRoot, "scripts/validate-runtime-checkpoint.mjs"), "utf8");
const fixtureSource = await readFile(join(repoRoot, "examples/vertical-slice/runtime-fixture.txt"), "utf8");
const issueUrl = "https://github.com/JonatanGarbuyo/agents-workflow/issues/6";

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

async function setup() {
  const cwd = await mkdtemp(join(tmpdir(), "vertical-slice-checkpoint-"));
  await mkdir(join(cwd, "scripts"), { recursive: true });
  await mkdir(join(cwd, "examples/vertical-slice"), { recursive: true });
  await writeFile(join(cwd, "scripts/run-vertical-slice-stage.mjs"), runnerSource);
  await writeFile(join(cwd, "scripts/validate-runtime-checkpoint.mjs"), validatorSource);
  await writeFile(join(cwd, "examples/vertical-slice/runtime-fixture.txt"), fixtureSource);
  git(cwd, "init", "-b", "test/vertical-slice-test");
  git(cwd, "config", "user.name", "Checkpoint test");
  git(cwd, "config", "user.email", "checkpoint-test@example.invalid");
  git(cwd, "add", ".");
  git(cwd, "commit", "-m", "test: initialize pristine fixture");
  return cwd;
}

function runStage(cwd, stage, runId, checkpoint = "") {
  const args = ["scripts/run-vertical-slice-stage.mjs", stage];
  if (stage === "B") args.push(checkpoint);
  return spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_RUN_ID: String(runId),
      GITHUB_REF_NAME: "test/vertical-slice-test",
      TASK_ISSUE_URL: issueUrl,
    },
  });
}

function expectRejected(result, label) {
  assert.notEqual(result.status, 0, `${label}: expected rejection, got success\n${result.stdout}`);
  assert.match(result.stderr, /Checkpoint rejected:/, `${label}: expected a checkpoint rejection\n${result.stderr}`);
}

async function stageA(cwd, runId = "100") {
  const result = runStage(cwd, "A", runId);
  assert.equal(result.status, 0, `Stage A should pass\n${result.stderr}`);
  const match = result.stdout.match(/Final branch commit .*: ([0-9a-f]{40})/);
  assert.ok(match, `Stage A should print its final checkpoint SHA\n${result.stdout}`);
  return match[1];
}

const workdirs = [];
try {
  // Happy path: a fresh Stage B execution resumes from the exact Stage A branch tip.
  const happy = await setup();
  workdirs.push(happy);
  const checkpoint = await stageA(happy);
  const stale = runStage(happy, "B", "200", git(happy, "rev-parse", "HEAD~1"));
  expectRejected(stale, "stale checkpoint");
  const resumed = runStage(happy, "B", "201", checkpoint);
  assert.equal(resumed.status, 0, `fresh Stage B should resume successfully\n${resumed.stderr}`);
  const validation = spawnSync(process.execPath, ["scripts/validate-runtime-checkpoint.mjs"], { cwd: happy, encoding: "utf8" });
  assert.equal(validation.status, 0, `final checkpoint state should validate\n${validation.stderr}`);
  expectRejected(runStage(happy, "B", "202", git(happy, "rev-parse", "HEAD")), "repeated Stage B");

  // Missing handoff: preserve the Stage A marker but remove its report and commit that state.
  const missing = await setup();
  workdirs.push(missing);
  await stageA(missing, "300");
  const files = await readdir(join(missing, "agent-handoffs/6"));
  assert.equal(files.filter((name) => name.endsWith(".json")).length, 1);
  await rm(join(missing, "agent-handoffs/6", files.find((name) => name.endsWith(".json"))));
  git(missing, "add", "-A");
  git(missing, "commit", "-m", "test: remove required handoff");
  const missingResult = runStage(missing, "B", "301", git(missing, "rev-parse", "HEAD"));
  expectRejected(missingResult, "missing Stage A handoff");

  // A task branch must not redirect a trusted write through a symlinked fixture path.
  const symlinked = await setup();
  workdirs.push(symlinked);
  const fixtureSymlink = join(symlinked, "examples/vertical-slice/runtime-fixture.txt");
  const outsideFile = join(symlinked, "outside.txt");
  await writeFile(outsideFile, "outside sentinel\\n");
  await rm(fixtureSymlink);
  await symlink(outsideFile, fixtureSymlink);
  const symlinkResult = runStage(symlinked, "A", "350");
  expectRejected(symlinkResult, "symlinked fixture");
  assert.equal(await readFile(outsideFile, "utf8"), "outside sentinel\\n", "symlink target must not be modified");

  // Missing Stage A marker must also fail closed even if the supplied SHA is current.
  const noMarker = await setup();
  workdirs.push(noMarker);
  await stageA(noMarker, "400");
  const fixturePath = join(noMarker, "examples/vertical-slice/runtime-fixture.txt");
  await writeFile(fixturePath, fixtureSource);
  git(noMarker, "add", fixturePath);
  git(noMarker, "commit", "-m", "test: remove Stage A marker");
  expectRejected(runStage(noMarker, "B", "401", git(noMarker, "rev-parse", "HEAD")), "missing Stage A marker");

  // Stage A must fail closed if an existing handoff path is a symlink.
  const symlinkHandoff = await setup();
  workdirs.push(symlinkHandoff);
  await mkdir(join(symlinkHandoff, "agent-handoffs/6"), { recursive: true });
  const handoffTarget = join(symlinkHandoff, "outside-handoff.json");
  await writeFile(handoffTarget, "{}\\n");
  await symlink(handoffTarget, join(symlinkHandoff, "agent-handoffs/6/attacker.json"));
  expectRejected(runStage(symlinkHandoff, "A", "375"), "symlinked pre-existing handoff");
  assert.equal(await readFile(handoffTarget, "utf8"), "{}\\n", "symlinked handoff target must not be modified");

  process.stdout.write("Runtime checkpoint tests passed: fresh-run resume, stale SHA, repeated Stage B, missing handoff, missing marker, and symlink rejection.\n");
} finally {
  await Promise.all(workdirs.map((cwd) => rm(cwd, { recursive: true, force: true })));
}
