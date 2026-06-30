# suspec-bench — the WILD tier

The **wild tier** (SPEC-review-gate-benchmark **AC-003**) is the less-biased complement to the
synthetic fixture set. Where the synthetic tier seeds _known_ faults and scores recall against
_declared expected facts_, the wild tier runs **real agent-authored suspec-cli changes** — actual
commits from the recent suspec-cli remediation — through the same public `suspec review --json`
contract and **records the raw facts the gate surfaces, with no expected facts and no pass/fail.**

It is **descriptive, not scored.** Wild changes have no seeded ground truth, so the runner does not
judge a surfaced fact as a hit, a miss, or a false positive. It faithfully **materializes + runs +
records.** The **owner judges each surfaced fact afterward** (real-issue vs noise).

## What is "wild" about it

- **The change is real.** Each case's change set is the exact diff of a real suspec-cli commit,
  reconstructed by reading the commit's parent blobs into a base commit and the commit's blobs into
  a worktree commit (so the three-dot `base...HEAD` diff reproduces the real per-file change — the
  `reproduced: YES` sanity check confirms `diffChangedFiles` count == the real commit's file count).
- **The task intent is real.** Each spec's ACs are drawn from the change's **real task packet**
  (`../../suspec-works/tasks/remediation-w*.md`) `## Scope` and the commit message — _not_ invented
  faults. The adapted task packet carries the real packet's `## Scope`, `## Do not change`,
  `## Affected areas`, and `## Run summary` (the `suspec-cli:` context prefix dropped → bare
  `src/...` paths, per the single-repo recipe).
- **No expected facts are pre-declared.** The runner records what the gate emits, verbatim.

## Bias scope (recorded, not assumed — AC-005)

These are **self-family commits.** suspec-bench, suspec-cli, and the task packets were all authored
inside the same project (the Suspec family), by the same owner via Claude agents. So the wild tier is
**still self-measurement** — it removes the _hand-built-synthetic-fault_ bias (the change and the
task intent are real, not seeded) but **not** the _same-author_ bias. Each `case.json` records this
in its `provenance` field. A genuinely independent wild set — a different agent, an outside user, an
external PR — is the next data point the spec's open question names; this is the first, caveated one.

## The wild cases (v0)

| Case                    | Source commit        | Real intent                                                                      |
| ----------------------- | -------------------- | -------------------------------------------------------------------------------- |
| `w1-yaml-scalar`        | `suspec-cli@4ccdf79` | Wave 1 — shared YAML scalar normalizer (#33 config comments + #38 quoted status) |
| `w3-cli-fixes`          | `suspec-cli@cac35d3` | Wave 3 — contained CLI fixes (#24 #26 #32 #37 #42)                               |
| `w4-review-separator`   | `suspec-cli@0791385` | Wave 4 — reject `--agent=x` + add `--` separator (#25 C1/C3)                     |
| `w4-worktree-porcelain` | `suspec-cli@942f725` | Wave 4 follow-up — worktree dir collision + porcelain rename (#25 C2/C4)         |

`w4-review-separator` adapts only the **suspec-cli** slice of the real Wave 4 packet (the `suspec-mcp`
#27/#34 lines live in a different repo and were dropped per the single-repo recipe).
`w4-worktree-porcelain` adapts the C2/C4 items the Wave 4 packet explicitly **deferred** (closed by
the follow-up commit), given a distinct task stem so it does not collide with `w4-review-separator`.

## Running it

```
npm run bench:wild              # materialize each wild case, run suspec review --json, print raw facts
node src/wild-runner.mjs --json # machine-readable raw report
node src/wild-runner.mjs --keep # keep the throwaway workspaces (debugging)
```

Exit is **0** when every case materialized, **2** only if a case failed to materialize at all (a
surfaced fact is **not** a failure — the owner judges it). The suspec binary path comes from
`package.json` (`suspecBench.suspecBin`); override with `SUSPEC_BIN`.

## How to read the raw facts (a materialization note, not a verdict)

Two raw-fact patterns recur across the v0 wild cases. They are **faithful artifacts of the real task
packets' prose**, not seeded faults — and they are exactly the kind of raw observation the owner is
meant to judge:

- **The gate's claimed-files parser keys on a _backticked_ path in the `- Changed files:` line of
  `## Run summary`** (`suspec-cli src/modules/Sol/useCases/parseTaskPacket.ts:171` →
  `claimed_changed_files`: backticked tokens win; otherwise whitespace/comma split filtered to
  `PATH_LIKE`). The **real** remediation packets describe their changed files in _prose_
  (`taskLocator, deriveBoard, …`; `review.ts/cli.ts (+tests, ` + a backticked **sha**)) rather than
  the backticked-full-path list the parser binds to. So:
  - `w4-review-separator` / `w4-worktree-porcelain` claim the **commit sha** (`0791385` / `942f725`)
    — the only backticked token on the line — yielding a `claimedNotInDiff: <sha>` fact and leaving
    every real file `inDiffNotClaimed`.
  - `w3-cli-fixes` lists bare names (`taskLocator`, …) that are not `PATH_LIKE`, so it claims
    nothing → every real file is `inDiffNotClaimed`.
- **`outsideScope` fires on the `__tests__/` files** because the real packets' `## Affected areas`
  list the `src/.../services|useCases` paths but not the co-located test files — so the test files
  are genuinely outside the _declared_ areas (a correct gate behavior on the real change).
- **`coverageUncovered` fires on every AC** because these wild cases ship **no review packet**
  (`hasReviewPacket: false`) — the same packet-less behavior the synthetic tier documents.

Whether each of these is a **real issue** (the packet's Run summary should list full backticked
paths; the Affected areas should include the test dirs; the run should ship a review packet) **or
acceptable noise** is the owner's call — the wild tier records, it does not decide.

## Layout

```
wild/<case>/case.json   the source commit (sha + repo), the spec, the adapted real task packet,
                        the changed-file list (path + A/M/D status), and a provenance note (bias caveat)
src/wild-materialize.mjs  reads the real commit's blobs out of suspec-cli git history, materializes a
                          throwaway workspace, runs suspec review --json (never imports Core)
src/wild-runner.mjs       loads each wild case, materializes + reviews, emits the per-case RAW fact
                          report (no expected facts, no pass/fail)
```
