# Wild-set judgment — after the #44 run-summary parser fix (2026-06-20)

This re-runs the four wild cases (same real suspec-cli commits + real packets) against the **#44-patched**
suspec-cli, and records an **independent, non-author** judge's classification of the result. It is the
post-fix counterpart to [JUDGMENT-2026-06-20.md](./JUDGMENT-2026-06-20.md) (the pre-fix baseline).

## What #44 changed

The run-summary claimed-files parser now (a) **path-validates** claimed tokens, so a backticked commit sha
(`` `0791385` ``) or symbol (`` `reconcile_self_report` ``) is no longer mistaken for a claimed file, and
(b) when a **prose** Run summary parses to zero file claims, surfaces a single `runSummaryUnparsed` note
instead of flooding `inDiffNotClaimed` with every changed file.

## The result (independent judge — a fresh non-author agent re-ran the gate and classified blind)

| Fact class                              | Pre-#44 | Post-#44 | Note                                                                                                                    |
| --------------------------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `inDiffNotClaimed`                      | 28      | **8**    | the w3/w4/w4b prose floods are gone; only w1's 8 remain (it backticked one real path → a _partial manifest_, not prose) |
| `claimedNotInDiff`                      | 2       | **0**    | the backticked-sha FPs are gone                                                                                         |
| `outsideScope`                          | 14      | 14       | unchanged — #44 does not touch scope/affected-areas                                                                     |
| coverage/uncovered (no-packet artifact) | 10      | 10       | unchanged                                                                                                               |

- **#44 removed 22 surfaced facts** — `inDiffNotClaimed` 28→8 (the prose floods, but w1's 8 partial-manifest
  facts survive) and `claimedNotInDiff` 2→0 (the sha class, entirely). (Not 30: that would be 28+2, which
  wrongly counts the 8 surviving w1 facts as removed.) Effective-FP volume fell **43→~20** (≈23 fewer).
- Independent judge on the 22 diff-keyed facts: **2 real / 20 noise → ~91% effective-FP**. The 2 real are
  the **same** w1 `src/infra/yamlScalar.ts` layering divergence the baseline found, plus its co-located test.

## The honest read

#44 fixed exactly the two bugs it was scoped to (prose-flood, sha), **halving raw FP volume** — but the
effective-FP _rate_ stayed ~91% because the remaining facts are **two other noise classes** the wild set
exposes:

1. **Co-located `__tests__/` files flagged `outsideScope`** (13 of 14): the packet declares
   `X/services/foo.ts`; the test lives at `X/__tests__/foo.spec.ts`, under no declared prefix.
2. **`inDiffNotClaimed` prose-granularity** (w1's 8): the Run summary names the files in prose the parser
   can't match to paths.

Both are the **next precision items** (recorded in `suspec-works/findings/review-gate-measurement.md` DP-7),
beyond #44's scope. The gate's facts are sound — it surfaced the one real divergence — but on natural
(author-written, not gate-disciplined) packets it is still `--no-verify` territory until those two classes
are addressed.

**Independence:** DP-7 improves the _judging_ bias (a non-author agent, who even classified slightly
differently). The _changes and packets_ remain suspec-family. A fully-independent wild set is structurally
hard — the gate reconciles against a Suspec task packet, which external projects don't produce, so an
external change needs a synthesized packet (reintroducing author bias). The fully-unbiased version awaits a
real external adopter who already runs Suspec.
