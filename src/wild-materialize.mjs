// Materialize one WILD case — a REAL suspec-cli commit — as a throwaway git workspace and run it
// through the PUBLIC `suspec review --json` contract. Like the synthetic materializer, this NEVER
// imports suspec-cli's Core: it shells out to the `suspec` binary AND reads the real commit's file
// blobs out of the suspec-cli git history with `git -C <repo> show`. It does NOT seed faults — the
// change set is the real diff of a real commit, and no expected facts are declared (the wild tier is
// descriptive; the owner judges each surfaced fact afterward).
//
// The recipe (the faithful-materialization recipe from SPEC-review-gate-benchmark AC-003):
//   1. mkdtemp a throwaway dir, `git init`, set a committer identity.
//   2. `suspec init` scaffolds the workspace.
//   3. Write specs/<slug>/spec.md (status: ready) + tasks/<taskStem>.md — the case's spec + the
//      single-repo-adapted REAL task packet (bare src/... paths; the real ## Scope / ## Do not change
//      / ## Affected areas / ## Run summary).
//   4. For every file the real commit CHANGED, write its PARENT version (`git show <sha>^:<path>`,
//      empty if the file was ADDED) into the base; git add -A && git commit. BASE = current branch.
//   5. `suspec worktree create <slug> --task <taskStem>` → .worktrees/<slug>~<taskStem>. Into the
//      worktree write each changed file's NEW version (`git show <sha>:<path>`, delete if REMOVED);
//      git add -A && git commit there. This reproduces the REAL diff of the commit against base —
//      committed, so the three-dot diff lists individual files (the untracked-dir-collapse gotcha).
//   6. From the workspace root: `suspec review <taskStem> --base <BASE> --json` → the ReviewReport.
//
// Per case we record the RAW facts the gate surfaced (every coverage/verifyBinding/scopeDivergence/
// selfReport/doNotChangeTouched/emptyEvidencePassRow/packetStructural entry with its id/kind),
// hasReviewPacket, level, the diffChangedFiles, and a sanity-check count: diffChangedFiles.length vs
// the real commit's changed-file count (did the materialization reproduce the change?).

import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";

/** Run a command, throw with captured output on a disallowed exit. */
function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
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
 * Read a blob from the source repo at a git ref. `git show <ref>:<path>`. Returns '' for a path that
 * does not exist at that ref (e.g. the parent of an ADDED file) — exit 128 with the expected error.
 */
function showBlob(repo, ref, path) {
  const res = spawnSync("git", ["-C", repo, "show", `${ref}:${path}`], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.status === 0) return res.stdout;
  // Missing path at that ref: git exits 128 with "exists on disk, but not in" / "does not exist".
  const stderr = res.stderr ?? "";
  if (
    res.status === 128 &&
    /does not exist|exists on disk|Path '.*' does not exist/i.test(stderr)
  ) {
    return "";
  }
  throw new Error(
    `git show ${ref}:${path} (in ${repo}) exited ${res.status}: ${stderr}`,
  );
}

/**
 * The RAW fact report for a wild case — NO pass/fail, NO expected facts. Every surfaced fact is
 * recorded with its class + id/kind so the owner can judge real-issue vs noise. Also a flat
 * normalized string list (same vocabulary as the synthetic tier) for terse display.
 */
export function rawFactReport(report) {
  const facts = [];
  const flat = [];
  const push = (kind, detail) => {
    facts.push({ kind, ...detail });
  };

  for (const c of report.coverage ?? []) {
    push("coverage", { coverageKind: c.kind, id: c.id, message: c.message });
    flat.push(
      `coverage${c.kind === "orphan" ? "Orphan" : "Uncovered"}:${c.id}`,
    );
  }
  for (const v of report.verifyBinding ?? []) {
    push("verifyBinding", {
      bindingKind: v.kind,
      id: v.id,
      message: v.message,
    });
    flat.push(`verifyBinding:${v.kind}:${v.id}`);
  }
  for (const id of report.scopeDivergence ?? []) {
    push("scopeDivergence", { id });
    flat.push(`scopeDivergence:${id}`);
  }
  const sr = report.selfReport ?? {};
  for (const f of sr.claimedNotInDiff ?? []) {
    push("claimedNotInDiff", { file: f });
    flat.push(`claimedNotInDiff:${f}`);
  }
  for (const f of sr.inDiffNotClaimed ?? []) {
    push("inDiffNotClaimed", { file: f });
    flat.push(`inDiffNotClaimed:${f}`);
  }
  for (const f of sr.outsideScope ?? []) {
    push("outsideScope", { file: f });
    flat.push(`outsideScope:${f}`);
  }
  for (const f of report.doNotChangeTouched ?? []) {
    push("doNotChangeTouched", { file: f });
    flat.push(`doNotChangeTouched:${f}`);
  }
  for (const id of report.emptyEvidencePassRows ?? []) {
    push("emptyEvidencePassRow", { id });
    flat.push(`emptyEvidencePassRow:${id}`);
  }
  const ps = report.packetStructural ?? {};
  for (const cell of ps.badResultCells ?? []) {
    push("badResultCell", { cell });
    flat.push(`badResultCell:${cell}`);
  }
  if (ps.badStatus) {
    push("badStatus", { badStatus: ps.badStatus });
    flat.push(`badStatus:${ps.badStatus}`);
  }
  if (ps.statusPassContradicted) {
    push("statusPassContradicted", {});
    flat.push("statusPassContradicted");
  }
  for (const s of ps.missingSections ?? []) {
    push("missingSection", { section: s });
    flat.push(`missingSection:${s}`);
  }

  return { facts, flat: [...new Set(flat)].sort() };
}

