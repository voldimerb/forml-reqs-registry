# FORM-L Requirement Atom — Specification

> The canonical, abstraction-neutral unit of the requirements registry.
> Based on **FORM-L** (FOrmal Requirements Modeling Language; Nguyen 2014; Bouskela et al.
> 2021/2022), extended for business/application software and wired for full traceability.

## 1. Why an "atom"

In a typical project, each requirements artifact (PRD, epics, refinement package, user story) is
**re-derived from scratch** out of the raw transcripts. The same elicitation content is re-read for
every artifact and every abstraction level → expensive, drifty, no single source of truth.

The atom inverts that: we **distill once** from the raw transcript into a compact formal unit,
store it in a registry, and **render** ("unpack") it to any abstraction level on demand. The atom
is the source of truth; PRD / stakeholder-reqs / user-stories / UX-maps are **projections**.

```
raw transcript ──distill──▶ [ Requirement Atom ] ──render──▶ L1 vision
   (what was                  (FORM-L + provenance)            L3 business req
    actually said)                   │                          L4 functional req + AC
                                     │                          user story + AC
                                     └── registry ────────────▶ dependency map / UX / FORM-L code
```

## 2. The formula

FORM-L (Nguyen 2014; Bouskela et al. 2021/2022) writes a requirement as:

```
R = [WHERE][WHEN][WHAT][HOW_WELL]
```

We extend it to make it fit business/application software and to assign ownership and resilience
semantics:

```
R = [WHO][WHERE][WHEN][WHAT][HOW_WELL][ELSE][LIMIT][SIGNAL]
```

| Slot | FORM-L meaning | In business/application software |
|------|----------------|----------------------------------|
| **WHO** | Actor/Role (Role, Artifact, Ext. System) — *defines intent/responsibility* | Stakeholder/role/system that owns or sourced the need (e.g. *Product Owner*, *recommendation service*, *inventory service*). Extension. |
| **WHERE** | Component, subsystem, set of objects | Module / data scope / screen (e.g. *recommendation carousel*, *product = SKU × store*, *catalog page*). |
| **WHEN** | Time locator or event trigger (→ ETL) | Event or schedule (e.g. *on each carousel render*, *after the user opens the cart*). `null` if timeless. |
| **WHAT** | The formal condition | The rule that must hold (e.g. *exclude products flagged out-of-stock*). |
| **HOW_WELL** | Tolerance / probability / degradation (→ ProbabilisticConstraint) | Threshold / SLO / acceptable degradation. Often a plain number or `N/A`. |
| **ELSE** | Fallback / Degradation Mode | What happens if WHAT can't be met / data missing (e.g. *treat unknown stock as pass — new SKU*). Extension. |
| **LIMIT** | Hard Boundary / Invariant | A safety/business invariant that must NEVER break (e.g. *recommendation failure must not break the catalog page*). Extension. |
| **SIGNAL** | Observer output | Observable signal the rule emits/checks (e.g. *exclusion flag on a product*). Extension. |

### Supporting apparatus (FORM-L)
- **assumptions** — taken as true for the requirement to hold.
- **guards** — model-validity conditions; if violated the reasoning is no longer consistent.
- **observers** — turn physical/business concepts into functional signals.
- **bindings** — where those signals come from in the real system/model.
- **scenarios** (nominal / negative) — drive acceptance criteria on render.
- **verdict_policy** — which statuses block release.

### Traceability (the whole point)
- **source[]** — MANDATORY. Verbatim quote + timecode + speaker from the **raw cleaned
  transcript** (never a summarized minutes-of-meeting). Minimum one entry. Without provenance an
  atom is invalid.
- **relations** — `depends_on` / `refines` / `conflicts_with` / `superseded_by` between atoms.
- **levels** — native requirement-leveling level(s) 0–4 (see `abstraction-levels.md`).
- **jira**, **glossary_terms**, **confidence** — supporting metadata.

## 3. File shape

One Markdown file per atom: `registry/atoms/RA-XXXX-<slug>.md`. YAML frontmatter holds the
structured contract (validated by `forml-atom.schema.json`); the body holds the human layer.

```markdown
---
id: RA-0001
intent: "Exclude out-of-stock products from the recommendation carousel without shrinking the catalog page"
status: draft
kind: business_rule
who: "Recommendation service (owner: Product Owner)"
where: "recommendation carousel; product = SKU × store"
when: "on each carousel render"
what: "Products flagged out-of-stock are removed from the recommendation carousel"
how_well: "N/A (boolean exclusion)"
else: "if stock status is unknown (new SKU) — do not exclude (fallback: keep)"
limit: "must not change the number of products shown on the category/catalog page"
signal: "excluded_from_carousel flag"
assumptions:
  - "stock status is available per SKU from the inventory service"
guards:
  - "stock feed is not older than the agreed refresh window"
observers: ["stockStatus(sku)"]
bindings: ["inventory.stock_status"]
forml: |
  requirement RA-0001 =
    when carouselRender
    check (not outOfStock(sku)) ;
scenarios:
  nominal:
    - "Out-of-stock SKU is omitted from the carousel"
  negative:
    - "New SKU (unknown stock) is NOT excluded"
    - "Catalog page product count is unchanged after exclusion"
verdict_policy: "negative scenarios must pass before release"
levels: [4]
relations:
  depends_on: []
  refines: []
  conflicts_with: []
  superseded_by: null
source:
  - transcript: "2024-01-15_sample-elicitation_cleaned.md"
    timecode: "00:03:12"
    speaker: "Product Owner"
    quote: "We should hide out-of-stock items from the carousel, but the category page must still show the full catalog."
jira: ["SHOP-101"]
glossary_terms: ["carousel", "SKU", "out-of-stock"]
confidence: 0.7
extracted_by: "atomize-from-latest v0.1"
extracted_at: "2024-01-16"
---

## Intent
Expanded paragraph if the one-liner needs nuance.

## Source quotes
- `[00:03:12]` **Product Owner:** «We should hide out-of-stock items from the carousel, but the category page must still show the full catalog.»

## Open questions
- Is there a stock threshold (e.g. < N units) or is it a strict boolean? (confirm with SME)
```

## 4. Lifecycle & dedup
- New extraction creates `draft` atoms. A later session can **merge** into an existing atom
  (append a `source[]` entry, bump `confidence`) instead of duplicating — dedup key is
  `(normalized WHAT + WHERE)` similarity.
- Stakeholder confirmation flips `draft → confirmed`.
- A changed requirement creates a new atom and sets the old one's `relations.superseded_by`
  + `status: superseded` (never silently overwrite — provenance is preserved).

> ⚠️ **Known dedup limitation (G1).** `(WHAT + WHERE)` similarity alone will merge an *exception*
> into the *rule* it contradicts (e.g. "exclude products without a contract" vs "do **not** exclude
> own-brand products without a contract"). Treat similarity as a *proposal* only — adjudicate
> `duplicate | refines | conflicts_with` with a human or a second LLM pass. Never auto-merge on
> similarity. See `README.md` → "Known limitations".

## 5. Honest limits (see README → "The challenge")
FORM-L was built for **cyber-physical systems** (continuous time, physical signals, simulation).
For business/application software `HOW_WELL`, `signal`, `observers`, `bindings`, and `forml` are
often thin or `N/A`. They are kept because (a) some rules *are* quantitative/temporal (availability
%, daily recalculation, latency budgets) and map cleanly, and (b) the WHO/ELSE/LIMIT extension
carries the business-resilience semantics that base FORM-L lacks.
