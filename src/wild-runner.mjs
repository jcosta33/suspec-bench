#!/usr/bin/env node
// The WILD runner (SPEC-review-gate-benchmark AC-003). Loads each wild/<case>/case.json — a REAL
// corpus-cli commit paired with a single-repo-adapted real task packet — materializes it as a
// throwaway git workspace, runs it through the PUBLIC `corpus review --json` contract (never importing
// corpus-cli's Core, the ADR-0085 posture), and emits a per-case RAW fact report.
//
// The wild tier is DESCRIPTIVE: there are NO declared expected facts and NO pass/fail. Wild changes
// have no seeded ground truth, so the runner records what the gate surfaced (verbatim, with each
// fact's id/kind), the level, and a materialization sanity check (diffChangedFiles count vs the real
// commit's changed-file count). The OWNER judges each surfaced fact (real-issue vs noise) afterward.
//
// Usage:
//   node src/wild-runner.mjs            run every wild case, print the per-case raw fact report
//   node src/wild-runner.mjs --json     emit the machine-readable raw report as JSON
//   node src/wild-runner.mjs --keep     keep the throwaway workspaces (debugging)

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { materializeAndReviewWild } from "./wild-materialize.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const WILD_DIR = join(ROOT, "wild");

function resolveCorpusBin() {
  if (process.env.CORPUS_BIN) return resolve(process.env.CORPUS_BIN);
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const rel = pkg.corpusBench?.corpusBin ?? "../corpus-cli/bin/corpus.js";
  return resolve(ROOT, rel);
}

/** Load every wild/<case>/case.json. Asserts the materialization fields are present. */
function loadWildCases(dir = WILD_DIR) {
  if (!existsSync(dir)) throw new Error(`wild directory not found: ${dir}`);
  const names = readdirSync(dir)
    .filter((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() && existsSync(join(p, "case.json"));
    })
    .sort();
  if (names.length === 0) throw new Error(`no wild cases under ${dir}`);

  const cases = [];
  for (const name of names) {
    const c = JSON.parse(readFileSync(join(dir, name, "case.json"), "utf8"));
    for (const field of ["slug", "taskStem", "spec", "task"]) {
      if (typeof c[field] !== "string" || c[field].trim() === "") {
        throw new Error(
          `wild case '${name}': case.json missing required field '${field}'`,
        );
      }
    }
    if (!c.sourceCommit?.sha || !c.sourceCommit?.repo) {
      throw new Error(
        `wild case '${name}': case.json missing sourceCommit.{sha,repo}`,
      );
    }
    if (!Array.isArray(c.changedFiles) || c.changedFiles.length === 0) {
      throw new Error(
        `wild case '${name}': case.json must list a non-empty changedFiles array`,
      );
    }
    cases.push({ name, ...c });
  }
  return cases;
}

function renderCase(name, source, r) {
  const lines = [];
  lines.push(`## ${name}   (source ${source.repo}@${source.sha})`);
  lines.push(`   subject : ${source.subject}`);
  lines.push(`   level             : ${r.level}`);
  lines.push(`   hasReviewPacket   : ${r.hasReviewPacket}`);
  lines.push(
    `   diffChangedFiles  : ${r.diffChangedCount} vs real-commit files ${r.commitFileCount}  → reproduced: ${r.reproduced ? "YES" : "NO"}`,
  );
  if (r.raw.facts.length === 0) {
    lines.push("   surfaced facts    : (none)");
  } else {
    lines.push(`   surfaced facts    : ${r.raw.facts.length}`);
    for (const f of r.raw.facts) {
      const detail = { ...f };
      delete detail.kind;
      lines.push(`     - [${f.kind}] ${JSON.stringify(detail)}`);
    }
  }
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const keep = args.includes("--keep");

  const corpusBin = resolveCorpusBin();

  let cases;
  try {
    cases = loadWildCases();
  } catch (e) {
    console.error(`wild corpus failed to load (AC-003): ${e.message}`);
    process.exit(2);
  }

  const records = [];
  const failures = [];
  for (const c of cases) {
    let r;
    try {
      r = materializeAndReviewWild(c, corpusBin, ROOT, { keep });
    } catch (e) {
      failures.push({ name: c.name, source: c.sourceCommit, error: e.message });
      records.push({ name: c.name, source: c.sourceCommit, error: e.message });
      continue;
    }
    records.push({
      name: c.name,
      source: c.sourceCommit,
      level: r.level,
      hasReviewPacket: r.hasReviewPacket,
      diffChangedFiles: r.diffChangedFiles,
      diffChangedCount: r.diffChangedCount,
      commitFileCount: r.commitFileCount,
      reproduced: r.reproduced,
      reviewExit: r.reviewExit,
      facts: r.raw.facts,
      flatFacts: r.raw.flat,
    });
  }

  if (asJson) {
    console.log(JSON.stringify({ records, failures }, null, 2));
    // Wild is descriptive: a materialization FAILURE is the only non-zero exit (surfaced facts are
    // not failures — the owner judges them). Exit 2 if any case could not materialize at all.
    process.exit(failures.length > 0 ? 2 : 0);
  }

  const out = [];
  out.push(
    "================ corpus-bench — WILD tier (descriptive; no pass/fail) ================",
  );
  out.push(
    "Subject : corpus review --json  (public contract; corpus-cli Core never imported — ADR-0085)",
  );
  out.push(
    "Changes : REAL corpus-family commits (self-measurement bias — recorded per case; owner judges)",
  );
  out.push(
    "Facts   : RAW — every surfaced fact, with its id/kind, for human judgment (real-issue vs noise)",
  );
  out.push("");

  for (const c of cases) {
    const rec = records.find((x) => x.name === c.name);
    if (rec.error) {
      out.push(
        `## ${c.name}   (source ${c.sourceCommit.repo}@${c.sourceCommit.sha})`,
      );
      out.push(`   FAILED TO MATERIALIZE: ${rec.error}`);
      out.push("");
      continue;
    }
    out.push(
      renderCase(c.name, c.sourceCommit, {
        level: rec.level,
        hasReviewPacket: rec.hasReviewPacket,
        diffChangedCount: rec.diffChangedCount,
        commitFileCount: rec.commitFileCount,
        reproduced: rec.reproduced,
        raw: { facts: rec.facts },
      }),
    );
    out.push("");
  }

  out.push(
    "=====================================================================================",
  );
  const okCount = records.filter((r) => !r.error).length;
  out.push(
    `materialized: ${okCount}/${cases.length}` +
      (failures.length
        ? `  ·  FAILED: ${failures.map((f) => f.name).join(", ")}`
        : ""),
  );
  out.push(
    "These facts are RAW. The owner judges each (real-issue vs noise). No verdict is asserted.",
  );
  out.push(
    "=====================================================================================",
  );
  console.log(out.join("\n"));

  process.exit(failures.length > 0 ? 2 : 0);
}

main();
