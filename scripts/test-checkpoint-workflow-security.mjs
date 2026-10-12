#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/vertical-slice-checkpoint.yml", import.meta.url), "utf8");

assert.match(workflow, /issue_comment:[\s\S]*?types: \[created\]/, "privileged checkpoint must be triggered by issue comments, not a caller-selected workflow ref");
assert.match(workflow, /github\.event\.issue\.number == 6/, "only the dedicated checkpoint issue may trigger the workflow");
assert.match(workflow, /github\.event\.comment\.author_association/, "comment author must be trusted");
assert.match(workflow, /startsWith\(github\.event\.comment\.body, '\/checkpoint '\)/, "ordinary issue comments must not start privileged jobs");
assert.match(workflow, /github\.ref == format\('refs\/heads\/\{0\}', github\.event\.repository\.default_branch\)/, "workflow must run from the default branch");
assert.match(workflow, /name: Check out trusted runner from default branch[\s\S]*?ref: \$\{\{ github\.event\.repository\.default_branch \}\}[\s\S]*?persist-credentials: false/, "trusted runner checkout must use default branch without persisting credentials");
assert.match(workflow, /name: Check out task branch as data\/worktree[\s\S]*?ref: \$\{\{ steps\.command\.outputs\.task_branch \}\}[\s\S]*?path: task/, "task branch must be isolated in task/ and treated as data");
assert.match(workflow, /cd task && node \.\.\/scripts\/run-vertical-slice-stage\.mjs/, "runner must execute from trusted checkout, not task branch");
assert.match(workflow, /cd task && node \.\.\/scripts\/validate-runtime-checkpoint\.mjs/, "validator must execute from trusted checkout, not task branch");
assert.match(workflow, /git push origin "HEAD:refs\/heads\/\$TASK_BRANCH"/, "push target must be the parsed task branch");
assert.doesNotMatch(workflow, /node task\/scripts\/(run-vertical-slice-stage|validate-runtime-checkpoint)\.mjs/, "must not execute scripts supplied by task branch");

process.stdout.write("Checkpoint workflow security contract passed: trusted issue-comment trigger and runner/task separation.\n");
