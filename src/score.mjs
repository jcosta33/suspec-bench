// Scoring (AC-004). Computes:
//   - recall per category + overall = (target facts surfaced) / (target facts expected). The target
//     facts are the fact(s) a case was DESIGNED to exercise (its category's signal). For clean cases
//     there are no target facts, so they don't contribute to recall — they drive precision instead.
//   - effective-FP rate = (surfaced facts on clean cases) / (clean-case count). On a known-clean case
//     ANY surfaced fact is an effective false positive [[GOOGLESA]] (a fact a reviewer takes no
//     positive action on). Held to a configured ceiling (default ≤10%).
//
// A `result` per case (from the runner) is:
//   { name, category, targetFacts, expectedFacts, surfacedFacts, hits, misses, extras }

export const DEFAULT_FP_CEILING = 0.1;

export function score(results, { fpCeiling = DEFAULT_FP_CEILING } = {}) {
  // ---- recall, per category, over TARGET facts (the seeded signal) ----
  const byCategory = new Map();
  for (const r of results) {
    if (!byCategory.has(r.category)) {
      byCategory.set(r.category, {
        category: r.category,
        expected: 0,
        surfaced: 0,
        cases: 0,
      });
    }
    const agg = byCategory.get(r.category);
    agg.cases += 1;
    for (const t of r.targetFacts) {
      agg.expected += 1;
      if (r.surfacedFacts.includes(t)) agg.surfaced += 1;
    }
  }
  const categories = [...byCategory.values()]
    .map((a) => ({
      ...a,
      recall: a.expected === 0 ? null : a.surfaced / a.expected,
    }))
    .sort((x, y) => x.category.localeCompare(y.category));

  // ---- overall recall (seeded categories only; clean has no target facts) ----
  let totalExpected = 0;
  let totalSurfaced = 0;
  for (const a of categories) {
    totalExpected += a.expected;
    totalSurfaced += a.surfaced;
  }
  const overallRecall =
    totalExpected === 0 ? null : totalSurfaced / totalExpected;

  // ---- effective-FP over clean cases ----
  const cleanResults = results.filter((r) => r.category === "clean");
  let cleanFpCases = 0;
  let cleanFpFacts = 0;
  for (const r of cleanResults) {
    if (r.surfacedFacts.length > 0) {
      cleanFpCases += 1;
      cleanFpFacts += r.surfacedFacts.length;
    }
  }
  // The metric: fraction of clean cases on which the gate surfaced at least one (false-positive) fact.
  const effectiveFpRate =
    cleanResults.length === 0 ? null : cleanFpCases / cleanResults.length;
  const fpWithinCeiling =
    effectiveFpRate === null ? true : effectiveFpRate <= fpCeiling;

  // ---- misses (any expected fact absent, across ALL cases) drive a hard fail (AC-002) ----
  const anyMiss = results.some((r) => r.misses.length > 0);

  return {
    categories,
    overallRecall,
    totalExpected,
    totalSurfaced,
    clean: {
      cases: cleanResults.length,
      fpCases: cleanFpCases,
      fpFacts: cleanFpFacts,
      effectiveFpRate,
      ceiling: fpCeiling,
      withinCeiling: fpWithinCeiling,
    },
    anyMiss,
    // The run passes only if no expected fact is missing AND effective-FP is within the ceiling.
    passed: !anyMiss && fpWithinCeiling,
  };
}

function pct(x) {
  return x === null ? "n/a" : `${(x * 100).toFixed(1)}%`;
}

export function renderReport(results, scored) {
  const lines = [];
  lines.push(
    "================ suspec-bench v0 — review-gate recall + effective-FP ================",
  );
  lines.push(
    "Subject : suspec review --json  (public contract; suspec-cli Core never imported — ADR-0085)",
  );
  lines.push(
    "Target  : recall per fact class + effective-FP ≤ " +
      pct(scored.clean.ceiling) +
      "  [[GOOGLESA]]",
  );
  lines.push("");

  // Per-case detail
  lines.push("--- per case ---");
  for (const r of results) {
    const verdict =
      r.misses.length > 0
        ? "MISS"
        : r.category === "clean" && r.extras.length > 0
          ? "FP"
          : "ok";
    lines.push(`[${verdict.padEnd(4)}] ${r.name.padEnd(22)} (${r.category})`);
    lines.push(
      `         surfaced: ${r.surfacedFacts.length ? r.surfacedFacts.join(", ") : "(none)"}`,
    );
    if (r.misses.length)
      lines.push(`         MISS    : ${r.misses.join(", ")}`);
    if (r.extras.length)
      lines.push(`         extra   : ${r.extras.join(", ")}`);
  }
  lines.push("");

  // Recall per category
  lines.push("--- recall per category (over target/seeded facts) ---");
  for (const c of scored.categories) {
    if (c.recall === null) {
      lines.push(
        `  ${c.category.padEnd(20)} cases=${c.cases}  (no target facts — precision control)`,
      );
    } else {
      lines.push(
        `  ${c.category.padEnd(20)} cases=${c.cases}  recall ${pct(c.recall)}  (${c.surfaced}/${c.expected})`,
      );
    }
  }
  lines.push("");
  lines.push(
    `  OVERALL recall: ${pct(scored.overallRecall)}  (${scored.totalSurfaced}/${scored.totalExpected} seeded facts surfaced)`,
  );
  lines.push("");

  // Effective-FP
  lines.push("--- effective-false-positive (over clean cases) ---");
  lines.push(`  clean cases            : ${scored.clean.cases}`);
  lines.push(
    `  clean cases w/ any fact: ${scored.clean.fpCases}  (FP facts: ${scored.clean.fpFacts})`,
  );
  lines.push(
    `  effective-FP rate      : ${pct(scored.clean.effectiveFpRate)}  (ceiling ${pct(scored.clean.ceiling)})`,
  );
  lines.push(
    `  within ceiling         : ${scored.clean.withinCeiling ? "YES" : "NO"}`,
  );
  lines.push("");
  lines.push(
    "=====================================================================================",
  );
  lines.push(
    `RESULT: ${scored.passed ? "PASS" : "FAIL"}` +
      (scored.anyMiss ? "  (a seeded fact was missed)" : "") +
      (!scored.clean.withinCeiling ? "  (effective-FP over ceiling)" : ""),
  );
  lines.push(
    "=====================================================================================",
  );
  return lines.join("\n");
}
