// Materialize one seeded case as a throwaway git workspace and run it through the PUBLIC
// `suspec review --json` contract. This module NEVER imports suspec-cli's Core — it only shells out to
// the `suspec` binary (the ADR-0085 posture: consume the published `--json` surface, not the library).
//
// The recipe (validated against the real binary):
//   1. mkdtemp a throwaway dir, `git init`, set a committer identity.
//   2. `suspec init` scaffolds the workspace (specs/ tasks/ reviews/ ...).
//   3. Write specs/<slug>/spec.md, tasks/<taskStem>.md, optional reviews/<taskStem>.md, and the
//      case's baseFiles.
//   4. git add -A && git commit  (the base commit; BASE = the current branch, normally `main`).
//   5. `suspec worktree create <slug> --task <taskStem>` → .worktrees/<slug>~<taskStem>.
//   6. Apply the change set IN the worktree and COMMIT it there. (Gotcha: an UNCOMMITTED new file in a
//      new directory collapses to the parent dir name in `git diff --name-only` — git reports the
//      untracked directory, not the files — which breaks per-file fact matching. Committing makes the
//      three-dot diff list individual files.)
//   7. From the workspace root: `suspec review <taskStem> --base <BASE> --json` → the ReviewReport JSON.

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

/** Run a command, throw with captured output on non-zero exit (unless allowed exit codes given). */
function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  const allowed = opts.allowExit ?? [0];
  if (res.error) {
    throw new Error(
      `${cmd} ${args.join(" ")} failed to spawn: ${res.error.message}`,
    );
  }
  if (!allowed.includes(res.status)) {
    throw new Error(
      `${cmd} ${args.join(" ")} exited ${res.status}\n--- stdout ---\n${res.stdout}\n--- stderr ---\n${res.stderr}`,
    );
  }
  return res;
}

function git(cwd, ...args) {
  return run("git", ["-C", cwd, ...args]);
}

function writeRelative(root, relPath, content) {
  const full = join(root, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

/**
 * Normalize a raw ReviewReport JSON object into a flat, sorted set of fact strings of the form
 * `<class>:<key>`. This is the canonical fact vocabulary the fixture set declares against. A fact is
 * surfaced by the gate iff its string appears here. coverageUncovered fires whenever
 * hasReviewPacket is false (every in-scope AC then reads uncovered), so a truly-clean case needs a
 * covering review packet — see the clean cases.
 */
export function normalizeFacts(report) {
  const facts = [];
  for (const c of report.coverage ?? []) {
    facts.push(
      `coverage${c.kind === "orphan" ? "Orphan" : "Uncovered"}:${c.id}`,
    );
  }
  for (const v of report.verifyBinding ?? []) {
    facts.push(`verifyBinding:${v.kind}:${v.id}`);
  }
  for (const id of report.scopeDivergence ?? []) {
    facts.push(`scopeDivergence:${id}`);
  }
  const sr = report.selfReport ?? {};
  for (const f of sr.claimedNotInDiff ?? [])
    facts.push(`claimedNotInDiff:${f}`);
  for (const f of sr.inDiffNotClaimed ?? [])
    facts.push(`inDiffNotClaimed:${f}`);
  for (const f of sr.outsideScope ?? []) facts.push(`outsideScope:${f}`);
  for (const f of report.doNotChangeTouched ?? [])
    facts.push(`doNotChangeTouched:${f}`);
  for (const id of report.emptyEvidencePassRows ?? [])
    facts.push(`emptyEvidencePassRow:${id}`);
  const ps = report.packetStructural ?? {};
  for (const cell of ps.badResultCells ?? [])
    facts.push(`badResultCell:${cell}`);
  if (ps.badStatus) facts.push(`badStatus:${ps.badStatus}`);
  if (ps.statusPassContradicted) facts.push("statusPassContradicted");
  for (const s of ps.missingSections ?? []) facts.push(`missingSection:${s}`);
  return [...new Set(facts)].sort();
}

/**
 * Materialize a case and return { report, facts, workDir, reviewExit }.
 * Caller is responsible for cleanup unless { keep:false } (default cleans on success).
 */
export function materializeAndReview(
  testCase,
  suspecBin,
  { keep = false } = {},
) {
  const work = mkdtempSync(join(tmpdir(), "suspec-bench-"));
  try {
    git(work, "init", "-q");
    // committer identity (the recipe requires it for the base + change commits)
    git(work, "config", "user.email", "bench@suspec-bench.local");
    git(work, "config", "user.name", "suspec-bench");

    // 2. scaffold the workspace
    run("node", [suspecBin, "init"], { cwd: work });

    // 3. write spec, task, optional review packet, base files
    writeRelative(work, join("specs", testCase.slug, "spec.md"), testCase.spec);
    writeRelative(
      work,
      join("tasks", `${testCase.taskStem}.md`),
      testCase.task,
    );
    if (testCase.reviewPacket) {
      writeRelative(
        work,
        join("reviews", `${testCase.taskStem}.md`),
        testCase.reviewPacket,
      );
    }
    for (const [rel, content] of Object.entries(testCase.baseFiles ?? {})) {
      writeRelative(work, rel, content);
    }

    // 4. base commit
    git(work, "add", "-A");
    git(work, "commit", "-qm", "base");
    const base = git(work, "rev-parse", "--abbrev-ref", "HEAD").stdout.trim();

    // 5. create the worktree
    run(
      "node",
      [
        suspecBin,
        "worktree",
        "create",
        testCase.slug,
        "--task",
        testCase.taskStem,
      ],
      { cwd: work },
    );
    const wt = join(
      work,
      ".worktrees",
      `${testCase.slug}~${testCase.taskStem}`,
    );

    // 6. apply the change set IN the worktree and COMMIT it there (the untracked-dir-collapse gotcha)
    for (const [rel, content] of Object.entries(testCase.changeSet ?? {})) {
      writeRelative(wt, rel, content);
    }
    git(wt, "add", "-A");
    git(wt, "commit", "-qm", "change");

    // 7. run the public review contract. exit 0 (clean) or 1 (warnings) are both valid; 2 is an error.
    const res = run(
      "node",
      [suspecBin, "review", testCase.taskStem, "--base", base, "--json"],
      {
        cwd: work,
        allowExit: [0, 1],
      },
    );
    const report = JSON.parse(res.stdout.trim());
    const facts = normalizeFacts(report);
    const result = {
      report,
      facts,
      workDir: work,
      reviewExit: res.status,
      base,
    };
    if (!keep) rmSync(work, { recursive: true, force: true });
    return result;
  } catch (e) {
    if (!keep) rmSync(work, { recursive: true, force: true });
    throw e;
  }
}
