# Render templates — atom → artifact (v0.1)

Apply the block for the requested `<target>`. Substitute `{field}` from the atom's frontmatter.
A missing/`null` field renders as `[TBD]`. Every output item keeps its trace line. Never invent
values (priorities, story points, thresholds) that aren't in the atom.

Trace line (reused everywhere):
`> Trace: {id} ← {source[0].transcript} [{source[0].timecode}] {source[0].speaker}{ " | Jira: "+join(jira) if jira }`

---

## functional-req  (L4)

```
### FR-{id} — {intent}
**Statement.** When {when|"applicable"}, **{where}** shall ensure that {what}{ " within "+how_well if how_well and how_well!="N/A" }.

**Acceptance criteria**
- AC1 (nominal): {each scenarios.nominal as "Given … When … Then …"}
- AC2 (negative): {each scenarios.negative}
- AC3 (fallback): If {what} cannot be met → {else}.            ← omit if else is null
- AC4 (invariant): {limit} must always hold.                   ← omit if limit is null
- AC5 (measure): {how_well}.                                   ← only if how_well is quantitative

**Owner:** {who}  **Status:** {status}  **Kind:** {kind}
{Trace line}
```
If `scenarios` is empty → print `_AC: [TBD — no scenarios captured in source]_` (don't fabricate).

## user-story  (L4)

```
### {id} — {intent}
**As a** {who}, **I want** {what} in {where}, **so that** {intent}.

**Acceptance criteria (Given/When/Then)**
- {each scenarios.nominal → "Given <ctx>, When "+(when|"…")+", Then <result>"}
- {each scenarios.negative → negative GWT}
- Fallback: {else}            ← if present
- Must never: {limit}         ← if present

**Priority:** [TBD]  **Estimate:** [TBD]  **Status:** {status}
{Trace line}
```

## business-req  (L3)

```
### BR-{id} — {intent}
{who} needs {intent}{ ", constrained by "+limit if limit }.
Rationale (verbatim): "{source[0].quote}"
{Trace line}
```
Drop formal operators/signals — business language only.

## scope  (L2, roll-up — input is a cluster of atoms)

```
## Scope item: {cluster name = common where/theme}    WBS: [TBD]
Covers {N} atoms: {list ids + one-line intents}
Open conflicts in cluster: {pairs where a.conflicts_with includes b}    ← else "none"
Member traces: {ids → sources}
```

## vision  (L1, roll-up by WHO)

```
## Vision — {who}
{1–2 sentence synthesis of the member atoms' intents, from this actor's point of view.}
Backed by: {member ids}
```
Pure synthesis from `intent`; no new claims.

## dependency-map  (BA Astound Way step 4)

```mermaid
graph TD
  %% one edge per relations.depends_on / refines
  {child_id} --> {parent_id}            %% child depends_on parent
  {a_id} -.conflict.-> {b_id}           %% relations.conflicts_with (style red)
  classDef conflict stroke:#c00,stroke-width:2px,stroke-dasharray:4;
```
Below the graph, a legend table: `{id} | {intent} | status`. Nodes with no edges are listed as
"standalone".

## ux-direct  (req → UI, step 6)

For each atom whose `where` names a screen/UI element:
```
### {where}  (from {id})
- Layout element implied: {what → the control/field/list}
- Behavior flow: trigger = {when}; action = {what}; empty/error state = {else|"[TBD]"}
- Signal shown: {signal|"[none]"}
{Trace line}
```

## ux-reverse  (UI → req, step 6 — input is a screen name)

```
## Screen: {screen}
| UI element | Governed by | Rule |
|---|---|---|
| {element} | {id(s) whose where matches} | {what} |
Coverage gaps: {elements with no atom} = "[uncovered — candidate for elicitation]"
```

## forml-code  (simulation)

```
// Generated from forml-reqs-registry — Modelica_Requirements style
{for each atom with forml != null:}
{forml}

// Not yet formalizable ({count}): {ids with forml==null} — reason: non-quantitative / no temporal op
```
