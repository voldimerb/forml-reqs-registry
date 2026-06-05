# Examples — a worked, fully synthetic run

This folder shows the pipeline end-to-end on a **synthetic** transcript (no real data).

- `transcript/2024-01-15_sample-elicitation_cleaned.md` — the raw cleaned transcript (input to PACK).
- `atoms/RA-0001…RA-0004.md` — the FORM-L atoms packed from it (what `atomize-from-latest` produces).
- `index.json` — the machine index over those atoms (what `build_registry.py` produces).
- `renders/2024-01-16_RA-0001_user-story.md` — one projection (what `render-atoms` produces).

## What each atom demonstrates

| Atom | Demonstrates |
|---|---|
| RA-0001 | `else` (new-SKU fallback) + `limit` (catalog-count invariant) + multi-quote provenance |
| RA-0002 | a plain business-rule exclusion |
| RA-0003 | **the dedup trap (G1):** an *exception* that similarity would merge into RA-0002 — handled as `refines` |
| RA-0004 | a non-functional rule where `how_well` carries a real SLO (≤ 200 ms) |

The "trending badge" floated at `[00:11:45]` is deliberately **under-specified** → it does **not**
become a firm atom (it would be a low-confidence draft with an open question, or left for the
coverage critic). This shows the "don't invent requirements" discipline.

## Reproduce

With the two skills installed and `REGISTRY_DIR` / `TRANSCRIPTS_DIR` configured (point
`TRANSCRIPTS_DIR` at this `examples/transcript/` folder):

1. `/atomize-from-latest` → packs atoms from the sample transcript into `registry/`.
2. `/render-atoms RA-0001 as user-story` → writes a projection to `renders/`.

Or run the batch self-validation workflow (the default transcript is this bundled sample):

```
Workflow({ scriptPath: "<REGISTRY_DIR>/workflow/forml-pipeline.workflow.js",
           args: { registry: "<REGISTRY_DIR>" } })
```
