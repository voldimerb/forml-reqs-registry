---
name: atomize-from-latest
description: >-
  Extracts requirements from the LATEST cleaned elicitation transcript (`*_cleaned.md`) and packs
  each into a compact formal FORM-L requirement atom (`R = [WHO][WHERE][WHEN][WHAT][HOW_WELL][ELSE][LIMIT][SIGNAL]`
  + observers/bindings/scenarios + MANDATORY provenance to a verbatim quote with timecode) in a
  forml-reqs-registry. Works on the RAW transcript (not a summarized minutes-of-meeting): does
  verb-based content analysis, dedupes against existing atoms, writes one `.md` file per atom and
  updates index.json/INDEX.md. It finds the newest cleaned file, loads the registry spec + index
  (and an optional domain glossary / stakeholder register / context docs), runs a MANDATORY gate
  (asks for extra sources and waits), and only then writes atoms. ALWAYS use this skill when the
  user types "/atomize-from-latest", or asks to "extract requirements from a transcript", "pack
  requirements", "make requirement atoms", "atomize", "populate the requirements registry", or
  "FORM-L atoms" — even if the word "skill" is not used. This is the PACK step of the requirements
  registry pipeline; the paired UNPACK skill is `render-atoms`.
metadata:
  type: skill
---

# Atomize from Last Cleaned — pack requirements into FORM-L atoms

## Role & goal

You are an **AI requirements engineer**. Task: from the **newest cleaned transcript** (`*_cleaned.md`)
and project context, extract **atomic requirements** and pack each into a **FORM-L atom** — a compact,
formal, abstraction-neutral unit of the requirements registry.

Principle: **distill once → pack → (later) render**. The atom is the single source of truth; PRD /
stakeholder-reqs / user stories / UX maps become its **projections** (built by the paired skill
`render-atoms`).

**Work on the RAW transcript, not a summarized MoM.** A MoM is already an interpretation; atoms must
trace to what was *actually said*, with a timecode and a verbatim quote.

## Canonical rules + packing

The exact rules for verb-based extraction, mapping to FORM-L fields, provenance, dedup, and the
`draft`-status policy are in **[references/atomize-prompt.md](references/atomize-prompt.md)**.
**Read that file first.** The field-by-field contract is in `spec/forml-atom.schema.json`; semantics
and a worked example are in `spec/FORML-ATOM-SPEC.md`. SKILL.md describes orchestration; the
reference and spec describe *what* to write and *in what format*.

## Configuration (edit once after install)

Replace these placeholders with absolute paths for your project. `REGISTRY_DIR` is your clone of
this repo. Glossary / stakeholders / context are OPTIONAL — skip any you don't have.

| Name | Path | Required |
|---|---|---|
| `REGISTRY_DIR` | `/ABSOLUTE/PATH/TO/forml-reqs-registry` | yes |
| `TRANSCRIPTS_DIR` | `/ABSOLUTE/PATH/TO/your/cleaned_transcripts` | yes |
| `GLOSSARY` | `/ABSOLUTE/PATH/TO/glossary.md` | optional |
| `STAKEHOLDERS` | `/ABSOLUTE/PATH/TO/stakeholder-register.md` | optional |
| `CONTEXT_DIR` | `/ABSOLUTE/PATH/TO/vision-or-context/` | optional |

Derived paths (do not edit): atoms → `REGISTRY_DIR/registry/atoms/`; index →
`REGISTRY_DIR/registry/index.json` + `INDEX.md`; contract → `REGISTRY_DIR/spec/`; validator →
`REGISTRY_DIR/workflow/validate.py`.

> First run with no transcripts of your own? Set `TRANSCRIPTS_DIR` to
> `REGISTRY_DIR/examples/transcript` — a synthetic sample is bundled.

## Workflow

### Step 0 — Find the newest cleaned transcript

Pick "newest" **by the `YYYY-MM-DD` date prefix in the filename**; mtime is only a tiebreak.
Substitute your configured `TRANSCRIPTS_DIR` for the path below.

```bash
find "$TRANSCRIPTS_DIR" -type f -iname '*.md' -print0 \
| while IFS= read -r -d '' f; do
    b=$(basename "$f"); d=$(printf '%s' "$b" | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}' || true)
    printf '%s\t%s\t%s\n' "${d:-0000-00-00}" "$(stat -f '%m' "$f")" "$f"
  done | sort -t"$(printf '\t')" -k1,1r -k2,2nr | head -5 | cut -f3-
```

