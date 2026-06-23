# Adoption walkthrough 5 — the agent queries its scope over MCP

> **A verified illustration**, not a field audit. The product/persona are fictional; the MCP server,
> its tool list, and every response below were captured by **really driving the built `corpus-mcp`
> server over stdio** (MCP SDK `Client` + `StdioClientTransport`) against a real workspace and the real
> `corpus` binary. "Documented gaps" are checkable surface facts, never imagined friction.

## Premise

**Persona.** A two-person team building on Claude Desktop / Cursor. They like Corpus's discipline but want
the **agent to query its task scope from a tool** rather than re-read (and possibly mis-summarize) the
packet — and they want the tool to surface _facts only_, never a verdict the agent could rubber-stamp.

**Adopts.** The starter kit **+ corpus-cli + corpus-mcp** (the MCP server is a thin stdio adapter over
`corpus <cmd> --json`). Builds on the same `checkout-discount` workspace as walkthrough 4.

## The walkthrough

### 1. Point the agent at the server

The MCP server is configured in the agent's MCP config (it requires the `corpus` binary on PATH — it
shells out to it):

```json
{
  "mcpServers": {
    "corpus": {
      "command": "corpus-mcp",
      "args": ["--workspace", "/path/to/workspace", "--corpus-bin", "corpus"]
    }
  }
}
```

On start it announces what it's bound to:

```
corpus-mcp: ready (workspace=/…/04-cli, corpus=/…/corpus-cli/bin/corpus.js)
```

### 2. What the agent can ask — 10 read/reconcile tools

```
=== listTools (10 tools) ===
  corpus_get_status        corpus_check_workspace   corpus_check_file
  corpus_scan_task         corpus_reconcile_review  corpus_validate_review_packet
  corpus_get_task          corpus_get_spec          corpus_get_review
  corpus_get_checks
```

Every tool is read-only or reconcile-only. None writes; none returns a Pass/Fail.

### 3. "What's on the board?" — `corpus_get_status`

```jsonc
{
  "noVerdictIssued": true,
  "noVerdictNote": "corpus-mcp surfaces facts only and issues no verdict. A human or an independent
                    reviewer owns the review result …",
  "source": { "command": "corpus status --json", "exitCode": 0 },
  "ok": true,
  "data": {
    "level": "clean",
    "specs": [ { "id": "SPEC-checkout-discount", "status": "ready",
      "tasks": [ { "id": "TASK-checkout-discount", "status": "ready",
                   "hasReview": false, "reviewStatus": null } ] } ],
    "tasksWithoutReview": [], "needsHuman": []
  }
}
```

The agent gets the board as data — and `noVerdictIssued: true` with a note that the _human_ owns the
result. This is the reconcile-only boundary, surfaced in every payload.

### 4. "What's my task scope?" — `corpus_get_task` → a real bug

The status above returned the task id `TASK-checkout-discount`. The agent passes exactly that id to
`corpus_get_task`:

```jsonc
// callTool corpus_get_task { task: "TASK-checkout-discount" }
{
  "source": {
    "command": "corpus show task checkout-discount --json",
    "exitCode": 2,
  },
  "ok": false,
  "data": {
    "error": "Usage",
    "message": "no tasks/checkout-discount.md in this workspace",
  },
  "note": "no tasks/checkout-discount.md in this workspace",
}
```

It **fails** — even though the task exists. See Documented gaps #1.

## Documented gaps (checkable surface facts only)

1. **`corpus_get_task` can't resolve a task created by `corpus new task` (a real bug).** The MCP strips the
   `TASK-` prefix from the id before shelling out — `corpus_get_task("TASK-checkout-discount")` runs
   `corpus show task checkout-discount`, which looks for `tasks/checkout-discount.md`. But `corpus new task`
   writes `tasks/TASK-checkout-discount.md`, so the lookup misses (exit 2). Directly checkable: in the
   workspace, `corpus show task TASK-checkout-discount` **succeeds** while `corpus show task
checkout-discount` **fails** (`no tasks/checkout-discount.md`). So the agent, handed the exact id
   `corpus_get_status` returned, gets "not found" for a task that exists. _(Filed as a corpus-hq finding.)_
2. **The server requires `corpus` (corpus-cli) on PATH** — it is a thin adapter that shells out to
   `corpus <cmd> --json`. An adopter who configured the MCP server without installing corpus-cli first gets
   no tools that work. (Observation of the `--corpus-bin` requirement + the startup line.)

## What it illustrates

The "agent queries its scope from a tool, and the tool never issues a verdict" adoption: 10 read/reconcile
tools, `noVerdictIssued: true` in every payload, corpus-cli as the only dependency. It also shows why
_executing_ the surface matters — the headline use case (`get_task` for the agent's own scope) is broken
for CLI-created tasks, which a written-from-imagination walkthrough would have shown working.

## To make this a real demo (Phase 2 seed)

Wire the real `corpus-mcp` into a Claude Desktop/Cursor config against a real `checkout-discount` workspace,
and record an actual agent session that calls `corpus_get_task` / `corpus_reconcile_review` mid-task — after
the `get_task` prefix bug (gap #1) is fixed, so the demo shows the intended happy path.
