# Canonical rules — verb-based extraction & FORM-L packing (v0.1)

Read this whole file before extracting. It defines *what* to extract and *how* to pack it.
The orchestration (find latest, gate, write) is in `SKILL.md`; the contract is in
`spec/forml-atom.schema.json` + `spec/FORML-ATOM-SPEC.md`.

---

## A. Verb-based content analysis

Requirements hide in **verbs of action / obligation / constraint**. Scan the transcript for clauses
where someone says the system/process **must, should, will, needs to, has to, excludes, calculates,
shows, recommends, validates, blocks, must not**, or describes a rule ("if …, then …", "without
changing …", "no more than …").

For each such clause, ask the four FORM-L base questions:
- **WHAT** must hold / be avoided? (the rule)
- **WHERE** in the system/data does it apply?
- **WHEN** — on what event/schedule? (or timeless)
- **HOW_WELL** — with what tolerance/threshold/probability? (or N/A)

Then add the extension questions: **WHO** owns/sourced it, **ELSE** (fallback if it can't be met),
**LIMIT** (hard invariant that must never break), **SIGNAL** (observable output).

**One need = one atom.** If a sentence packs several rules, split them. If several sentences
describe one rule, merge them into one atom with multiple `source[]` quotes.

### What to SKIP (not atoms)
- Pure status updates, scheduling, social talk, meta-discussion ("let's cover it next meeting…").
- Decisions about *process* with no system/behaviour implication.
- Restated background already captured as a `confirmed` atom (instead: add a `source[]` quote to it).

When in doubt, extract as `draft` with low `confidence` and an `Open question` — under-extraction is
worse than a flagged uncertain atom (the coverage critic will also catch misses).

---

## B. Field-by-field packing

| Field | How to fill from a transcript | Example (synthetic shop domain) |
|------|-------------------------------|--------------------------------|
| `intent` | One plain line a business owner and a dev both understand. | "Exclude out-of-stock products from the recommendation carousel" |
| `who` | Map speaker/role via the stakeholder register; or the system/role that owns the rule. | "Recommendation service (owner: Product Owner)" |
| `where` | Module / data scope / screen. Use the grain when relevant (SKU × store). | "recommendation carousel; product = SKU × store" |
| `when` | Event or schedule; `null` if structural/timeless. | "on each carousel render" |
| `what` | The rule itself, crisp. Keep the operator if quantitative. | "products flagged out-of-stock are removed from the carousel" |
| `how_well` | Threshold/SLO/probability. Many business rules are boolean → "N/A". Use numbers when stated (e.g. ≤200ms, daily, 70%). | "N/A (boolean)" or "threshold — [TBD with SME]" |
| `else` | What happens on missing data / unmet condition. Common pattern: NULL/new item → don't exclude. | "if stock status is unknown (new SKU) — do not exclude" |
| `limit` | Business/safety invariant that must never break. | "must not change the catalog page product count" |
| `signal` | Observable flag/output, else `null`. | "excluded_from_carousel flag" |
| `assumptions` | What must be true (data availability, definitions). | "stock status available per SKU from inventory" |
| `guards` | Validity conditions of the reasoning. | "stock feed within the agreed refresh window" |
| `observers` / `bindings` | The signal and its real source; `[]` if none. | observers: ["stockStatus(sku)"]; bindings: ["inventory.stock_status"] |
| `forml` | Only if genuinely formalizable; else `null`. Modelica_Requirements style. | `requirement RA-0001 = when carouselRender check (not outOfStock(sku));` |
| `scenarios` | nominal = happy path; negative = edge/guard cases (these become AC). | neg: ["new SKU not excluded", "catalog count unchanged"] |
| `levels` | Usually `[4]` (functional). Mark `[3]` for business-level statements. | [4] |
| `jira` | If an issue key is named. | ["SHOP-101"] |
| `confidence` | See calibration below. | 0.7 |

### Mandatory provenance (`source[]`)
At least one entry, each with `transcript` (filename) + `quote` (verbatim) + `timecode` (HH:MM:SS
if present) + `speaker`. Quote in the original language of the transcript. This is the
non-negotiable trust anchor — an atom without a real quote is invalid.

### Confidence calibration
- `0.8–1.0` — explicit, unambiguous, confirmed in-room, numbers given.
- `0.5–0.7` — clear intent but a parameter/threshold is open (`[TBD]` + `Open question`).
- `0.2–0.4` — inferred / one speaker / contradicted later. Keep as `draft`, flag heavily.

---

## C. Dedup & merge (against `registry/index.json`)

Before creating a new atom, look for an existing one with similar **(normalized WHAT + WHERE)**.
- **Same rule, new evidence** → append a `source[]` quote to the existing atom, raise `confidence`, do NOT create a new ID.
- **Refinement of an existing rule** → new atom, set `relations.refines: [RA-existing]`.
- **Contradiction** → new atom, set `relations.conflicts_with: [RA-existing]`; note both in `Open questions` (the conflict is a finding, not an error).
- **Changed/replaced rule** → new atom; on the old one set `status: superseded` + `relations.superseded_by: RA-new`. Never delete or silently overwrite.

> ⚠️ **G1 — never auto-merge on similarity alone.** `(WHAT+WHERE)` similarity will score an
> *exception* and the *rule it contradicts* as near-identical (e.g. "exclude items without a
> contract" vs "do NOT exclude own-brand items without a contract"). Similarity only *proposes* a
> candidate; you (or a human) must adjudicate `duplicate | refines | conflicts_with`.

ID allocation: next `RA-XXXX` = max existing + 1, zero-padded to 4 digits.

---

## D. Output discipline

- One file per atom: `registry/atoms/RA-XXXX-<slug>.md`. Frontmatter = the contract; body =
  `## Intent` · `## Source quotes` (verbatim + `[timecode]` + speaker) · `## Open questions`.
- Update `registry/index.json` (`count`, `generated_at`, one entry per atom with
  id/status/kind/intent/who/levels/jira/primary-source) and `registry/INDEX.md` (table row + INDEX-STATS).
- Keep YAML valid: quote strings with `:` or `#`; use `null` (not empty) for absent scalars; use `[]`/`{}` for absent collections.
- After writing, prefer running `workflow/validate.py` and fixing any contract errors. (Or feed the atoms JSON to `workflow/build_registry.py` to serialize deterministically.)

## E. Extraction report (to the user)
End with: count of new vs merged atoms; the list `RA-XXXX — intent (confidence)`; what was merged
or skipped and why; cross-atom relations created; and a short **coverage note** — themes in the
transcript that did NOT become atoms, so the human can judge recall.
