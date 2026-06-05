#!/usr/bin/env python3
"""Materialize a JSON array of FORM-L atoms into the registry.

Deterministic serializer used by the validation workflow (and reusable by hand):
reads an atoms JSON file and writes one registry/atoms/RA-XXXX-<slug>.md per atom
(frontmatter = the schema contract; body = Intent + Source quotes + Open questions),
then rebuilds registry/index.json and registry/INDEX.md.

Usage:  python3 workflow/build_registry.py <atoms.json> [--today YYYY-MM-DD] [--by "label"]
Only dependency: PyYAML.
"""
import argparse
import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("PyYAML required: pip3 install pyyaml")

ROOT = Path(__file__).resolve().parent.parent
ATOMS_DIR = ROOT / "registry" / "atoms"
INDEX_JSON = ROOT / "registry" / "index.json"
INDEX_MD = ROOT / "registry" / "INDEX.md"

# Canonical frontmatter key order (matches spec/forml-atom.schema.json).
FM_ORDER = ["id", "intent", "status", "kind", "who", "where", "when", "what",
            "how_well", "else", "limit", "signal", "assumptions", "guards",
            "observers", "bindings", "forml", "scenarios", "verdict_policy",
            "levels", "relations", "source", "jira", "glossary_terms",
            "confidence", "extracted_by", "extracted_at"]
DEFAULTS = {
    "when": None, "how_well": None, "else": None, "limit": None, "signal": None,
    "assumptions": [], "guards": [], "observers": [], "bindings": [], "forml": None,
    "scenarios": {"nominal": [], "negative": []}, "verdict_policy": None,
    "levels": [4], "relations": {"depends_on": [], "refines": [],
    "conflicts_with": [], "superseded_by": None}, "jira": [],
    "glossary_terms": [], "confidence": 0.5,
}
TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "h", "ґ": "g", "д": "d", "е": "e", "є": "ie",
    "ж": "zh", "з": "z", "и": "y", "і": "i", "ї": "i", "й": "i", "к": "k", "л": "l",
    "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch", "ь": "",
    "ю": "iu", "я": "ia", "’": "", "'": "",
}


def slugify(text: str, maxwords: int = 6) -> str:
    out = []
    for ch in text.lower():
        out.append(TRANSLIT.get(ch, ch))
    s = "".join(out)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return "-".join(s.split("-")[:maxwords]) or "atom"


def fm_block(atom: dict) -> dict:
    fm = {}
    for k in FM_ORDER:
        if k in atom and atom[k] is not None:
            fm[k] = atom[k]
        elif k in DEFAULTS:
            fm[k] = DEFAULTS[k]
    return fm


def body_block(atom: dict) -> str:
    lines = ["## Intent", atom.get("intent", "").strip(), "", "## Source quotes"]
    for s in atom.get("source", []) or []:
        tc = f"[{s.get('timecode')}] " if s.get("timecode") else ""
        sp = f"**{s.get('speaker')}:** " if s.get("speaker") else ""
        lines.append(f"- {tc}{sp}«{s.get('quote', '').strip()}»")
    oq = atom.get("open_questions", []) or []
    lines += ["", "## Open questions"]
    lines += [f"- {q}" for q in oq] if oq else ["- (none)"]
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("atoms_json")
    ap.add_argument("--today", default="2026-06-04")
    ap.add_argument("--by", default="forml-pipeline.workflow.js v0.1")
    args = ap.parse_args()

    atoms = json.loads(Path(args.atoms_json).read_text(encoding="utf-8"))
    if isinstance(atoms, dict) and "atoms" in atoms:
        atoms = atoms["atoms"]
    ATOMS_DIR.mkdir(parents=True, exist_ok=True)

    written, index_entries = [], []
    for atom in atoms:
        atom.setdefault("status", "draft")
        atom["extracted_at"] = atom.get("extracted_at") or args.today
        atom["extracted_by"] = atom.get("extracted_by") or args.by
        slug = atom.pop("slug", None) or slugify(atom.get("intent", atom["id"]))
        fm = fm_block(atom)
        yaml_text = yaml.safe_dump(fm, allow_unicode=True, sort_keys=False,
                                   default_flow_style=False, width=100)
        fname = f"{atom['id']}-{slug}.md"
        (ATOMS_DIR / fname).write_text(
            f"---\n{yaml_text}---\n\n{body_block(atom)}", encoding="utf-8")
        written.append(fname)
        src0 = (atom.get("source") or [{}])[0]
        index_entries.append({
            "id": atom["id"], "file": fname, "status": fm["status"],
            "kind": atom.get("kind"), "intent": atom.get("intent"),
            "who": atom.get("who"), "levels": fm["levels"], "jira": fm["jira"],
            "confidence": fm["confidence"],
            "source": f"{src0.get('transcript', '')} [{src0.get('timecode', '')}]",
        })

    index = {"$schema_ref": "../spec/forml-atom.schema.json",
             "generated_at": args.today,
             "generator": "forml-pipeline.workflow.js / build_registry.py",
             "count": len(index_entries), "atoms": index_entries}
    INDEX_JSON.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n",
                          encoding="utf-8")

    n_conf = sum(1 for e in index_entries if e["status"] == "confirmed")
    n_draft = sum(1 for e in index_entries if e["status"] == "draft")
    rows = ["# Requirements Atom Registry — Index", "",
            "> Auto-generated. Do not hand-edit; re-run the pack step to regenerate.", "",
            "| ID | Status | Kind | Lv | Intent | WHO | Source (transcript [tc]) | Jira |",
            "|----|--------|------|----|--------|-----|--------------------------|------|"]
    for e in index_entries:
        lv = ",".join(str(x) for x in e["levels"])
        jira = ",".join(e["jira"]) if e["jira"] else "—"
        rows.append(f"| {e['id']} | {e['status']} | {e['kind']} | {lv} | "
                    f"{e['intent']} | {e['who']} | {e['source']} | {jira} |")
    rows += ["", "<!-- INDEX-STATS",
             f"atoms: {len(index_entries)}", f"confirmed: {n_conf}",
             f"draft: {n_draft}", f"last_run: {args.today}", "-->", ""]
    INDEX_MD.write_text("\n".join(rows), encoding="utf-8")

    print(f"Wrote {len(written)} atom(s) to {ATOMS_DIR}")
    print(f"Rebuilt {INDEX_JSON.name} (count={len(index_entries)}) and {INDEX_MD.name}")


if __name__ == "__main__":
    main()
