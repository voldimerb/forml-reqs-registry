---
name: render-atoms
description: >-
  "Unpacks" FORM-L requirement atoms from a forml-reqs-registry into a chosen abstraction level /
  artifact: stakeholder requirement, business requirement (L3), functional requirement + acceptance
  criteria (L4), user story (Connextra) + AC, vision of needs (L1), project scope (L2), dependency
  map (Mermaid), UX mapping (direct/reverse), or FORM-L code for simulation. This is the UNPACK step
  of the requirements registry pipeline (paired with `atomize-from-latest`): the atom is the single
  source of truth, and each artifact is a deterministic projection (nothing is invented; missing
  fields become `[TBD]`). Takes an atom selection (by `RA-XXXX`, theme, transcript, level, or status)
  + a target format, reads the registry + optional glossary, and writes the result to `renders/`.
  ALWAYS use this skill when the user types "/render-atoms", or asks to "unpack atoms", "render
  requirements", "make a user story from an atom", "make functional requirements from the registry",
  "build a requirements dependency map", "UX mapping of requirements", "expand atom RA-XXXX",
  "render requirements", or "stakeholder requirements from the registry" — even if the word "skill"
  is not used.
metadata:
  type: skill
---

# Render Atoms — unpack FORM-L atoms to abstraction levels

## Role & goal

You are an **AI requirements engineer**. Task: take **FORM-L atoms** from the registry (the single
source of truth) and **render** ("unpack") them into a concrete artifact at the needed abstraction
level — stakeholder/business/functional requirements, user stories, dependency maps, UX maps,
FORM-L code.

Principle: **render = deterministic projection**. Take only what is in the atom; **invent nothing**;
a missing field → an explicit `[TBD]` marker. This is the synthesis direction (levels 0–4).

Paired skill: `atomize-from-latest` (PACK). This one is UNPACK.

## Canonical templates

The exact "atom field → artifact element" mappings for each target are in
**[references/render-templates.md](references/render-templates.md)**. **Read that file first** and
reproduce the target template exactly. Field/level semantics are in `spec/abstraction-levels.md`
and `spec/FORML-ATOM-SPEC.md`.

## Configuration (edit once after install)

| Name | Path | Required |
|---|---|---|
| `REGISTRY_DIR` | `/ABSOLUTE/PATH/TO/forml-reqs-registry` | yes |
| `GLOSSARY` | `/ABSOLUTE/PATH/TO/glossary.md` | optional |

Derived (do not edit): atoms (read-only) → `REGISTRY_DIR/registry/atoms/`; index →
`REGISTRY_DIR/registry/index.json`; templates → `references/render-templates.md`; output →
`REGISTRY_DIR/renders/`.

## Target formats (`<target>`)

| `<target>` | Builds | Level |
|---|---|---|
| `functional-req` | Functional requirement + acceptance criteria | L4 |
| `user-story` | `As a … I want … so that …` + AC (Given/When/Then) | L4 |
| `business-req` | Business requirement in business language | L3 |
| `scope` | Cluster of atoms → a scope/feature item (roll-up by `where`/theme) | L2 |
| `vision` | Vision of needs (roll-up by `who`/theme) | L1 |
| `dependency-map` | Mermaid graph from `relations.depends_on`/`refines`/`conflicts_with` | — |
| `ux-direct` | Requirement → UI elements & behaviour flows | — |
| `ux-reverse` | Screen → which atoms govern each element (coverage view) | — |
| `forml-code` | Concatenation of `forml:` blocks for Modelica_Requirements | simulation |

## Workflow

### Step 0 — Parse the request
From the invocation determine: **(a) the atom selection**, **(b) the target `<target>`**.
- Selection: by `RA-XXXX` (one/list), by theme/keyword, by source transcript, by `levels`, by `status` (e.g. only `confirmed`), or "all".
- Examples: `/render-atoms RA-0001 as user-story` · `/render-atoms theme=stock as functional-req` · `/render-atoms all confirmed as dependency-map`.

If the **target or selection is unclear**, ask one short clarifying question and stop (don't render
blind). If it's clear, proceed without a gate (read-only input; writes only to `renders/`).

### Step 1 — Load
1. `registry/index.json` — resolve the selection to concrete `RA-XXXX`.
2. The selected atom files `registry/atoms/RA-XXXX-*.md` (in full).
3. `spec/abstraction-levels.md` + `references/render-templates.md` — the target template.
4. Glossary (read-only, optional) — for correct terms in human-readable output.

### Step 2 — Render
Apply the `<target>` template to each atom (or to the cluster for `scope`/`vision`/`dependency-map`/`ux-*`). Rules:
- **Atom fields only.** A missing field → `[TBD]` (don't invent thresholds, estimates, priorities).
- **Trace is mandatory** in the output: each item carries its `RA-XXXX` and a short `Source: <transcript> [<timecode>]`.
- For roll-ups (`scope`/`vision`) — synthesize from `intent`/`who`/`where`, listing member atoms.
- For `dependency-map` — Mermaid `graph TD`; `conflicts_with` as red dashed edges.

### Step 3 — Save to `renders/`
Name: `<YYYY-MM-DD>_<target>_<scope-hint>.md` (where `<scope-hint>` is e.g. `RA-0001` or `stock` or
`confirmed`). Inside: a header with the render parameters (selection, target, date, atom list) + the
generated artifact. Print the path and a short preview to the user.

## Invariants (do not break)
- **Atoms are read-only**: this skill never changes `registry/` — it only reads and writes to `renders/`.
- **Invent nothing**: projection ⊆ atom content; missing → `[TBD]`.
- **Trace** in every artifact: `RA-XXXX` + source.
- **Round-trip honesty**: if an atom is too thin for a good `<target>` (e.g. no `scenarios` for AC), flag it in the output rather than fake completeness.
- If the selection is empty (no matches), say so plainly; don't render a blank.
