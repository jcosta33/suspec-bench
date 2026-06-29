# Adoption walkthrough 7 — the full stack, a team adopts everything

> **A verified illustration**, not a field audit. The team/product are fictional; every command, the
> `npm` lookups, the whole-workspace check, the hook, and the MCP behavior below were **really executed**
> and pasted verbatim. This is the maximal-adoption scenario, so it aggregates the real rough edges the
> other walkthroughs surfaced — honestly, not smoothed.

## Premise

**Persona.** A 6-person team adopting Suspec wholesale on a brownfield service: the kit **+ suspec-cli + the
pre-commit/CI hooks + suspec-mcp + the suspec-skills catalog + the conventions** (worker provenance,
adversarial self-review). They want the whole discipline wired into their gates.

**Adopts.** Everything.

## The walkthrough

### 1. Install the CLI — the first real snag

The suspec-cli README says:

```
## Install
npm install -g suspec-cli
```

But that name on npm is **a different project**:

```
$ npm view suspec-cli name version description author
name = 'suspec-cli'
version = '1.2.2'
description = 'A simple filesystem-backed Suspec client. … pulls/pushes updates from/to the server …'
author = 'Victor Grishchenko …'
```

The framework's CLI is `suspec-cli@1.0.0` ("The reference CLI for the Suspec framework — a reconcile-only
harness"). The kit's own generated `hooks/pre-commit` already knows: _"suspec-cli is not yet on npm —
install it from source."_ So the team must install from source, not from the README's command. See
Documented gaps #1 (an adoption blocker).

### 2. `suspec init` + the whole-workspace check blocks until the bootloader is filled

After `suspec init`, the team runs the gate over the whole workspace — and it **blocks**:

```
$ suspec check
Workspace verdict: ✗ blocking  1 specs, 0 change plans
  ✓ clean  specs/checkout-discount/spec.md
  ✗  placeholder  AGENTS.md has unfilled {{placeholder}}s (lines 30, 34, 35, 36, 45, 46, 47, 48) — fill them in, then re-run `suspec check`
EXIT: 2
```

A freshly-`init`'d workspace is **not** `suspec check`-clean — the unfilled `AGENTS.md` placeholders are a
blocking (exit 2) finding until filled. For a team wiring `suspec check` into a hook/CI, this is the right
first gate: it won't pass until the bootloader is real.

### 3. Wire the gate

The kit ships `hooks/pre-commit` — a **fail-open** convenience gate (skips if `suspec` isn't on PATH; gates
only staged `specs/`+`reviews/`; exits 1 on a blocking check), with `hooks/suspec-check.yml` as the
authoritative CI gate. Install: `cp hooks/pre-commit .git/hooks/pre-commit`.

### 4. The agent queries scope over MCP — the second real snag

The team wires `suspec-mcp` (10 read/reconcile tools, `noVerdictIssued` in every payload — see walkthrough
5). The headline call, `suspec_get_task("TASK-checkout-discount")`, **fails** for a task `suspec new task`
created — the MCP strips the `TASK-` prefix and looks for `tasks/checkout-discount.md` while the file is
`tasks/TASK-checkout-discount.md`. See Documented gaps #2.

### 5. Condition the agents + the conventions

The team installs `persona-skeptic` + the change-shape guides from suspec-skills (walkthrough 6), and adopts
the conventions: adversarial self-review before "done" (ADR-0056), worker-provenance lines on delegated
tasks (ADR-0076). These are free (markdown + discipline).

## Documented gaps (checkable surface facts only)

1. **Adoption blocker: the documented CLI install is wrong.** `suspec-cli/README.md` says
   `npm install -g suspec-cli`, but `npm view suspec-cli` resolves to an **unrelated** project
   (gritzko's filesystem Suspec client, 1.2.2) — not the framework CLI (1.0.0). Following the README
   installs the wrong tool. The kit's own hook contradicts the README ("not yet on npm — install from
   source"). _(Checkable: the two `npm view` / README greps above.)_ **Filed as a suspec-works finding.**
2. **`suspec_get_task` can't resolve a `suspec new task` task** (the `TASK-` prefix-strip bug, walkthrough 5
   gap #1). For a team whose agents rely on the MCP for scope, the primary tool is broken on CLI-created
   tasks. **Filed as a suspec-works finding.**
3. **A fresh `init` workspace fails the whole-workspace `suspec check` (exit 2) on unfilled `AGENTS.md`
   placeholders.** Correct as a first gate, but a team wiring CI must fill the bootloader before the gate
   passes. _(Checkable: re-run step 2 before filling AGENTS.md.)_
4. **`suspec worktree create` requires an initial commit** (walkthrough 4 gap #1) — a first-run ordering
   step between `init` and the first worktree.

## What it illustrates

Maximal adoption: every part wired together, and the real cost of going all-in — three of the four
documented gaps are _integration-seam_ issues (a doc/npm mismatch, a CLI↔MCP naming mismatch, a
fresh-workspace gate) that only surface when the parts are actually run together. The pieces compound, but
the seams between separately-shipped repos are exactly where a real adopter snags.

## To make this a real demo (Phase 2 seed)

Stand up the full stack on a real brownfield repo (Yap), fix the three filed integration bugs first, then
record an end-to-end run: source-install the CLI, fill AGENTS.md, wire the hook+CI, drive a task through
the MCP, and gate the PR — the credible "everything works together" demo this illustration can't yet claim.
