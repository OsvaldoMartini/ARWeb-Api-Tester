"""Render every PDF page and print compact structural QA statistics."""

from __future__ import annotations

import sys
from pathlib import Path

import fitz


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: render_and_audit_pdf.py INPUT.pdf OUTPUT_DIR")

    pdf_path = Path(sys.argv[1]).resolve()
    output_dir = Path(sys.argv[2]).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    document = fitz.open(pdf_path)
    total_links = 0
    empty_pages: list[int] = []
    body_near_bottom: list[tuple[int, float, str]] = []
    text_counts: list[int] = []

    for page_number, page in enumerate(document, start=1):
        text = page.get_text("text").strip()
        text_counts.append(len(text))
        if not text:
            empty_pages.append(page_number)

        total_links += len(page.get_links())
        page_height = page.rect.height
        blocks = page.get_text("blocks")
        for block in blocks:
            x0, y0, x1, y1, block_text, *_ = block
            # Ignore the running footer; report body content that enters the
            # nominal one-inch bottom margin so it can be inspected visually.
            cleaned = " ".join(block_text.split())
            is_running_footer = "ARAPI |" in cleaned or "AR Conversational |" in cleaned
            if cleaned and y1 > page_height - 70 and not is_running_footer:
                body_near_bottom.append((page_number, round(y1, 1), cleaned[:90]))

        pixmap = page.get_pixmap(matrix=fitz.Matrix(1.55, 1.55), alpha=False)
        pixmap.save(output_dir / f"page-{page_number:03d}.png")

    print(f"pdf={pdf_path}")
    print(f"pages={len(document)}")
    print(f"metadata={document.metadata}")
    print(f"links={total_links}")
    print(f"empty_pages={empty_pages}")
    print(f"text_chars_min={min(text_counts)} max={max(text_counts)}")
    print(f"body_near_bottom_count={len(body_near_bottom)}")
    for finding in body_near_bottom[:30]:
        print(f"near_bottom page={finding[0]} y={finding[1]} text={finding[2]}")


if __name__ == "__main__":
    main()