/**
 * Materialize a wild case and run it through `suspec review --json`. Returns:
 *   { report, raw, level, hasReviewPacket, diffChangedFiles, diffChangedCount, commitFileCount,
 *     reproduced, reviewExit, workDir, base }
 * where `raw` is { facts, flat } (rawFactReport), `commitFileCount` is the real commit's changed-file
 * count, and `reproduced` is diffChangedCount === commitFileCount (the materialization sanity check).
 * Throws on any materialization/review failure (the caller records the error per case).
 */
export function materializeAndReviewWild(
  wildCase,
  suspecBin,
  benchRoot,
  { keep = false } = {},
) {
  const repo = resolve(benchRoot, wildCase.sourceCommit.repo);
  const sha = wildCase.sourceCommit.sha;
  const changed = wildCase.changedFiles ?? [];

  const work = mkdtempSync(join(tmpdir(), "suspec-bench-wild-"));
  try {
    // 1. init + committer identity
    git(work, "init", "-q");
    git(work, "config", "user.email", "bench@suspec-bench.local");
    git(work, "config", "user.name", "suspec-bench");

    // 2. scaffold the workspace
    run("node", [suspecBin, "init"], { cwd: work });

    // 3. spec + adapted task packet
    writeRelative(work, join("specs", wildCase.slug, "spec.md"), wildCase.spec);
    writeRelative(
      work,
      join("tasks", `${wildCase.taskStem}.md`),
      wildCase.task,
    );

    // 4. base: every changed file's PARENT (<sha>^) version (empty for an ADDED file)
    for (const f of changed) {
      const parent = showBlob(repo, `${sha}^`, f.path);
      // An ADDED file has no parent blob → write empty so the diff records the add.
      writeRelative(work, f.path, parent);
    }
    git(work, "add", "-A");
    git(work, "commit", "-qm", "base");
    const base = git(work, "rev-parse", "--abbrev-ref", "HEAD").stdout.trim();

    // 5. worktree + the NEW (<sha>) version of each changed file (delete a REMOVED file)
    run(
      "node",
      [
        suspecBin,
        "worktree",
        "create",
        wildCase.slug,
        "--task",
        wildCase.taskStem,
      ],
      {
        cwd: work,
      },
    );
    const wt = join(
      work,
      ".worktrees",
      `${wildCase.slug}~${wildCase.taskStem}`,
    );
    for (const f of changed) {
      if (f.status === "D") {
        const full = join(wt, f.path);
        if (existsSync(full)) unlinkSync(full);
        continue;
      }
      const next = showBlob(repo, sha, f.path);
      writeRelative(wt, f.path, next);
    }
    git(wt, "add", "-A");
    git(wt, "commit", "-qm", "change");

    // 6. the public review contract. exit 0 (clean) or 1 (warnings) are both valid; 2 is an error.
    const res = run(
      "node",
      [suspecBin, "review", wildCase.taskStem, "--base", base, "--json"],
      {
        cwd: work,
        allowExit: [0, 1],
      },
    );
    const report = JSON.parse(res.stdout.trim());
    const raw = rawFactReport(report);
    const diffChangedFiles = report.diffChangedFiles ?? [];
    const diffChangedCount = diffChangedFiles.length;
    const commitFileCount = changed.length;

    const result = {
      report,
      raw,
      level: report.level,
      hasReviewPacket: report.hasReviewPacket,
      diffChangedFiles,
      diffChangedCount,
      commitFileCount,
      reproduced: diffChangedCount === commitFileCount,
      reviewExit: res.status,
      workDir: work,
      base,
    };
    if (!keep) rmSync(work, { recursive: true, force: true });
    return result;
  } catch (e) {
    if (!keep) rmSync(work, { recursive: true, force: true });
    throw e;
  }
}
