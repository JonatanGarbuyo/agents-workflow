#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/vertical-slice-checkpoint.yml", import.meta.url), "utf8");

assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/, "dispatch must be constrained to main");
assert.match(workflow, /name: Check out trusted runner from main[\s\S]*?ref: main[\s\S]*?persist-credentials: false/, "trusted runner checkout must use main without persisting its credentials");
assert.match(workflow, /name: Check out task branch as data\/worktree[\s\S]*?ref: \$\{\{ inputs\.task_branch \}\}[\s\S]*?path: task/, "task branch must be isolated in task/ and treated as data");
assert.match(workflow, /cd task && node \.\.\/scripts\/run-vertical-slice-stage\.mjs/, "runner must execute from trusted checkout, not task branch");
assert.match(workflow, /cd task && node \.\.\/scripts\/validate-runtime-checkpoint\.mjs/, "validator must execute from trusted checkout, not task branch");
assert.match(workflow, /git push origin "HEAD:refs\/heads\/\$TASK_BRANCH"/, "push target must be the validated task branch");
assert.doesNotMatch(workflow, /node task\/scripts\/(run-vertical-slice-stage|validate-runtime-checkpoint)\.mjs/, "must not execute scripts supplied by task branch");

process.stdout.write("Checkpoint workflow security contract passed: trusted runner and task data are separated.\n");