The top line is the **Primary Source** (the raw cleaned transcript to atomize).

### Step 1 — Load context

1. **Spec + schema** — `FORML-ATOM-SPEC.md` and `forml-atom.schema.json` (the contract you hold to). **Required.**
2. **Existing `registry/index.json`** — to **dedupe/merge** rather than duplicate, and to know the next free `RA-XXXX`. **Required.**
3. **Glossary** (read-only) — check domain terms; fill `glossary_terms`. *Optional.*
4. **Stakeholder register** — map speaker names/roles into the `who` field. *Optional.*
5. **Context / vision docs** — for `levels` and scope linkage. *Optional.*

### Step 2 — MANDATORY gate (stop and wait for a reply) ⛔

The single most important behaviour. The gate is a chance to add sources and **confirm the right
cleaned file** before writing atoms.

**On the FIRST turn** (where `/atomize-from-latest` was invoked) print **ONLY**:

1. **Primary cleaned transcript:** the path from Step 0.
2. **Registry state:** how many atoms already exist and the next `RA-XXXX`.
3. **Context loaded:** confirmation of what was read (spec+schema, index, and any optional context).
4. **Question to the user (verbatim):**

   > Do you want to add any extra context sources? You can provide:
   > - Links to wiki / Confluence pages
   > - Paths to other files in the project
   > - Any other source that helps understand the context better

5. **Handoff:** extraction and writing happen **only after a reply** in the next message; "no / none / go ahead / continue" ends the gate.

**STRICTLY FORBIDDEN before the user replies in the next message:** creating/writing any `RA-XXXX-*.md`,
changing `index.json`/`INDEX.md`, or doing Step 3.

### Step 3 — Extract, pack, merge, save (only after the gate)

Precondition: the user replied. Then, per `references/atomize-prompt.md`:

1. Read the **raw cleaned transcript** in full + any extra sources from the gate.
2. **Verb-based content analysis** → a list of atomic functional/non-functional needs.
3. For each need **pack a FORM-L atom**: fill fields per the spec; `source[]` MUST carry a **verbatim quote + timecode + speaker**; `status: draft`; honest `confidence`; `glossary_terms`/`jira`/`levels` where applicable. Fields the domain doesn't give (often `signal`/`observers`/`how_well`) → `null`/`N/A` — **do not invent**.
4. **Dedupe/merge** against `index.json`: if a need already exists, **append** to it (add a `source[]` entry, raise `confidence`) instead of duplicating. Otherwise allocate the next `RA-XXXX`. (See the G1 caveat in the rules file — never auto-merge on similarity alone.)
5. Write each new/updated atom to `registry/atoms/RA-XXXX-<slug>.md` (slug = short ascii kebab from `intent`).
6. Update `registry/index.json` (count + one row per atom) and `registry/INDEX.md` (table + INDEX-STATS).
7. (Recommended) run `python3 REGISTRY_DIR/workflow/validate.py` and fix any contract errors.
8. Print an **extraction report**: count of new/updated atoms, their `RA-XXXX` + `intent`, what was dropped as a duplicate, open questions, and an honest coverage note ("what in the transcript did NOT become an atom, and why").

## Atom naming

Atoms are **not** 1:1 with a transcript, so the filename is by ID, not by transcript:
`registry/atoms/RA-XXXX-<slug>.md`, where `<slug>` is a short ascii-kebab from `intent` (≤ 6 words).
Example: `RA-0001-exclude-out-of-stock-from-carousel.md`. IDs increase monotonically; never reused after `deprecated`.

## Invariants (do not break)

- **Provenance is mandatory**: every atom has ≥1 `source[]` with a verbatim quote from the RAW transcript (not a MoM) and, where present, a timecode. An atom with no source is invalid.
- **Do not invent requirements**: only what the transcript supports. Uncertainty → lower `confidence` + `Open questions`.
- **Glossary is read-only**: check terms, never edit the glossary.
- **Dedupe, don't duplicate**: look for a match in `index.json` first.
- **Contract**: every atom validates against `forml-atom.schema.json` (required fields, `status`/`kind` enums, `RA-NNNN` pattern, `YYYY-MM-DD` date).
- **draft by default**: a new atom is `draft`; a human flips it to `confirmed` after stakeholder validation — not this skill.
- **Never silently overwrite**: a changed requirement → a new atom + `relations.superseded_by` on the old one + `status: superseded`.
- The gate (Step 2) is mandatory: no writes before the user replies.
