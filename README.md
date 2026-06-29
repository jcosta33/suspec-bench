# suspec-bench — simulated scenarios that exercise Suspec

suspec-bench holds **simulated scenarios run against the real Suspec surface**. Two tiers:

- **Tier 1 — review-gate measurement** (`src/` · `cases/` · `wild/`): seeded + wild changes run through the public `suspec review --json` contract, scored on recall + effective-FP. **FROZEN v0 (2026-06-20)** — see the banner below.
- **Tier 2 — adoption walkthroughs** (`adoption/`): verified, executable illustrations of the pick-and-choose Suspec _adoption_ paths — one per persona + adopted subset, grounded in the real docs / CLI / MCP / skills with verbatim captured output. See [`adoption/README.md`](./adoption/README.md).

---

## Tier 1 — review-gate measurement (FROZEN v0)

> **Status: FROZEN (2026-06-20).** This tier delivered its verdict — recorded as DP-5/6/7 in suspec-works `FINDING-review-gate-measurement`: the gate is **0% effective-FP on disciplined packets, ~91% on natural ones**, so its real-world value is contingent on packet discipline, not the gate logic. It is **not under active development**; the files below stay as the reproducible record. Revive only for a committed gate-precision push, which would also complete the unmet `AC-001` classes (`C013`, `emptyEvidencePassRows`) and add scorer self-tests (the v0→v1 reopen-list).

A benchmark that measures the Suspec **review gate**'s mechanical **recall** and
**effective-false-positive rate** by running seeded cases through the **public
`suspec review --json` contract**.

It **never imports suspec-cli's Core** — it only shells out to the `suspec` binary and parses the
published `--json` ReviewReport (the ADR-0085 posture: consume the contract, not the library). Both
the suspec runner and the real binary exercise the full end-to-end path (run resolution + git diff),
so the benchmark measures the same surface a reviewer or an MCP adapter consumes.

It scores the gate against the design target from
**[[GOOGLESA]](../suspec/docs/research/sources.md#GOOGLESA)** (Sadowski et al., _Lessons from Building
Static Analysis Tools at Google_, CACM 2018): a code-review-time check must keep **effective false
positives under 10%** — an "effective false positive" is a surfaced issue a developer takes **no
positive action** on. Above that budget, a check gets `--no-verify`'d into irrelevance.

