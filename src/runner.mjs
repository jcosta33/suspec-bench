#!/usr/bin/env node
// The synthetic runner (AC-002). Loads the seeded corpus, materializes each case as a throwaway git
// workspace, runs it through the PUBLIC `corpus review --json` contract, and records per case the
// surfaced facts vs the declared expected facts (hit / miss / extra). Exits non-zero on any miss
// (AC-002) or when the effective-FP rate exceeds the ceiling (AC-004).
//
// Usage:
//   node src/runner.mjs               run the corpus, print the scored report, exit per AC-002/004
//   node src/runner.mjs --observe     print each case's raw normalized facts (no pass/fail) — for
//                                     grounding expected.json against the gate (the gate is the oracle)
//   node src/runner.mjs --json        emit the machine-readable scored result as JSON

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadCorpus } from "./corpus.mjs";
import { materializeAndReview } from "./materialize.mjs";
import { score, renderReport, DEFAULT_FP_CEILING } from "./score.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

function resolveCorpusBin() {
  if (process.env.CORPUS_BIN) return resolve(process.env.CORPUS_BIN);
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const rel = pkg.corpusBench?.corpusBin ?? "../corpus-cli/bin/corpus.js";
  return resolve(ROOT, rel);
}

function resolveCeiling() {
  if (process.env.FP_CEILING) return Number(process.env.FP_CEILING);
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  return pkg.corpusBench?.effectiveFpCeiling ?? DEFAULT_FP_CEILING;
}

function diff(expected, surfaced) {
  const e = new Set(expected);
  const s = new Set(surfaced);
  return {
    hits: expected.filter((f) => s.has(f)),
    misses: expected.filter((f) => !s.has(f)),
    extras: surfaced.filter((f) => !e.has(f)),
  };
}

function main() {
  const args = process.argv.slice(2);
  const observe = args.includes("--observe");
  const asJson = args.includes("--json");
  const keep = args.includes("--keep");

  const corpusBin = resolveCorpusBin();
  const fpCeiling = resolveCeiling();

  let cases;
  try {
    cases = loadCorpus();
  } catch (e) {
    console.error(`corpus failed to load (AC-001): ${e.message}`);
    process.exit(2);
  }

  if (observe) {
    console.error(
      `# observe mode — materializing ${cases.length} cases via ${corpusBin}\n`,
    );
  }

  const results = [];
  for (const c of cases) {
    let mr;
    try {
      mr = materializeAndReview(c, corpusBin, { keep });
    } catch (e) {
      console.error(`case '${c.name}' failed to materialize: ${e.message}`);
      process.exit(2);
    }
    const surfacedFacts = mr.facts;
    const { hits, misses, extras } = diff(c.expectedFacts, surfacedFacts);
    results.push({
      name: c.name,
      category: c.category,
      failureModeSource: c.failureModeSource,
      targetFacts: c.targetFacts,
      expectedFacts: c.expectedFacts,
      surfacedFacts,
      hits,
      misses,
      extras,
      reviewExit: mr.reviewExit,
    });

    if (observe) {
      console.error(
        `## ${c.name}  (category=${c.category}, reviewExit=${mr.reviewExit})`,
      );
      console.error(`   surfaced: ${JSON.stringify(surfacedFacts)}`);
      console.error(`   declared: ${JSON.stringify(c.expectedFacts)}`);
      console.error("");
    }
  }

  const scored = score(results, { fpCeiling });

  if (observe) {
    // observe mode does not assert pass/fail — it's for grounding expected.json.
    process.exit(0);
  }

  if (asJson) {
    console.log(JSON.stringify({ results, scored }, null, 2));
  } else {
    console.log(renderReport(results, scored));
  }

  process.exit(scored.passed ? 0 : 1);
}

main();
