# Adoption walkthrough 2 — the core loop, plain markdown, solo

> **A verified illustration**, not a field audit. The persona is fictional; claims about the kit, the
> templates, and the solo guidance are checkable against the real files (paths cited). No CLI is
> executed — this path is deliberately tooling-free.

## Premise

**Persona.** Sam, a solo developer starting a new SaaS. One person, greenfield, no team-governance
questions. They want the **core loop as plain markdown** — clear requirements, bounded agent tasks, a
durable review record — without installing anything.

**Adopts.** The core formats: **spec → task → review → finding**. Copy-whole-kit, fill `AGENTS.md`, then
run the loop by hand. No suspec-cli, no MCP, no skills catalog.

## The walkthrough

### 1. Copy + bootstrap

Sam copies the kit and fills the one required file — `AGENTS.md`'s Commands table (their real `test`/
`lint`/`build`) and project facts — plus the seed `decisions/0001-adopt-suspec.md`. That's the "~15 minutes,
one copy" path `ADOPTING.md` describes.

### 2. The solo escape hatch — skip the ceremony

`docs/reference/source-authority.md` says it directly: _"Working solo? You are every owner, and conflicts
you resolve in your own head — the five rules above are all you need; skip the ladder entirely until a
second person (or a second team) makes 'who governs?' a real question."_ So Sam ignores the governance
ladder and uses the five-rule MVP.

### 3. Run the loop by hand

- **Spec** (`templates/spec.md`): Intent, two ACs each with a `Verify with:` line, Non-goals, Open
  questions. One page.
- **Task** (`templates/task.md`): scope = the AC IDs, a Do-not-change list, the Verify commands, a Run
  summary the agent fills.
- Hand the task packet to the agent (by path/paste). The agent codes against it.
- **Review** (`templates/review.md`): one coverage row per AC, pasted evidence, exceptions routed.
- **Finding** (`templates/finding.md`) at close — one durable lesson — and update `status.md` by hand.

Every artifact is markdown Sam owns outright; nothing runs but the agent.

## Documented gaps (checkable surface facts only)

1. **The solo path is real and documented** — `source-authority.md` explicitly scopes governance away for
   one person. _(Checkable: the quoted "Working solo?" passage.)_ This is a _strength_, recorded so the
   walkthrough isn't all friction.
2. **Copy-whole still delivers the full kit to a 4-format adopter.** Sam wants four templates + the
   bootloader; `suspec init` / the kit copy also brings `advanced/`, `examples/`, `hooks/`, and the skills
   guides. The `examples/feature-from-ticket/` is meant to be read then deleted (`ADOPTING.md` step 4), but
   nothing prunes the rest. _(Observation of the kit tree.)_
3. _Hypothesis (unverified):_ a solo dev may find the markdown-only loop low-friction precisely because
   there is nothing to install — but that's a UX guess, not a measured finding.

## What it illustrates

The framework's floor: the entire value proposition (verifiable requirements, bounded tasks, a durable
review record) works as **plain markdown with zero tooling**, and the canon has an explicit solo
escape-hatch so a one-person adopter isn't taxed with multi-party governance.

## To make this a real demo (Phase 2 seed)

Build a small real SaaS feature solo through the markdown loop on a throwaway repo, committing each
artifact, to show the paper trail a single developer accrues with no tooling installed.