This measures the gate's **mechanical** recall/precision on a suspec — **not** team-level
shipped-defect reduction (that stays a longitudinal open question; see the spec's Non-goals).

## What it measures

- **Recall** — per fact class and overall: of the failures a case seeds, how many the gate surfaces.
- **Effective-FP rate** — over the clean (negative-control) cases: any fact surfaced on a
  known-clean change is an effective false positive. Held to a configured **≤10%** ceiling.

## The corpus

A seeded synthetic corpus under `cases/`, one directory per case, each with a `case.json`
(the materialization recipe: spec, task packet, optional review packet, base files, change set) and
an `expected.json` (the exact facts a correct gate must report + the category tag; clean cases
declare the empty set). The seeded failure patterns are drawn from a documented failure taxonomy —
**[[MAST]](../suspec/docs/research/sources.md#MAST)** (14 multi-agent failure modes weighted to
specification + verification ≈ 63%), corroborated by
**[[SEMAP]](../suspec/docs/research/sources.md#SEMAP)** on under-specification + verification — rather
than invented ad hoc (each case's `failureModeSource` names its taxonomy tie).

| Case                    | Category             | Seeds                                                            |
| ----------------------- | -------------------- | ---------------------------------------------------------------- |
| `outside-scope`         | `outsideScope`       | a committed change to a file outside the spec's Affected areas   |
| `do-not-change-touched` | `doNotChangeTouched` | a committed change to a `## Do not change` file (C014, ADR-0086) |
| `claim-not-in-diff`     | `claimedNotInDiff`   | the Run summary claims a file that never changed                 |
| `diff-not-claimed`      | `inDiffNotClaimed`   | a changed file the Run summary never listed                      |
| `coverage-uncovered`    | `coverageUncovered`  | in-scope ACs with no review-packet coverage row (C012)           |
| `clean-in-scope`        | `clean`              | a correct run (in scope, claimed, packet-covered) → **no fact**  |
| `clean-covered-packet`  | `clean`              | a correct two-AC run, both covered → **no fact**                 |

The corpus loader asserts every case carries a non-empty category tag and a declared expected-facts
set (clean cases declare `[]`); a malformed case refuses to load.

## Running it

```
npm run bench           # materialize the corpus, run suspec review --json, print the scored report
npm run bench:synthetic # alias
npm run bench:wild      # the WILD tier — real suspec-cli commits, RAW facts, no pass/fail (see wild/README.md)
node src/runner.mjs --observe   # print each case's raw surfaced facts (no pass/fail) — for grounding
node src/runner.mjs --json      # machine-readable scored result
```

The runner exits non-zero on **any miss** (an expected fact the gate failed to surface) or when the
**effective-FP rate exceeds the ceiling**.

The suspec binary path and the ceiling come from `package.json` (`suspecBench.suspecBin`,
`suspecBench.effectiveFpCeiling`); override with the `SUSPEC_BIN` / `FP_CEILING` env vars.

## Measured result (v0, against suspec-cli `bin/suspec.js`, suspec 1.0.0)

```
--- recall per category (over target/seeded facts) ---
  claimedNotInDiff     cases=1  recall 100.0%  (1/1)
  clean                cases=2  (no target facts — precision control)
  coverageUncovered    cases=1  recall 100.0%  (2/2)
  doNotChangeTouched   cases=1  recall 100.0%  (1/1)
  inDiffNotClaimed     cases=1  recall 100.0%  (1/1)
  outsideScope         cases=1  recall 100.0%  (1/1)

  OVERALL recall: 100.0%  (6/6 seeded facts surfaced)

--- effective-false-positive (over clean cases) ---
  clean cases            : 2
  clean cases w/ any fact: 0  (FP facts: 0)
  effective-FP rate      : 0.0%  (ceiling 10.0%)
  within ceiling         : YES
```

**Mechanical recall 100% (6/6 seeded facts), effective-FP 0% over 2 clean cases.** This is a
_measured mechanical recall/precision on a small hand-built suspec_ — not the unmeasured team-level
shipped-defect claim.

## Gate behavior worth knowing (the gate is the oracle)

These are real behaviors of `suspec review` that the corpus was grounded against, not bugs:

- **`coverageUncovered` fires on every packet-less run.** With no review packet, `hasReviewPacket` is
  `false` and _every_ in-scope AC reads `uncovered` (C012). So a clean change that simply hasn't had
  its review packet written yet still surfaces a coverage fact. To produce a **truly clean** result
  (zero facts), a case needs a review packet whose frontmatter `task:` matches the **canonical task
  id** from task frontmatter and a `Pass` coverage row for the AC. The two clean cases here ship such
  a packet; this is why a clean negative control is a covered run, not merely an in-scope change.
- **The review packet is resolved by frontmatter, not filename.** `suspec review <stem>` resolves the
  task packet first, then finds the `reviews/*.md` whose frontmatter `task:` equals that task's
  canonical frontmatter id. A packet whose `task:` says only the bare stem is not found
  (`hasReviewPacket:false`).
- **Outside-scope vs do-not-change are distinct facts.** A protected file inside the declared Affected
  areas surfaces as `doNotChangeTouched` only (not `outsideScope`); a file outside Affected areas
  surfaces as `outsideScope` (via `selfReport.outsideScope`, not the `scopeDivergence` field, which is
  for scope-id-vs-spec mismatches).
- **The untracked-dir-collapse gotcha (materialization, not the gate).** An _uncommitted_ new file in
  a _new_ directory collapses to the parent directory name in `git diff --name-only` (git reports the
  untracked directory, not the files). The change set must be **committed in the worktree** so the
  three-dot `base...HEAD` diff lists individual files — otherwise per-file fact matching breaks. The
  runner commits every change set.

## Bias scope (AC-005)

The corpus was hand-built by the same project that built the gate, and the cases are synthetic — this
is **self-measurement** at the corpus tier, the same caveat `FINDING-review-gate-measurement` records.
What the numbers establish: the gate mechanically surfaces each seeded fact class and stays silent on
correct runs, on this corpus. What they do **not** establish: real-world recall on agent-authored
changes (a less-biased "wild" set is the next data point, AC-003), or any team-level outcome. The
effective-FP proxy here is the clean-case rate — a sampled human pass over a wild set is the
complementary measure the spec's open question names.

The **wild tier** (AC-003) is the first step toward that less-biased data point: it runs **real
agent-authored suspec-cli commits** through the same `suspec review --json` contract and records the
**raw facts the gate surfaces, with no expected facts and no pass/fail** — the owner judges each
fact (real-issue vs noise). It is still self-measurement (self-family commits, bias recorded per
case), but the change and the task intent are real, not hand-seeded. See **`wild/README.md`** and
run `npm run bench:wild`.

## Layout

```
cases/<name>/case.json       the materialization recipe (spec, task, optional packet, files, change set)
cases/<name>/expected.json   the declared expected facts + category tag (clean cases declare [])
src/corpus.mjs               loads + validates the corpus (AC-001 assertions)
src/materialize.mjs          materializes one case + runs suspec review --json (never imports Core)
src/score.mjs                recall per category/overall + effective-FP scoring + report rendering
src/runner.mjs               the synthetic runner (AC-002): hit/miss/extra, exits non-zero on a miss
```
