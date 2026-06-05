# forml-reqs-registry — FORM-L Requirement Atom Registry

> **Distill → Pack → Render.** Extract requirements from the *raw elicitation transcript*,
> pack each into a compact formal **FORM-L atom**, store it in an updatable registry, and
> render ("unpack") to any abstraction level on demand. The atom is the single source of
> truth; PRD / stakeholder-reqs / user-stories / UX-maps become **projections** of it.

A prototype for **AI-assisted requirements engineering** that *challenges* its own idea — the
batch workflow measures whether the loop actually holds (round-trip fidelity, coverage, FORM-L fit)
rather than asserting that it does.

> Built for **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** — ships two Agent
> Skills (PACK + UNPACK) and a Workflow harness. The spec, schema, and Python helpers are
> tool-agnostic.

---

## The problem this attacks

In many teams, every requirements artifact (PRD, epics, refinement packages, user stories) is
**re-derived from scratch** out of the transcripts. The same content is re-read and re-interpreted
for each artifact and each abstraction level — expensive, drifty, and impossible to keep in sync.
There is no single, updatable source of truth that traces back to *what was actually said in the
room*.

## The model

```
RAW cleaned transcript ──distill──▶ [ Requirement Atom ] ──render──▶ L1 Vision of needs
  (verbatim, timecoded)              FORM-L + provenance              L3 Business requirement
                                            │                         L4 Functional req + AC
                                            ▼                         User story + AC
                                      registry/atoms/ ──────────────▶ Dependency map (Mermaid)
                                      (updatable, versioned)          UX mapping (direct/reverse)
                                                                      FORM-L code (simulation)
```

A **Requirement Atom** = extended FORM-L (Nguyen 2014; Bouskela et al. 2021/2022):

```
R = [WHO][WHERE][WHEN][WHAT][HOW_WELL][ELSE][LIMIT][SIGNAL]
    + assumptions/guards/observers/bindings/scenarios/verdict_policy
    + MANDATORY provenance (verbatim transcript quote + timecode + speaker)
```

