#!/usr/bin/env node
import { appendFile } from "node:fs/promises";

const BRANCH_PATTERN = /^test\/vertical-slice-[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;

export function parseCheckpointCommand(body) {
  const match = /^\/checkpoint stage=(A|B) branch=(test\/vertical-slice-[A-Za-z0-9][A-Za-z0-9._/-]*)(?: expected=([0-9a-f]{40}))?$/.exec(body.trim());
  if (!match) {
    throw new Error("Use exactly: /checkpoint stage=A branch=test/vertical-slice-6 OR /checkpoint stage=B branch=test/vertical-slice-6 expected=<40-character-checkpoint-sha>");
  }

  const [, stage, taskBranch, expectedCheckpoint = ""] = match;
  if (
    !BRANCH_PATTERN.test(taskBranch) ||
    taskBranch.includes("..") ||
    taskBranch.includes("//") ||
    taskBranch.includes("@{") ||
    taskBranch.endsWith("/") ||
    taskBranch.endsWith(".") ||
    taskBranch.split("/").some((part) => part.endsWith(".lock"))
  ) {
    throw new Error("Invalid task branch name");
  }
  if (stage === "A" && expectedCheckpoint) {
    throw new Error("Stage A must not include expected=<sha>");
  }
  if (stage === "B" && !SHA_PATTERN.test(expectedCheckpoint)) {
    throw new Error("Stage B requires expected=<40-character-checkpoint-sha>");
  }

  return { stage, taskBranch, expectedCheckpoint };
}

if (process.env.GITHUB_OUTPUT) {
  const { stage, taskBranch, expectedCheckpoint } = parseCheckpointCommand(process.env.COMMENT_BODY ?? "");
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `stage=${stage}\ntask_branch=${taskBranch}\nexpected_checkpoint=${expectedCheckpoint}\n`
  );
  process.stdout.write(`Accepted Stage ${stage} command for ${taskBranch}.\n`);
}
