# Adoption walkthrough 5 — the agent queries its scope over MCP

> **A verified illustration**, not a field audit. The product/persona are fictional; the MCP server,
> its tool list, and every response below were captured by **really driving the built `suspec-mcp`
> server over stdio** (MCP SDK `Client` + `StdioClientTransport`) against a real workspace and the real
> `suspec` binary. "Documented gaps" are checkable surface facts, never imagined friction.

## Premise

**Persona.** A two-person team building on Claude Desktop / Cursor. They like Suspec's discipline but want
the **agent to query its task scope from a tool** rather than re-read (and possibly mis-summarize) the
packet — and they want the tool to surface _facts only_, never a verdict the agent could rubber-stamp.

**Adopts.** The starter kit **+ suspec-cli + suspec-mcp** (the MCP server is a thin stdio adapter over
`suspec <cmd> --json`). Builds on the same `checkout-discount` workspace as walkthrough 4.

## The walkthrough

### 1. Point the agent at the server

The MCP server is configured in the agent's MCP config (it requires the `suspec` binary on PATH — it
shells out to it):

```json
{
  "mcpServers": {
    "suspec": {
      "command": "suspec-mcp",
      "args": ["--workspace", "/path/to/workspace", "--suspec-bin", "suspec"]
    }
  }
}
```

On start it announces what it's bound to:

```
suspec-mcp: ready (workspace=/…/04-cli, suspec=/…/suspec-cli/bin/suspec.js)
```

### 2. What the agent can ask — 12 tools (8 read · 1 reconcile · 3 safe-write)

```
=== listTools (12 tools) ===
  suspec_get_status        suspec_list              suspec_check_workspace
  suspec_check_file        suspec_get_task          suspec_get_spec
  suspec_get_review        suspec_get_checks        suspec_reconcile
  suspec_scaffold_spec     suspec_split_task        suspec_scaffold_finding
```

The read and reconcile tools never write; the three safe-write tools (`suspec_scaffold_spec`,
`suspec_split_task`, `suspec_scaffold_finding`) only scaffold a fresh artifact — they write no
board, no review result, and overwrite nothing. None returns a Pass/Fail.

### 3. "What's on the board?" — `suspec_get_status`

```jsonc
{
  "noVerdictIssued": true,
  "noVerdictNote": "suspec-mcp surfaces facts only and issues no verdict. A human or an independent
                    reviewer owns the review result …",
  "source": { "command": "suspec status --json", "exitCode": 0 },
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

### 4. "What's my task scope?" — `suspec_get_task` → a real bug

The status above returned the task id `TASK-checkout-discount`. The agent passes exactly that id to
`suspec_get_task`:

```jsonc
// callTool suspec_get_task { task: "TASK-checkout-discount" }
{
  "source": {
    "command": "suspec show task checkout-discount --json",
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

1. **`suspec_get_task` can't resolve a task created by `suspec new task` (a real bug).** The MCP strips the
   `TASK-` prefix from the id before shelling out — `suspec_get_task("TASK-checkout-discount")` runs
   `suspec show task checkout-discount`, which looks for `tasks/checkout-discount.md`. But `suspec new task`
   writes `tasks/TASK-checkout-discount.md`, so the lookup misses (exit 2). Directly checkable: in the
   workspace, `suspec show task TASK-checkout-discount` **succeeds** while `suspec show task
checkout-discount` **fails** (`no tasks/checkout-discount.md`). So the agent, handed the exact id
   `suspec_get_status` returned, gets "not found" for a task that exists. _(Filed as a suspec-works finding.)_
2. **The server requires `suspec` (suspec-cli) on PATH** — it is a thin adapter that shells out to
   `suspec <cmd> --json`. An adopter who configured the MCP server without installing suspec-cli first gets
   no tools that work. (Observation of the `--suspec-bin` requirement + the startup line.)

## What it illustrates

The "agent queries its scope from a tool, and the tool never issues a verdict" adoption: 10 read/reconcile
tools, `noVerdictIssued: true` in every payload, suspec-cli as the only dependency. It also shows why
_executing_ the surface matters — the headline use case (`get_task` for the agent's own scope) is broken
for CLI-created tasks, which a written-from-imagination walkthrough would have shown working.

## To make this a real demo (Phase 2 seed)

Wire the real `suspec-mcp` into a Claude Desktop/Cursor config against a real `checkout-discount` workspace,
and record an actual agent session that calls `suspec_get_task` / `suspec_reconcile` mid-task — after
the `get_task` prefix bug (gap #1) is fixed, so the demo shows the intended happy path.
