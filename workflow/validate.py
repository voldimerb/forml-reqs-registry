#!/usr/bin/env python3
"""Dependency-light validator for the FORM-L Requirement Atom registry.

Checks every registry/atoms/*.md against the essential contract of
spec/forml-atom.schema.json (required fields, enums, id/date patterns,
mandatory provenance) and verifies index.json integrity.

Only dependency: PyYAML (already present). Does NOT require `jsonschema`.

Usage:  python3 workflow/validate.py
Exit:   0 if all atoms valid and index consistent, else 1.
"""
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

REQUIRED = ["id", "intent", "status", "kind", "who", "where", "what",
            "source", "extracted_by", "extracted_at"]
STATUS = {"draft", "confirmed", "deprecated", "superseded"}
KIND = {"functional", "nonfunctional", "constraint", "assumption", "guard", "business_rule"}
ID_RE = re.compile(r"^RA-\d{4}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TC_RE = re.compile(r"^\d{2}:\d{2}:\d{2}$")

FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def load_frontmatter(path: Path):
    text = path.read_text(encoding="utf-8")
    m = FM_RE.match(text)
    if not m:
        return None, "no YAML frontmatter found"
    try:
        return yaml.safe_load(m.group(1)), None
    except yaml.YAMLError as e:
        return None, f"YAML parse error: {e}"


def validate_atom(fm: dict):
    errs = []
    for f in REQUIRED:
        if f not in fm or fm[f] in (None, "", []):
            errs.append(f"missing required field: {f}")
    if "id" in fm and not ID_RE.match(str(fm.get("id", ""))):
        errs.append(f"id must match RA-NNNN, got {fm.get('id')!r}")
    if "status" in fm and fm["status"] not in STATUS:
        errs.append(f"status not in {sorted(STATUS)}: {fm.get('status')!r}")
    if "kind" in fm and fm["kind"] not in KIND:
        errs.append(f"kind not in {sorted(KIND)}: {fm.get('kind')!r}")
    if "extracted_at" in fm and not DATE_RE.match(str(fm.get("extracted_at", ""))):
        errs.append(f"extracted_at must be YYYY-MM-DD, got {fm.get('extracted_at')!r}")
    src = fm.get("source")
    if not isinstance(src, list) or not src:
        errs.append("source[] must be a non-empty list (provenance is mandatory)")
    else:
        for i, s in enumerate(src):
            if not isinstance(s, dict):
                errs.append(f"source[{i}] must be a mapping")
                continue
            if not s.get("transcript"):
                errs.append(f"source[{i}].transcript missing")
            if not s.get("quote"):
                errs.append(f"source[{i}].quote missing (verbatim quote required)")
            tc = s.get("timecode")
            if tc and not TC_RE.match(str(tc)):
                errs.append(f"source[{i}].timecode must be HH:MM:SS, got {tc!r}")
    conf = fm.get("confidence")
    if conf is not None and not (isinstance(conf, (int, float)) and 0 <= conf <= 1):
        errs.append(f"confidence must be 0..1, got {conf!r}")
    lvls = fm.get("levels", [])
    if lvls and not all(isinstance(x, int) and 0 <= x <= 4 for x in lvls):
        errs.append(f"levels must be ints 0..4, got {lvls!r}")
    return errs


def main():
    if not ATOMS_DIR.exists():
        sys.exit(f"no atoms dir: {ATOMS_DIR}")
    files = sorted(ATOMS_DIR.glob("*.md"))
    print(f"Validating {len(files)} atom file(s) in {ATOMS_DIR}")
    seen_ids = {}
    total_errs = 0
    for path in files:
        fm, ferr = load_frontmatter(path)
        if ferr:
            print(f"  ✗ {path.name}: {ferr}")
            total_errs += 1
            continue
        errs = validate_atom(fm)
        aid = fm.get("id")
        if aid in seen_ids:
            errs.append(f"duplicate id {aid} (also in {seen_ids[aid]})")
        seen_ids[aid] = path.name
        if errs:
            total_errs += len(errs)
            print(f"  ✗ {path.name} ({aid}):")
            for e in errs:
                print(f"      - {e}")
        else:
            print(f"  ✓ {path.name} ({aid})")

    # index integrity
    print("\nIndex integrity:")
    if INDEX_JSON.exists():
        idx = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        idx_ids = {a.get("id") for a in idx.get("atoms", [])}
        file_ids = set(seen_ids)
        if idx.get("count") != len(idx.get("atoms", [])):
            print(f"  ✗ index count {idx.get('count')} != atoms listed {len(idx.get('atoms', []))}")
            total_errs += 1
        if idx_ids != file_ids:
            missing = file_ids - idx_ids
            extra = idx_ids - file_ids
            if missing:
                print(f"  ✗ atoms on disk not in index: {sorted(missing)}")
            if extra:
                print(f"  ✗ index entries with no file: {sorted(extra)}")
            total_errs += 1
        if idx_ids == file_ids and idx.get("count") == len(file_ids):
            print(f"  ✓ index lists all {len(file_ids)} atoms, count matches")
    else:
        print(f"  ! no index.json at {INDEX_JSON}")

    print()
    if total_errs:
        print(f"FAILED: {total_errs} problem(s) across {len(files)} atom(s).")
        sys.exit(1)
    print(f"OK: {len(files)} atom(s) valid, index consistent.")


if __name__ == "__main__":
    main()
