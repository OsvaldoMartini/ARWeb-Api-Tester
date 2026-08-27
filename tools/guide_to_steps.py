#!/usr/bin/env python3
"""Scaffold a tour manifest (steps.json) from a written guide.

Reads a .docx guide (or a Markdown one), finds where each screenshot appears,
and emits one tour step per screenshot in document order, tagged with the
H1/H2 headings in effect at that point.

Embedded docx images are matched to the files in --screenshots by content
hash, because the embedding order does not follow the screenshot numbering.

Re-running merges over an existing steps.json: hand-written "testo",
"titolo" and "hotspot" are never overwritten.

Stdlib only. JSON is written UTF-8 with ensure_ascii=False (cp1252 mangles
accents on Windows otherwise).
"""

import argparse
import hashlib
import json
import re
import struct
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

HEADING_RE = re.compile(r"^(?:Heading|Titolo|heading )\s*([12])$")


def png_size(data: bytes):
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    w, h = struct.unpack(">II", data[16:24])
    return w, h


def md5(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()


def hash_screenshots(shots_dir: Path):
    """hash -> [Path, ...]; duplicates reported, resolved to one name."""
    by_hash = {}
    for p in sorted(shots_dir.glob("*.png")):
        by_hash.setdefault(md5(p.read_bytes()), []).append(p)
    chosen = {}
    for h, paths in by_hash.items():
        if len(paths) > 1:
            names = ", ".join(p.name for p in paths)
            keep = paths[-1]  # deterministic: last alphabetically
            print(f"[warn] identical screenshots: {names} -> using {keep.name}")
        chosen[h] = paths[-1]
    return chosen


def para_style(p):
    el = p.find("w:pPr/w:pStyle", NS)
    return el.get(f"{{{NS['w']}}}val", "") if el is not None else ""


def para_text(p):
    return "".join(t.text or "" for t in p.iter(f"{{{NS['w']}}}t")).strip()


def parse_docx(guide: Path):
    """Yield ("image", media_name) / ("h1"|"h2", text) events in doc order."""
    with zipfile.ZipFile(guide) as z:
        doc = ET.fromstring(z.read("word/document.xml"))
        rels_xml = ET.fromstring(z.read("word/_rels/document.xml.rels"))
        media = {
            n: z.read(n) for n in z.namelist() if n.startswith("word/media/")
        }
    rels = {
        rel.get("Id"): rel.get("Target").lstrip("/")
        for rel in rels_xml.iter(f"{{{NS['rel']}}}Relationship")
    }
    events = []
    for p in doc.iter(f"{{{NS['w']}}}p"):
        m = HEADING_RE.match(para_style(p))
        if m:
            text = para_text(p)
            if text:
                events.append((f"h{m.group(1)}", text))
        for blip in p.iter(f"{{{NS['a']}}}blip"):
            rid = blip.get(f"{{{NS['r']}}}embed")
            target = rels.get(rid, "")
            name = "word/" + target if not target.startswith("word/") else target
            if name in media:
                events.append(("image", media[name]))
    return events


def strip_fences(text: str) -> str:
    """Blank code fences preserving string length so offsets stay aligned."""
    out = list(text)
    in_fence = False
    for m in re.finditer(r"^(```|~~~).*$", text, re.M):
        in_fence = not in_fence
        for i in range(m.start(), m.end()):
            out[i] = " "
    if in_fence:
        print("[warn] unterminated code fence in Markdown source")
    # blank fenced bodies
    text2 = "".join(out)
    for m in re.finditer(r"^(```|~~~).*?^(```|~~~)\s*$", text, re.S | re.M):
        for i in range(m.start(), m.end()):
            if not text[i].isspace():
                out[i] = " "
    return "".join(out)


def parse_markdown(guide: Path):
    """Yield the same event stream from a Markdown guide (images by path)."""
    raw = guide.read_text(encoding="utf-8")
    clean = strip_fences(raw)
    events = []
    for m in re.finditer(
        r"^(#{1,2})\s+(.+)$|!\[[^\]]*\]\(([^)\s]+)[^)]*\)", clean, re.M
    ):
        if m.group(1):
            events.append((f"h{len(m.group(1))}", m.group(2).strip()))
        else:
            events.append(("image-path", m.group(3)))
    return events


def build_steps(events, shot_by_hash, shots_dir: Path, rel_prefix: str):
    steps, sizes, seen = [], {}, set()
    h1 = h2 = ""
    for kind, payload in events:
        if kind == "h1":
            h1, h2 = payload, ""
            continue
        if kind == "h2":
            h2 = payload
            continue
        if kind == "image":
            shot = shot_by_hash.get(md5(payload))
            if shot is None:
                print(f"[warn] embedded image ({len(payload)} bytes) matches "
                      f"no file in {shots_dir} — step skipped")
                continue
        else:  # image-path from Markdown
            shot = shots_dir / Path(payload).name
            if not shot.exists():
                print(f"[warn] {payload}: no such file in {shots_dir} — skipped")
                continue
        if shot.name in seen:
            continue  # same screenshot shown twice in the guide
        seen.add(shot.name)
        size = png_size(shot.read_bytes())
        if size:
            sizes.setdefault(size, []).append(shot.name)
        steps.append({
            "id": shot.stem,
            "ordine": len(steps) + 1,
            "immagine": f"{rel_prefix}/{shot.name}",
            "capitolo": h1,
            "sezione": h2,
            "titolo": h2 or h1 or shot.stem,
            "testo": "",
            "hotspot": None,
        })
    unused = sorted(
        p.name for p in shot_by_hash.values() if p.name not in seen
    )
    if unused:
        print(f"[warn] screenshots never referenced by the guide: "
              f"{', '.join(unused)}")
    if len(sizes) > 1:
        print("[warn] MIXED RESOLUTIONS — hotspots will drift; not rescaling:")
        for size, names in sizes.items():
            print(f"       {size[0]}x{size[1]}: {', '.join(names)}")
    return steps, (next(iter(sizes)) if sizes else None)


def merge(existing: dict, fresh: dict) -> dict:
    """Keep hand-written testo/titolo/hotspot from existing steps."""
    old_by_id = {s.get("id"): s for s in existing.get("steps", [])}
    merged_ids = set()
    for step in fresh["steps"]:
        old = old_by_id.get(step["id"])
        if old is None:
            continue
        merged_ids.add(step["id"])
        preserved = dict(old)  # unknown hand-added fields survive too
        preserved.pop("obsoleto", None)
        preserved.update({
            "ordine": step["ordine"],
            "immagine": step["immagine"],
            "capitolo": step["capitolo"],
            "sezione": step["sezione"],
        })
        if not old.get("testo"):
            preserved["testo"] = step["testo"]
        if not old.get("titolo"):
            preserved["titolo"] = step["titolo"]
        if old.get("hotspot") is None:
            preserved["hotspot"] = step["hotspot"]
        idx = next(i for i, s in enumerate(fresh["steps"])
                   if s["id"] == step["id"])
        fresh["steps"][idx] = preserved
    orphans = [s for sid, s in old_by_id.items() if sid not in merged_ids]
    for s in orphans:
        s["obsoleto"] = True
        print(f"[warn] step '{s.get('id')}' no longer maps to the guide — "
              f"kept with \"obsoleto\": true")
    fresh["steps"].extend(orphans)
    for key in ("titolo", "lingua", "linguaVoce"):
        if existing.get(key):
            fresh[key] = existing[key]
    return fresh


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--guide", required=True, type=Path,
                    help=".docx or .md guide file")
    ap.add_argument("--screenshots", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path,
                    help="steps.json to write (merged if it exists)")
    ap.add_argument("--titolo", default="",
                    help="tour title (kept from existing file if set there)")
    args = ap.parse_args()

    if args.guide.suffix.lower() == ".docx":
        events = parse_docx(args.guide)
    elif args.guide.suffix.lower() in (".md", ".markdown"):
        events = parse_markdown(args.guide)
    else:
        sys.exit(f"unsupported guide format: {args.guide.suffix}")

    shot_by_hash = hash_screenshots(args.screenshots)
    # image path relative to docs/guida/ where index.html lives
    rel_prefix = "../" + args.screenshots.as_posix().split("docs/", 1)[-1]
    steps, size = build_steps(events, shot_by_hash, args.screenshots,
                              rel_prefix)

    manifest = {
        "titolo": args.titolo or args.guide.stem,
        "lingua": "it-CH",
        "linguaVoce": "it-IT",
        "immagini": ({"larghezza": size[0], "altezza": size[1]}
                     if size else None),
        "steps": steps,
    }
    if args.out.exists():
        existing = json.loads(args.out.read_text(encoding="utf-8"))
        manifest = merge(existing, manifest)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"[ok] {args.out}: {len(manifest['steps'])} steps"
          + (f", {size[0]}x{size[1]}" if size else ""))


if __name__ == "__main__":
    main()
