# Adoption walkthroughs (Tier 2)

Seven **verified illustrative walkthroughs** of the pick-and-choose Corpus adoption paths — one per
persona × adopted-subset, spanning **minimal (1 part) → full (everything)**.

## What these are (and are not)

- **They are verified illustrations.** The product and persona in each are fictional, but the **Corpus
  surface they traverse is real** — every command and its output was _actually executed_ against the
  current `corpus` binary, the built `corpus-mcp` server, and the `corpus-skills` catalog, and pasted
  verbatim. Each walkthrough's top banner says exactly what was executed.
- **They are not field-audit evidence.** A fictional product cannot honestly yield _adoption-friction
  findings_ — that needs a real adopter (Phase 2; the existing `corpus-works/specs/adoption-experience/` Yap +
  Promptly audits are the real-product precedent). So "Documented gaps" here are limited to **checkable
  surface facts** (a real CLI message, a real doc/npm mismatch, by path); any UX hunch is explicitly
  labeled a _hypothesis (unverified)_, never a finding.
- **One frame throughout** — Documentarian (illustrate the path). No verdicts, no marketing.

## The seven

| #   | Walkthrough                                                      | Persona                       | Adopts                    | Executed                  |
| --- | ---------------------------------------------------------------- | ----------------------------- | ------------------------- | ------------------------- |
| 1   | [review-only](./01-review-only/walkthrough.md)                   | Tech lead, specs in Linear    | review packet only        | — (markdown)              |
| 2   | [greenfield-formats](./02-greenfield-formats/walkthrough.md)     | Solo dev, new SaaS            | spec+task+review+finding  | — (markdown)              |
| 3   | [brownfield-navigator](./03-brownfield-navigator/walkthrough.md) | Eng, 80k-LOC refactor         | + inventory + change-plan | `corpus check`            |
| 4   | [cli-mechanized](./04-cli-mechanized/walkthrough.md)             | Dev mechanizing the loop      | kit + corpus-cli          | full CLI loop             |
| 5   | [mcp-agent-queries](./05-mcp-agent-queries/walkthrough.md)       | Team on Claude Desktop/Cursor | + corpus-mcp              | real MCP over stdio       |
| 6   | [skills-conditioning](./06-skills-conditioning/walkthrough.md)   | Dev wanting stances/guides    | + corpus-skills           | real install (npx + copy) |
| 7   | [full-stack-team](./07-full-stack-team/walkthrough.md)           | Team adopting everything      | all + hooks + conventions | CLI + MCP + skills + hook |

See [overview.md](./overview.md) for the pick-and-choose map and the collected checkable gaps.

## Phase 2 — build real demos from these

These illustrations are written to **seed real demo products**: each ends with a "To make this a real demo"
note. Phase 2 turns the fictional premises into actual throwaway builds where the friction is _real_, with
**Yap as the brownfield real-adoption example** (walkthrough 3's natural slot). The verified-illustration
tier here is the honest starting point; the real demos are the field evidence.
