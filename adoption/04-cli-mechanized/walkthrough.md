# Adoption walkthrough 4 — the CLI-mechanized loop

> **A verified illustration**, not a field audit. The product and persona are fictional; every command
> and its output below was **really executed** against the current `corpus` binary
> (`corpus-cli/bin/corpus.js`) in a throwaway workspace and pasted verbatim (one long `init` file-list is
> elided with `…` for readability — nothing else is altered). "Documented gaps" are checkable surface
> facts (a real CLI message), never imagined persona-friction.

## Premise

**Persona.** Dev, a senior engineer at _Acme Checkout_ (a small e-commerce team). They already run agents
by hand and are comfortable in a terminal. They want the Corpus loop **mechanized** — scaffolding, checking,
worktrees, and reconcile as one-command operations — rather than copying templates by hand.

**Adopts.** The starter kit **+ `corpus-cli`** (the reference CLI). Not corpus-mcp, not the skills catalog —
just the mechanical harness around the markdown loop.

**The work.** A first feature: apply a percentage discount code at checkout.

## The walkthrough

### 1. See the surface

```
$ corpus --help
corpus — a reconcile-only harness for spec-driven agent work
...
Commands
  init      Scaffold a Corpus workspace from the kit (conflict-safe)
  check     Lint a spec, or render the whole-workspace verdict
  worktree  Create / list / remove / prune isolated task worktrees
  status    The workspace board — specs, tasks, reviews, gaps
  review    Reconcile a finished run — diff vs self-report vs spec (no verdict)
  new       Cut a task packet from a spec, or scaffold a new spec
  ...
Exit codes: 0 clean · 1 warnings · 2 error.
```

The help is honest about the boundary in its first line — _reconcile-only_. No command runs the model.

### 2. Scaffold the workspace — one command

```
$ corpus init
init (workspace)
  written: .gitignore, .agents/skills/.../SKILL.md (×14), AGENTS.md, CHANGELOG.md, CLAUDE.md,
  GEMINI.md, README.md, VERSION, advanced/… , decisions/0001-adopt-corpus.md,
  examples/feature-from-ticket/… , hooks/pre-commit, templates/{spec,task,review,finding,…}.md,
  status.md, .agents/.corpus-version
EXIT: 0
```

One command writes the whole kit (62 files): the `.agents/skills/` guides (14), the eight templates, the
`AGENTS.md` bootloader (symlinked to `CLAUDE.md`/`GEMINI.md`), the `advanced/` tier, a worked example, the
seed ADR, and the board. This is the copy-whole-kit model `ADOPTING.md` prescribes, done mechanically and
conflict-safe.

### 3. Scaffold + write the spec

```
$ corpus new spec checkout-discount
scaffolded SPEC-checkout-discount
  specs/checkout-discount/spec.md
```

Dev fills the placeholders — Intent, two ACs each with a `Verify with:` line, Non-goals. Then checks it:

```
$ corpus check specs/checkout-discount/spec.md
specs/checkout-discount/spec.md  ✓ clean  0 errors, 0 warnings
EXIT: 0
```

A well-formed spec passes the C001–C015 contract clean (exit 0). A malformed one would exit 1 (warnings)
or 2 (blocking), naming the check.

### 4. Cut the task — scope never invented

```
$ corpus new task --from SPEC-checkout-discount --scope AC-001,AC-002
cut TASK-checkout-discount (2 scoped)
  tasks/TASK-checkout-discount.md
```

The task is bounded to exactly the two ACs Dev named; the CLI never widens scope on its own.

### 5. The board

```
$ corpus status
SPEC-checkout-discount  ready
  • TASK-checkout-discount  ready  no review
EXIT: 0
```

### 6. An isolated worktree for the agent

```
$ corpus worktree create checkout-discount
this repository has no commits yet — make an initial commit before creating a worktree
EXIT: 2
```

A real speed-bump (see Documented gaps). Dev commits the workspace, then it works:

```
$ git add -A && git commit -q -m "Adopt Corpus workspace + checkout-discount spec/task"
$ corpus worktree create checkout-discount
created corpus/checkout-discount
  .worktrees/checkout-discount
$ corpus worktree list
  corpus/checkout-discount  .worktrees/checkout-discount  clean
```

The agent now codes against the task packet on its own `corpus/checkout-discount` branch, isolated from the
workspace.

### 7. Reconcile the run — facts, never a verdict

Before the work is implemented and a review packet written, `corpus review` honestly reports the
not-yet-covered state:

```
$ corpus review TASK-checkout-discount
review TASK-checkout-discount  ⚠ warning  0 changed files
  no review packet yet — every in-scope requirement reads uncovered
  ⚠  C012 uncovered  requirement AC-001 is in scope but has no coverage row (uncovered)
  ⚠  C012 uncovered  requirement AC-002 is in scope but has no coverage row (uncovered)
EXIT: 1
```

`review` surfaces **facts** (every in-scope AC reads uncovered until a review packet covers it) and routes
them to human attention — it never issues a Pass/Fail. Once the agent finishes and a review packet carries
a covering `Pass` row per AC against the real diff, those C012 facts clear (the gate's documented
coverage behavior).

## Documented gaps (checkable surface facts only)

1. **`corpus worktree create` requires an initial commit** — on a freshly-`init`'d workspace with no
   commits, it exits **2** with `this repository has no commits yet — make an initial commit before
creating a worktree`. Reproduced above. It's defensible (git worktrees need a commit), but it's an
   ordering speed-bump a first-run adopter hits between `init` and `worktree`, undocumented in the
   `corpus worktree --help` flow. _(Verifiable: re-run steps 2 + 6.)_
2. **`corpus init` writes the full kit (62 files) in one shot**, including `advanced/`,
   `examples/feature-from-ticket/`, and the `hooks/`. This matches the ADOPTING copy-whole model, but a
   CLI-only adopter who wanted "just the mechanized core loop" gets the whole tree and prunes after. _(An
   observation of real `init` output, not a defect.)_
3. _Hypothesis (unverified):_ a terminal-comfortable dev may find the one-command scaffold a clear win and
   the worktree speed-bump a minor annoyance — but that is a UX guess, not a measured finding.

## What it illustrates

The smallest **fully-mechanized** adoption: every step of the markdown loop (scaffold → spec → check →
task → worktree → reconcile) is a single `corpus` command with honest exit codes, and the harness stays
reconcile-only — it prepares and checks, the agent codes, and `review` surfaces facts without ever
rendering a verdict.

## To make this a real demo (Phase 2 seed)

Build _Acme Checkout_ as a real throwaway repo: implement the discount feature behind the two ACs, let an
agent run the task in the `corpus/checkout-discount` worktree, write the review packet, and capture a
**post-implementation** `corpus review` showing the C012 facts clearing against a real diff — the half this
verified illustration stops short of (it ends at the not-yet-implemented reconcile, honestly).