Full field semantics: [`spec/FORML-ATOM-SPEC.md`](spec/FORML-ATOM-SPEC.md).
Schema (validates every atom's frontmatter): [`spec/forml-atom.schema.json`](spec/forml-atom.schema.json).
Render targets ↔ requirement levels 0–4: [`spec/abstraction-levels.md`](spec/abstraction-levels.md).

## Layout

```
spec/        the contract — atom spec, JSON Schema, render-target definitions
skills/      the two Claude Code skills that drive it (PACK + UNPACK)
registry/    atoms/*.md (one per atom) + index.json (machine) + INDEX.md (human)  ← starts empty
renders/     on-demand projections (FR lists, user stories, dependency maps, …)
workflow/    forml-pipeline.workflow.js (challenge harness) + validate.py + build_registry.py
examples/    a fully synthetic worked run (transcript → 4 atoms → index → a render)
```

The two skills:
- **`skills/atomize-from-latest`** — PACK: latest `*_cleaned.md` → atoms → registry (gate-based).
- **`skills/render-atoms`** — UNPACK: select atoms + target level → projection in `renders/`.

## Install

Requires **Claude Code**, **Python 3** + **PyYAML** (`pip3 install pyyaml`), and (for the batch
harness) Node-checked JS via Claude Code's Workflow tool.

```bash
git clone https://github.com/voldimerb/forml-reqs-registry.git
cd forml-reqs-registry

# install the two skills for Claude Code (user scope)
mkdir -p ~/.claude/skills
cp -R skills/atomize-from-latest ~/.claude/skills/
cp -R skills/render-atoms       ~/.claude/skills/
```

Then open the **Configuration** block in each installed `SKILL.md` and set your absolute paths:

| File | Set |
|---|---|
| `~/.claude/skills/atomize-from-latest/SKILL.md` | `REGISTRY_DIR` (this clone) + `TRANSCRIPTS_DIR` (your cleaned transcripts); glossary/stakeholders optional |
| `~/.claude/skills/render-atoms/SKILL.md` | `REGISTRY_DIR` |

> **No transcripts yet?** Point `TRANSCRIPTS_DIR` at `examples/transcript/` — a synthetic sample is
> bundled, so the pipeline runs out of the box. See [`examples/`](examples/README.md).

See [`docs/SETUP.md`](docs/SETUP.md) for details and troubleshooting.

## How to run

**Interactive (daily use):**
1. `/atomize-from-latest` → loads spec/index (and optional context), **stops at the gate** (asks for
   extra sources), then extracts atoms from the newest cleaned transcript into `registry/`.
2. `/render-atoms RA-0001 as user-story` (or `as functional-req`, `as dependency-map`, …) → writes
   the projection to `renders/`.

**Batch + self-validation (the challenge):**
```js
Workflow({ scriptPath: "<REGISTRY_DIR>/workflow/forml-pipeline.workflow.js",
           args: { registry: "<REGISTRY_DIR>" } })   // defaults to the bundled sample transcript
```
Runs extract → merge → round-trip & FORM-L-fit validation → coverage critic → render, and returns
atoms + per-atom verdicts + an honest assessment.

**Validate atoms against the schema:**
```bash
python3 workflow/validate.py          # checks every registry/atoms/*.md vs the contract
```

## The "challenge" — where this could fail (stated up front)

This prototype is built to be falsified, not sold. Known tensions:

1. **FORM-L is a cyber-physical-systems language.** It assumes continuous time, physical signals,
   and a simulatable model. Business/application requirements are mostly *event/state + business
   rules*. ⇒ `HOW_WELL`, `signal`, `observers`, `bindings`, `forml` are often thin or `N/A`. They
   earn their place only where rules are genuinely quantitative/temporal (latency budgets,
   availability %, scheduled recalculation). The **WHO / ELSE / LIMIT** extension is what makes
   FORM-L usable for business software at all — it carries ownership and resilience semantics base
   FORM-L lacks.

2. **Packing can be lossy.** Rationale, stakeholder politics, and the "why" can evaporate in
   compression. Mitigation: provenance (`source[]`) is *mandatory* and `intent` is preserved.
   The round-trip test measures residual loss numerically.

3. **Round-trip fidelity is the falsifiable claim.** If `render(pack(text)) ≉ text`, the idea fails
   for that atom. The workflow scores it 0–1 per atom and reports the misses.

4. **Coverage (recall).** Verb-based extraction can miss needs. The workflow runs a coverage critic
   that re-reads the full transcript and lists needs captured by *no* atom.

## Known limitations

- **G1 — dedup must not auto-merge on similarity.** A `(WHAT + WHERE)` similarity key will merge an
  *exception* into the *rule* it contradicts. Treat similarity as a *proposal*; adjudicate
  `duplicate | refines | conflicts_with` with a human or a second LLM pass. Demonstrated in
  [`examples/`](examples/README.md) (RA-0002 vs RA-0003).
- **G2 — render determinism.** Source-pinned fields (`intent`, `what`, `source[]`, `who`) are
  stable across runs; interpretation fields (`where` grain, `scenarios`, `kind`, `levels`) carry
  extractor judgement and can drift. Pin/normalize them before trusting a version history.
- **Confirm-at-scale.** `draft → confirmed` is a human step; at hundreds of atoms it needs a real
  review UX (and a `modality` field: proposal / decision / concern) to avoid rubber-stamping.

## Provenance & status

- Atoms trace to the **raw cleaned transcript**, never an aggregated MoM (closer to source truth).
- `draft` atoms become `confirmed` only after stakeholder validation.
- Nothing is silently overwritten: a changed requirement supersedes the old atom and preserves it.

## Credits & license

Based on **FORM-L** (FOrmal Requirements Modeling Language; Nguyen 2014; Bouskela et al. 2021/2022),
extended with `WHO/ELSE/LIMIT/SIGNAL` + mandatory provenance for business/application software.
MIT licensed — see [`LICENSE`](LICENSE).
