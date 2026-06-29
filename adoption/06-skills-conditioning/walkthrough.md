# Adoption walkthrough 6 — installing conditioning stances + change-shape guides

> **A verified illustration**, not a field audit. The persona is fictional; the catalog, both install
> paths, and the installed `SKILL.md` below were **really executed** against the
> [suspec-skills](https://github.com/jcosta33/suspec-skills) repo / the `npx skills` tool, output pasted
> verbatim (TUI spinner control characters elided). "Documented gaps" are checkable surface facts.

## Premise

**Persona.** A developer who already runs the core loop and wants the agent **conditioned** for specific
work: the Skeptic stance for reviews, the `write-fix` guide for bug work — installed per task, not
always-on.

**Adopts.** The starter kit **+ suspec-skills** (the catalog of conditioning stances + change-shape code
guides). Not suspec-cli, not the MCP server.

## The walkthrough

### 1. The catalog — 18 standalone skills

`suspec-skills/skills/` ships personas (stances) and change-shape guides, each a self-contained `SKILL.md`:

```
empirical-proof      persona-architect   persona-auditor      persona-challenger
persona-documentarian persona-researcher  persona-skeptic      persona-surveyor
fix-flaky-test       implement-task      write-documentation  write-feature
write-fix            write-migration     write-performance     write-refactor
write-rewrite        write-testing
```

### 2. Install path A — the `npx skills` tool

```
$ npx skills add jcosta33/suspec-skills --list
●  claude-code … Agent detected — installing non-interactively
◇  Source: https://github.com/jcosta33/suspec-skills.git
◇  Repository cloned
◇  Found 18 skills
◇  Available Skills
│    empirical-proof
│      Back every claim with verbatim pasted output. ALWAYS apply this skill on any task that writes
│      code, runs validations, runs benchmarks, or makes verifiable claims about behaviour …
│    fix-flaky-test
│      Stabilize a flaky, non-deterministic test: reproduce it by looping, name the category of
│      nondeterminism, fix the cause — never the assertion …
│    …
```

The tool detects the agent, clones the catalog, and lists all 18 with their full directive descriptions.
`--skill <name>` installs one; `-g` global, `-a claude-code` targets a tool.

### 3. Install path B — copy the folder (no CLI)

The README's no-CLI path is a plain copy:

```
$ cp -R suspec-skills/skills/persona-skeptic .agents/skills/
$ cp -R suspec-skills/skills/write-fix       .agents/skills/
$ ls .agents/skills/
adversarial-review/  implement-task/  persona-skeptic/  review-output/  save-findings/
spec-check/  split-work/  write-audit/  write-bug-report/  write-change-plan/  write-fix/  …
```

The installed skill sits beside the kit's core guides and loads as a normal `SKILL.md`:

```
$ head .agents/skills/persona-skeptic/SKILL.md
---
name: persona-skeptic
type: agent-guide
description: >-
  The Skeptic stance — refute by default: a claim is unproven until evidence
  forces the opposite conclusion. ALWAYS apply when judging another agent's
  change set …
```

## Documented gaps (checkable surface facts only)

1. **The personas are not in the kit core — they install per task.** A fresh `suspec init` `.agents/skills/`
   ships the core/workspace guides (`implement-task`, `review-output`, `write-audit`, …) but **no
   `persona-*`**; the stances come from the catalog (matches ADR-0064's core-vs-advanced tiering). So
   "install per task" is a real extra step, by design. _(Checkable: `ls` a fresh `init` skills dir — no
   personas — vs after the copy.)_
2. **The `npx skills add` output carries TUI spinner control characters even in agent-detected
   non-interactive mode** (`◒ Cloning repository` redraw sequences). Cosmetic, but it clutters an agent's
   captured transcript. _(Checkable: re-run `npx skills add … --list` and inspect the raw bytes.)_

## What it illustrates

Per-task conditioning adoption: the catalog stands apart from the kit, and a stance or a change-shape guide
is added with one command (or one `cp`) only when the work calls for it — the agent loads it as a normal
`SKILL.md` with a directive `description` that governs when it activates.

## To make this a real demo (Phase 2 seed)

Record a real task run twice — once with no persona, once with `persona-skeptic` installed — and capture
the difference in what the agent demands and refuses, so the conditioning effect is shown, not asserted.
