# Setup & configuration

## 1. Prerequisites
- **Claude Code** (the skills and the Workflow harness are Claude Code features).
- **Python 3** + **PyYAML** — `pip3 install pyyaml` (used by `validate.py` / `build_registry.py`).

## 2. Install the skills
```bash
git clone https://github.com/<your-username>/forml-reqs-registry.git
cd forml-reqs-registry
mkdir -p ~/.claude/skills
cp -R skills/atomize-from-latest ~/.claude/skills/
cp -R skills/render-atoms       ~/.claude/skills/
```
(Prefer a symlink if you want edits in the clone to take effect live:
`ln -s "$PWD/skills/atomize-from-latest" ~/.claude/skills/atomize-from-latest`.)

## 3. Configure paths
Each `SKILL.md` has a **Configuration** block. Replace the placeholders with absolute paths:

| Name | Meaning | Required by |
|---|---|---|
| `REGISTRY_DIR` | absolute path to this clone | both skills |
| `TRANSCRIPTS_DIR` | folder holding your `*_cleaned.md` transcripts | atomize |
| `GLOSSARY` | a domain glossary file (read-only term check) | optional |
| `STAKEHOLDERS` | a stakeholder register (maps speakers → `who`) | optional |
| `CONTEXT_DIR` | vision/scope context docs (for `levels`) | optional |

The optional files just improve term/owner/level mapping — the pipeline works without them.

## 4. First run (no data of your own)
Point `TRANSCRIPTS_DIR` at `REGISTRY_DIR/examples/transcript`, then:
- `/atomize-from-latest` → packs atoms from the bundled synthetic transcript into `registry/`.
- `/render-atoms RA-0001 as user-story` → writes a projection to `renders/`.

Or the batch harness (defaults to the bundled sample):
```js
Workflow({ scriptPath: "<REGISTRY_DIR>/workflow/forml-pipeline.workflow.js",
           args: { registry: "<REGISTRY_DIR>" } })
```

## 5. Helpers
- `python3 workflow/validate.py` — validate every `registry/atoms/*.md` against the contract + check `index.json` integrity.
- `python3 workflow/build_registry.py atoms.json` — deterministically serialize a JSON array of atoms into `registry/atoms/*.md` + rebuild `index.json` / `INDEX.md`.

## Troubleshooting
- **"PyYAML required"** → `pip3 install pyyaml`.
- **Atomize finds the wrong file** → "newest" is by the `YYYY-MM-DD` filename prefix; ensure your transcripts are named `YYYY-MM-DD_*.md`.
- **Workflow can't read files** → it resolves everything from `args.registry`; pass `args: { registry: "/abs/path" }` (or edit the `REGISTRY` constant at the top of the script).
- **Skill doesn't trigger** → invoke it explicitly with `/atomize-from-latest` or `/render-atoms`.
- **Don't commit your data** → `registry/atoms/*.md`, `renders/*.md`, and `/transcripts/` are git-ignored by default (see `.gitignore`).
