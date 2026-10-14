#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/vertical-slice-checkpoint.yml", import.meta.url), "utf8");
const parser = await readFile(new URL("./parse-checkpoint-command.mjs", import.meta.url), "utf8");

assert.match(workflow, /issue_comment:[\s\S]*?types: \[created\]/, "privileged checkpoint must be triggered by issue comments, not a caller-selected workflow ref");
assert.match(workflow, /github\.event\.issue\.number == 6/, "only the dedicated checkpoint issue may trigger the workflow");
assert.match(workflow, /github\.event\.comment\.author_association == 'OWNER'/, "only repository owner association may trigger the privileged workflow");
assert.match(workflow, /github\.event\.comment\.user\.login == 'JonatanGarbuyo'/, "initial pilot must be restricted to the explicitly trusted owner account");
assert.doesNotMatch(workflow, /\["OWNER","COLLABORATOR","MEMBER"\]/, "broad association allowlists must not grant write-token access to members or read-only collaborators");
assert.match(workflow, /startsWith\(github\.event\.comment\.body, '\/checkpoint '\)/, "ordinary issue comments must not start privileged jobs");
assert.match(workflow, /github\.ref == format\('refs\/heads\/\{0\}', github\.event\.repository\.default_branch\)/, "workflow must run from the default branch");
assert.match(workflow, /name: Check out trusted runner from default branch[\s\S]*?ref: \$\{\{ github\.event\.repository\.default_branch \}\}[\s\S]*?persist-credentials: false/, "trusted runner checkout must use default branch without persisting credentials");
assert.match(workflow, /name: Check out task branch as data\/worktree[\s\S]*?ref: \$\{\{ steps\.command\.outputs\.task_branch \}\}[\s\S]*?path: task/, "task branch must be isolated in task/ and treated as data");
assert.match(workflow, /name: Parse and validate checkpoint command[\s\S]*?node scripts\/parse-checkpoint-command\.mjs[\s\S]*?name: Check out task branch/, "the command must be parsed by trusted code before its branch value is used");
assert.match(workflow, /persist-credentials: false/, "the trusted checkout must never persist the write credential");
assert.match(workflow, /git push origin "HEAD:refs\/heads\/\$TASK_BRANCH"/, "the only push must target the parsed task branch, never a caller-provided refspec");
assert.match(parser, /const BRANCH_PATTERN = \/\^test\\\\\/vertical-slice-6\$\//, "the trusted parser must allow only the single disposable pilot branch");
assert.match(parser, /branch=\(test\\\/vertical-slice-6\)/, "the command grammar must reject arbitrary task branches");
assert.match(workflow, /uses: actions\/checkout@[0-9a-f]{40}/, "checkout action must be pinned to a full commit SHA");
assert.match(workflow, /uses: actions\/setup-node@[0-9a-f]{40}/, "setup-node action must be pinned to a full commit SHA");
assert.doesNotMatch(workflow, /uses: actions\/(checkout|setup-node)@v[0-9]+/, "mutable action tags are not allowed in the privileged workflow");
assert.match(workflow, /cd task && node \.\.\/scripts\/run-vertical-slice-stage\.mjs/, "runner must execute from trusted checkout, not task branch");
assert.match(workflow, /cd task && node \.\.\/scripts\/validate-runtime-checkpoint\.mjs/, "validator must execute from trusted checkout, not task branch");
assert.match(workflow, /git push origin "HEAD:refs\/heads\/\$TASK_BRANCH"/, "push target must be the parsed task branch");
assert.doesNotMatch(workflow, /node task\/scripts\/(run-vertical-slice-stage|validate-runtime-checkpoint)\.mjs/, "must not execute scripts supplied by task branch");

process.stdout.write("Checkpoint workflow security contract passed: trusted issue-comment trigger and runner/task separation.\n");
