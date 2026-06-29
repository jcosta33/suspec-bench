# Adoption walkthrough 1 — the review packet, on its own

> **A verified illustration**, not a field audit. The persona is fictional; every claim about the kit
> and the docs is checkable against the real files (paths cited). No CLI is executed — this path is
> plain markdown.

## Premise

**Persona.** Mara, a tech lead on a four-person team. They already write requirements in Linear and don't
want to change that. Their one pain: reviewing agent-generated PRs means reading the whole diff. They want
**only the review packet** — the exception-routing evidence table — and nothing else.

**Adopts.** One part: the **review packet** format (with the task packet as the input it reconciles). Not
the spec format, not the CLI, not skills.

## The walkthrough

### 1. Get the template

Per `suspec/docs/ADOPTING.md`, adoption is "copy the kit whole." Mara copies
[`suspec-starter-kit`](https://github.com/jcosta33/suspec-starter-kit) and opens one file —
`templates/review.md`. Its shape (verbatim section list): **Summary · Changed files · Requirement
coverage** (`| ID | Result | Evidence | Human attention |`, results Pass/Fail/Unverified/Blocked) ·
**Change-plan coverage** (optional) · **Human attention** · **Open decisions** (optional, ADR-0089) ·
**Task status · Suggested decision**.

### 2. Use it on the next agent PR

For each requirement Mara writes one coverage row — the result, the pasted test output or CI link as
evidence, and whether it needs human eyes. The **Human attention** section routes only the exceptions
(unverified rows, out-of-scope changes, risky files, missing test output) — "investigate, don't
rubber-stamp." The reviewer reads the table and the exceptions, spot-checks one green row, and opens only
the files the exceptions point at — instead of the whole diff.

The load-bearing rule (from `docs/08-reviewing-output.md`): **a `Pass` needs pasted output or a CI link; an
empty Evidence cell reads `Unverified`, never `Pass`.** That single rule is what makes the table trustable
without re-reading everything.

## Documented gaps (checkable surface facts only)

1. **The README invites 1-part adoption, but `ADOPTING.md` only documents copy-whole.** The canon README
   says _"Take what you want… adopt just the review packet"_ — but `docs/ADOPTING.md`'s three paths are all
   "copy the kit whole + fill the bootloader." There is no documented "just the review packet" path, so a
   1-part adopter still copies the full ~62-file kit to use one template. _(Checkable: grep ADOPTING.md for
   a partial-adoption path — there is none; cf. README "Take what you want.")_
2. **The review packet's input is the task packet.** The coverage table keys on requirement IDs the task
   packet declares in scope, and `suspec review` reconciles the run summary's claimed files against the
   diff — so "review packet only" in practice also leans on the task packet's scope/run-summary to be
   meaningful. (Observation from `templates/task.md` + `docs/08-reviewing-output.md`.)

## What it illustrates

The smallest possible adoption: one template, plain markdown, no tooling — the review packet as an
exception-routing layer over an existing (non-Suspec) requirements process. It earns its place alone, and it
exposes the cleanest documented-gap: the "take what you want" promise isn't matched by a documented
take-one path.

## To make this a real demo (Phase 2 seed)

Take a real agent PR on a throwaway repo, write the review packet by hand against it, and show a reviewer
opening only the exception files — measuring how much of the diff they did _not_ have to read.
