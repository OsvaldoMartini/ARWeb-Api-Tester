"""Audit AR Conversational DOCX coverage, accessibility data, and navigation."""

from __future__ import annotations

import json
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from ar_conversational_content import AGENTS, API_ROUTES, CONTROL_INDEX, PROVIDERS, SCREENS


NS = {
    "cp": "http://schemas.openxmlformats.org/package/2006/metadata/core-properties",
    "dc": "http://purl.org/dc/elements/1.1/",
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
}


def text_value(node: ET.Element | None) -> str:
    return "" if node is None or node.text is None else node.text.strip()


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: audit_ar_conversational_integrity.py INPUT.docx REPORT.json")

    docx_path = Path(sys.argv[1]).resolve()
    report_path = Path(sys.argv[2]).resolve()

    with zipfile.ZipFile(docx_path) as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
        core = ET.fromstring(archive.read("docProps/core.xml"))
        media = [name for name in archive.namelist() if name.startswith("word/media/")]

    full_text = "".join(node.text or "" for node in document.findall(".//w:t", NS))
    bookmarks = {
        node.get(f"{{{NS['w']}}}name")
        for node in document.findall(".//w:bookmarkStart", NS)
        if node.get(f"{{{NS['w']}}}name")
    }
    anchors = {
        node.get(f"{{{NS['w']}}}anchor")
        for node in document.findall(".//w:hyperlink", NS)
        if node.get(f"{{{NS['w']}}}anchor")
    }
    properties = document.findall(".//wp:docPr", NS)
    image_alt = [node.get("descr", "").strip() for node in properties]
    image_titles = [node.get("title", "").strip() for node in properties]

    missing_screens = [title for _, title, _, _ in SCREENS if title not in full_text]
    missing_agents = [name for _, name, _, _ in AGENTS if name not in full_text]
    missing_routes = [route for _, route, _ in API_ROUTES if route not in full_text]
    missing_controls = [control for _, control, _, _ in CONTROL_INDEX if control not in full_text]
    missing_providers = [provider for provider, _, _ in PROVIDERS if provider not in full_text]
    missing_captions = [n for n in range(1, len(SCREENS) + 1) if f"Figure {n}." not in full_text]

    creator = text_value(core.find("dc:creator", NS))
    modified_by = text_value(core.find("cp:lastModifiedBy", NS))
    report = {
        "docx": str(docx_path),
        "coverage": {
            "screens_expected": len(SCREENS),
            "screens_missing": missing_screens,
            "agents_expected": len(AGENTS),
            "agents_missing": missing_agents,
            "controls_expected": len(CONTROL_INDEX),
            "controls_missing": missing_controls,
            "routes_expected": len(API_ROUTES),
            "routes_missing": missing_routes,
            "providers_expected": len(PROVIDERS),
            "providers_missing": missing_providers,
            "captions_missing": missing_captions,
        },
        "images": {
            "embedded_media": len(media),
            "inline_properties": len(properties),
            "missing_alt": sum(not value for value in image_alt),
            "missing_title": sum(not value for value in image_titles),
        },
        "navigation": {
            "bookmarks": len(bookmarks),
            "internal_anchor_targets": len(anchors),
            "missing_anchor_targets": sorted(anchor for anchor in anchors if anchor not in bookmarks),
        },
        "metadata": {
            "creator": creator,
            "last_modified_by": modified_by,
            "scrubbed": not creator and not modified_by,
        },
    }

    failures = (
        missing_screens
        or missing_agents
        or missing_controls
        or missing_routes
        or missing_providers
        or missing_captions
        or len(media) != len(SCREENS)
        or len(properties) != len(SCREENS)
        or any(not value for value in image_alt)
        or any(not value for value in image_titles)
        or any(anchor not in bookmarks for anchor in anchors)
        or not report["metadata"]["scrubbed"]
    )
    report["passed"] = not bool(failures)

    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
